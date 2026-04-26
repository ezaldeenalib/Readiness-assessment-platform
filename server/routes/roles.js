import express from 'express';
import pool, { query } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkPermission } from '../middleware/checkPermission.js';

const router = express.Router();

// ─── Get permissions for a specific role ─────────────────────────────
router.get('/:id/permissions', authenticateToken, checkPermission('manage_users'), async (req, res) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    if (Number.isNaN(roleId)) {
      return res.status(400).json({ error: 'معرّف الدور غير صالح' });
    }

    const result = await query(
      `SELECT p.name
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = $1
       ORDER BY p.name`,
      [roleId]
    );

    const permissions = result.rows.map(r => r.name);
    return res.json({ permissions });
  } catch (err) {
    console.error('Get role permissions error:', err);
    return res.status(500).json({ error: 'فشل جلب صلاحيات الدور' });
  }
});

// ─── Update permissions for a specific role ──────────────────────────
router.put('/:id/permissions', authenticateToken, checkPermission('manage_users'), async (req, res) => {
  const client = await pool.connect();
  try {
    const roleId = parseInt(req.params.id, 10);
    const { permissions } = req.body || {};

    if (Number.isNaN(roleId)) {
      return res.status(400).json({ error: 'معرّف الدور غير صالح' });
    }

    const permNames = Array.isArray(permissions)
      ? permissions.map(p => String(p).trim()).filter(Boolean)
      : [];

    await client.query('BEGIN');

    if (permNames.length === 0) {
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
      await client.query('COMMIT');
      return res.json({ permissions: [], message: 'تم تحديث صلاحيات الدور (بدون صلاحيات)' });
    }

    const permsResult = await client.query(
      'SELECT id, name FROM permissions WHERE name = ANY($1::text[])',
      [permNames]
    );
    const found = permsResult.rows;

    if (found.length === 0) {
      await client.query('ROLLBACK').catch(() => {});
      return res.status(400).json({ error: 'لم يتم العثور على أي صلاحية مطابقة للأسماء المرسلة' });
    }

    const validIds = found.map(r => r.id);

    await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

    for (const permId of validIds) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [roleId, permId]
      );
    }

    await client.query('COMMIT');

    const updatedNames = found.map(r => r.name);
    return res.json({ permissions: updatedNames, message: 'تم تحديث صلاحيات الدور بنجاح' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Update role permissions error:', err);
    return res.status(500).json({ error: 'فشل تحديث صلاحيات الدور' });
  } finally {
    client.release();
  }
});

export default router;

