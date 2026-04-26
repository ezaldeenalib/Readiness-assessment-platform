/**
 * User Management (admin-only)
 * Security fixes applied:
 *   H-04 — self-edit & super_admin protection
 *   M-03 — shared sanitizer (no more regex blocklist)
 *   M-04 — email format validation
 *   M-05 — parseInt on all URL IDs
 *   M-07 — bcrypt cost factor unified to 12
 *   L-03 — pagination on list endpoint
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../database/db.js';
import pool from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkPermission } from '../middleware/checkPermission.js';
import { logAudit } from '../utils/auditLog.js';
import { validatePassword } from '../utils/validatePassword.js';
import { sanitizeName, normalizeEmail, parseId } from '../utils/sanitize.js';

const router = express.Router();
const BCRYPT_ROUNDS = 12; // M-07: unified cost factor

// ── Helper: guard against modifying super_admin or self ───────────────────────
async function guardTargetUser(targetId, requestingUser, res) {
  if (targetId === requestingUser.id) {
    res.status(403).json({ error: 'Cannot modify your own account via admin API' });
    return false;
  }
  const row = await query('SELECT role FROM users WHERE id = $1', [targetId]);
  if (row.rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return false;
  }
  // H-04: only super_admin can touch another super_admin
  if (row.rows[0].role === 'super_admin' && requestingUser.role !== 'super_admin') {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
}

// ── Create user (admin) ───────────────────────────────────────────────────────
router.post('/', authenticateToken, checkPermission('manage_users'), async (req, res) => {
  const client = await pool.connect();
  try {
    const email     = normalizeEmail(req.body.email);       // M-04
    const full_name = sanitizeName(req.body.full_name);     // M-03
    const { role = 'entity_user', entity_id, role_ids } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
    if (!full_name) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    if (!req.body.password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const pwErr = validatePassword(req.body.password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const password_hash = await bcrypt.hash(String(req.body.password), BCRYPT_ROUNDS); // M-07

    await client.query('BEGIN');

    const insertResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, entity_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, entity_id, is_active, created_at`,
      [email, password_hash, full_name, role, entity_id || null]
    );
    const user = insertResult.rows[0];

    await logAudit(pool, 'users', user.id, 'INSERT', null,
      { email: user.email, role: user.role }, req.user?.email || String(req.user?.id));

    const roleIds = Array.isArray(role_ids)
      ? role_ids.map(id => parseId(id)).filter(Boolean)  // M-05: parseId
      : [];
    for (const roleId of roleIds) {
      await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [user.id, roleId]
      );
    }

    await client.query('COMMIT');

    const entityRow = user.entity_id
      ? await query('SELECT name, name_ar FROM entities WHERE id = $1', [user.entity_id])
      : { rows: [] };

    return res.status(201).json({
      message: 'User created successfully',
      user: {
        id:            user.id,
        email:         user.email,
        full_name:     user.full_name,
        role:          user.role,
        entity_id:     user.entity_id,
        entity_name:   entityRow.rows[0]?.name,
        entity_name_ar:entityRow.rows[0]?.name_ar,
        is_active:     user.is_active,
        created_at:    user.created_at,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Create user error:', err.message);
    return res.status(500).json({ error: 'Failed to create user' });
  } finally {
    client.release();
  }
});

// ── List users — L-03: paginated ──────────────────────────────────────────────
router.get('/', authenticateToken, checkPermission('manage_users'), async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page, 10)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit, 10) || 50);
    const offset = (page - 1) * limit;

    const [rows, countRow] = await Promise.all([
      query(`
        SELECT u.id, u.email, u.full_name, u.role, u.entity_id, u.is_active, u.created_at,
               e.name as entity_name, e.name_ar as entity_name_ar
        FROM users u
        LEFT JOIN entities e ON u.entity_id = e.id
        ORDER BY u.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      query('SELECT COUNT(*) AS total FROM users'),
    ]);

    return res.json({
      users: rows.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countRow.rows[0].total, 10),
      },
    });
  } catch (err) {
    console.error('List users error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ── List roles ────────────────────────────────────────────────────────────────
router.get('/roles', authenticateToken, checkPermission('manage_users'), async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, label_ar, description FROM roles WHERE is_active = TRUE ORDER BY name'
    );
    return res.json({ roles: result.rows });
  } catch (err) {
    console.error('List roles error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// ── Get user roles ────────────────────────────────────────────────────────────
router.get('/:id/roles', authenticateToken, checkPermission('manage_users'), async (req, res) => {
  const userId = parseId(req.params.id); // M-05
  if (!userId) return res.status(400).json({ error: 'Invalid user ID' });
  try {
    const result = await query(
      `SELECT r.id, r.name, r.label_ar
       FROM user_roles ur JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [userId]
    );
    return res.json({ roles: result.rows });
  } catch (err) {
    console.error('Get user roles error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch user roles' });
  }
});

// ── Update user roles — H-04: protect super_admin & self ─────────────────────
router.put('/:id/roles', authenticateToken, checkPermission('manage_users'), async (req, res) => {
  const userId = parseId(req.params.id); // M-05
  if (!userId) return res.status(400).json({ error: 'Invalid user ID' });

  const allowed = await guardTargetUser(userId, req.user, res);
  if (!allowed) return;

  const client = await pool.connect();
  try {
    const ids = Array.isArray(req.body.role_ids)
      ? req.body.role_ids.map(id => parseId(id)).filter(Boolean)
      : [];

    await client.query('BEGIN');
    await client.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
    for (const roleId of ids) {
      await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, roleId]
      );
    }
    await client.query('COMMIT');

    await logAudit(pool, 'user_roles', userId, 'UPDATE',
      null, { role_ids: ids }, req.user?.email || String(req.user?.id));

    const updated = await query(
      `SELECT r.id, r.name, r.label_ar
       FROM user_roles ur JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [userId]
    );
    return res.json({ roles: updated.rows, message: 'Roles updated' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Update user roles error:', err.message);
    return res.status(500).json({ error: 'Failed to update roles' });
  } finally {
    client.release();
  }
});

// ── Get user institutions ─────────────────────────────────────────────────────
router.get('/:id/institutions', authenticateToken, checkPermission('manage_users'), async (req, res) => {
  const userId = parseId(req.params.id); // M-05
  if (!userId) return res.status(400).json({ error: 'Invalid user ID' });
  try {
    const result = await query(
      `SELECT e.id, e.name, e.name_ar
       FROM user_institutions ui JOIN entities e ON ui.institution_id = e.id
       WHERE ui.user_id = $1`,
      [userId]
    );
    return res.json({ institutions: result.rows });
  } catch (err) {
    console.error('Get user institutions error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch institutions' });
  }
});

// ── Update user institutions ──────────────────────────────────────────────────
router.put('/:id/institutions', authenticateToken, checkPermission('manage_users'), async (req, res) => {
  const userId = parseId(req.params.id); // M-05
  if (!userId) return res.status(400).json({ error: 'Invalid user ID' });

  const client = await pool.connect();
  try {
    const ids = Array.isArray(req.body.institution_ids)
      ? req.body.institution_ids.map(id => parseId(id)).filter(Boolean)
      : [];

    await client.query('BEGIN');
    await client.query('DELETE FROM user_institutions WHERE user_id = $1', [userId]);
    for (const instId of ids) {
      await client.query(
        'INSERT INTO user_institutions (user_id, institution_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, instId]
      );
    }
    await client.query('COMMIT');

    const updated = await query(
      `SELECT e.id, e.name, e.name_ar
       FROM user_institutions ui JOIN entities e ON ui.institution_id = e.id
       WHERE ui.user_id = $1`,
      [userId]
    );
    return res.json({ institutions: updated.rows, message: 'Institutions updated' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Update user institutions error:', err.message);
    return res.status(500).json({ error: 'Failed to update institutions' });
  } finally {
    client.release();
  }
});

// ── Update user status — H-04: protect super_admin & self ────────────────────
router.patch('/:id/status', authenticateToken, checkPermission('manage_users'), async (req, res) => {
  const userId = parseId(req.params.id); // M-05
  if (!userId) return res.status(400).json({ error: 'Invalid user ID' });

  const allowed = await guardTargetUser(userId, req.user, res);
  if (!allowed) return;

  try {
    const { is_active } = req.body || {};
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    const result = await query(
      `UPDATE users SET is_active = $1 WHERE id = $2
       RETURNING id, email, full_name, role, entity_id, is_active`,
      [is_active, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    await logAudit(pool, 'users', user.id, 'STATUS_CHANGE',
      { is_active: !is_active }, { is_active },
      req.user?.email || String(req.user?.id));

    return res.json({ message: 'User status updated', user });
  } catch (err) {
    console.error('Update user status error:', err.message);
    return res.status(500).json({ error: 'Failed to update user status' });
  }
});

// ── Admin password reset — H-04: protect super_admin & self ──────────────────
router.put('/:id/password', authenticateToken, checkPermission('manage_users'), async (req, res) => {
  const userId = parseId(req.params.id); // M-05
  if (!userId) return res.status(400).json({ error: 'Invalid user ID' });

  const allowed = await guardTargetUser(userId, req.user, res);
  if (!allowed) return;

  try {
    const { new_password } = req.body || {};
    if (!new_password) {
      return res.status(400).json({ error: 'New password is required' });
    }

    const pwErr = validatePassword(new_password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const password_hash = await bcrypt.hash(String(new_password), BCRYPT_ROUNDS); // M-07

    const result = await query(
      'UPDATE users SET password_hash = $1, failed_attempts = 0, locked_until = NULL WHERE id = $2 RETURNING id, email',
      [password_hash, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logAudit(pool, 'users', userId, 'PASSWORD_RESET',
      null, { reset_by: req.user?.email },
      req.user?.email || String(req.user?.id));

    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Admin change user password error:', err.message);
    return res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
