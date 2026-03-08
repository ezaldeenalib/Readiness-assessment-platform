/**
 * إدارة المستخدمين والصلاحيات (RBAC)
 * - قائمة المستخدمين
 * - إنشاء مستخدم جديد (مدير فقط)
 * - تعيين الأدوار (user_roles)
 * - تعيين المؤسسات (user_institutions)
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../database/db.js';
import pool from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkPermission } from '../middleware/checkPermission.js';
import { logAudit } from '../utils/auditLog.js';

const router = express.Router();

// ─── إنشاء مستخدم جديد (للمدير فقط) ─────────────────────────────
router.post('/', authenticateToken, checkPermission('manage_users'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password, full_name, role = 'entity_user', entity_id, role_ids } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'البريد وكلمة المرور والاسم الكامل مطلوبة' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'يوجد مستخدم بهذا البريد الإلكتروني مسبقاً' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(String(password), salt);

    await client.query('BEGIN');

    const insertResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, entity_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, entity_id, is_active, created_at`,
      [email.trim(), password_hash, (full_name || '').trim(), role, entity_id || null]
    );
    const user = insertResult.rows[0];

    const performedBy = req.user?.email || req.user?.full_name || String(req.user?.id ?? 'system');
    await logAudit(pool, 'users', user.id, 'INSERT', null,
      { email: user.email, full_name: user.full_name, role: user.role, entity_id: user.entity_id }, performedBy);

    const roleIds = Array.isArray(role_ids) ? role_ids.map(id => parseInt(id, 10)).filter(n => !isNaN(n)) : [];
    for (const roleId of roleIds) {
      await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING',
        [user.id, roleId]
      );
    }

    await client.query('COMMIT');

    const entityRow = user.entity_id
      ? await query('SELECT name, name_ar FROM entities WHERE id = $1', [user.entity_id])
      : { rows: [] };
    const entity = entityRow.rows[0] || null;

    return res.status(201).json({
      message: 'تم إنشاء المستخدم بنجاح',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        entity_id: user.entity_id,
        entity_name: entity?.name,
        entity_name_ar: entity?.name_ar,
        is_active: user.is_active,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Create user error:', err);
    return res.status(500).json({ error: 'فشل إنشاء المستخدم' });
  } finally {
    client.release();
  }
});

// ─── قائمة المستخدمين (للمدير فقط) ─────────────────────────────
router.get('/', authenticateToken, checkPermission('manage_users'), async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.email, u.full_name, u.role, u.entity_id, u.is_active, u.created_at,
             e.name as entity_name, e.name_ar as entity_name_ar
      FROM users u
      LEFT JOIN entities e ON u.entity_id = e.id
      ORDER BY u.created_at DESC
    `);
    return res.json({ users: result.rows });
  } catch (err) {
    console.error('List users error:', err);
    return res.status(500).json({ error: 'فشل جلب المستخدمين' });
  }
});

// ─── قائمة الأدوار (من جدول roles) ─────────────────────────────
router.get('/roles', authenticateToken, checkPermission('manage_users'), async (req, res) => {
  try {
    const result = await query(`
      SELECT id, name, label_ar, description FROM roles WHERE is_active = TRUE ORDER BY name
    `);
    return res.json({ roles: result.rows });
  } catch (err) {
    console.error('List roles error:', err);
    return res.status(500).json({ error: 'فشل جلب الأدوار' });
  }
});

// ─── أدوار مستخدم معيّن ────────────────────────────────────────
router.get('/:id/roles', authenticateToken, checkPermission('manage_users'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const result = await query(
      `SELECT r.id, r.name, r.label_ar FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1`,
      [userId]
    );
    return res.json({ roles: result.rows });
  } catch (err) {
    console.error('Get user roles error:', err);
    return res.status(500).json({ error: 'فشل جلب أدوار المستخدم' });
  }
});

// ─── تحديث أدوار مستخدم ────────────────────────────────────────
router.put('/:id/roles', authenticateToken, checkPermission('manage_users'), async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = parseInt(req.params.id, 10);
    const { role_ids } = req.body || {};
    const ids = Array.isArray(role_ids) ? role_ids.map(id => parseInt(id, 10)).filter(n => !isNaN(n)) : [];

    await client.query('BEGIN');
    await client.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
    for (const roleId of ids) {
      await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING',
        [userId, roleId]
      );
    }
    await client.query('COMMIT');
    const updated = await query(
      `SELECT r.id, r.name, r.label_ar FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1`,
      [userId]
    );
    return res.json({ roles: updated.rows, message: 'تم تحديث الأدوار' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Update user roles error:', err);
    return res.status(500).json({ error: 'فشل تحديث الأدوار' });
  } finally {
    client.release();
  }
});

// ─── مؤسسات مستخدم معيّن ───────────────────────────────────────
router.get('/:id/institutions', authenticateToken, checkPermission('manage_users'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const result = await query(
      `SELECT e.id, e.name, e.name_ar FROM user_institutions ui
       JOIN entities e ON ui.institution_id = e.id WHERE ui.user_id = $1`,
      [userId]
    );
    return res.json({ institutions: result.rows });
  } catch (err) {
    console.error('Get user institutions error:', err);
    return res.status(500).json({ error: 'فشل جلب مؤسسات المستخدم' });
  }
});

// ─── تحديث مؤسسات مستخدم ───────────────────────────────────────
router.put('/:id/institutions', authenticateToken, checkPermission('manage_users'), async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = parseInt(req.params.id, 10);
    const { institution_ids } = req.body || {};
    const ids = Array.isArray(institution_ids) ? institution_ids.map(id => parseInt(id, 10)).filter(n => !isNaN(n)) : [];

    await client.query('BEGIN');
    await client.query('DELETE FROM user_institutions WHERE user_id = $1', [userId]);
    for (const instId of ids) {
      await client.query(
        'INSERT INTO user_institutions (user_id, institution_id) VALUES ($1, $2) ON CONFLICT (user_id, institution_id) DO NOTHING',
        [userId, instId]
      );
    }
    await client.query('COMMIT');
    const updated = await query(
      `SELECT e.id, e.name, e.name_ar FROM user_institutions ui JOIN entities e ON ui.institution_id = e.id WHERE ui.user_id = $1`,
      [userId]
    );
    return res.json({ institutions: updated.rows, message: 'تم تحديث المؤسسات' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Update user institutions error:', err);
    return res.status(500).json({ error: 'فشل تحديث المؤسسات' });
  } finally {
    client.release();
  }
});

export default router;
