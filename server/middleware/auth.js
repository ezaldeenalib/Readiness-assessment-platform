import jwt from 'jsonwebtoken';
import { query } from '../database/db.js';
import { getDefaultPermissionsForRole } from '../rbac/defaultRoles.js';

/**
 * تحميل صلاحيات المستخدم من DB (دائماً — لا يُعتمد على JWT)
 * 1. أولاً من جدول user_roles → role_permissions (RBAC الجديد)
 * 2. Fallback: من DEFAULT_ROLE_PERMISSIONS حسب user.role
 */
export async function loadUserPermissions(userId, legacyRole) {
  try {
    const result = await query(`
      SELECT DISTINCT p.name as permission, rp.scope
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p       ON rp.permission_id = p.id
      WHERE ur.user_id = $1
    `, [userId]);

    if (result.rows.length > 0) {
      const permissions = result.rows.map(r => r.permission);
      const scope = result.rows[0].scope || 'own';
      return { permissions, scope, source: 'db' };
    }
  } catch {
    // RBAC tables not yet migrated — use fallback
  }

  const defaults = getDefaultPermissionsForRole(legacyRole);
  return { ...defaults, source: 'fallback' };
}

/**
 * تحميل المؤسسات المُسندة للمستخدم
 */
export async function loadUserInstitutions(userId, entityId) {
  try {
    const result = await query(
      'SELECT institution_id FROM user_institutions WHERE user_id = $1',
      [userId]
    );
    const ids = result.rows.map(r => r.institution_id);
    if (entityId != null && !ids.includes(entityId)) ids.push(entityId);
    return ids;
  } catch {
    return entityId != null ? [entityId] : [];
  }
}

/**
 * V-08: authenticateToken
 * - Accepts token from httpOnly cookie OR Authorization Bearer header
 * - ALWAYS re-queries permissions from DB (never trusts JWT payload for permissions/role)
 */
export const authenticateToken = async (req, res, next) => {
  try {
    // V-09: prefer httpOnly cookie; fall back to Authorization header
    const token =
      req.cookies?.access_token ||
      (req.headers['authorization']?.split(' ')[1]);

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from DB — role from DB, not from JWT
    const result = await query(
      'SELECT id, email, full_name, role, entity_id, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'User account is inactive' });
    }

    // V-08: always re-query permissions from DB — never trust JWT embedded permissions
    const { permissions, scope } = await loadUserPermissions(user.id, user.role);
    user.permissions  = permissions;
    user.scope        = scope;
    user.institutions = await loadUserInstitutions(user.id, user.entity_id);

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }
    next();
  };
};

export const checkEntityAccess = async (req, res, next) => {
  try {
    const { user } = req;
    const entityId = parseInt(req.params.entityId || req.body.entity_id);

    if (user.role === 'super_admin') return next();

    if (user.role === 'ministry_admin') {
      const result = await query(
        `WITH RECURSIVE entity_tree AS (
          SELECT id, parent_entity_id FROM entities WHERE id = $1
          UNION ALL
          SELECT e.id, e.parent_entity_id
          FROM entities e
          JOIN entity_tree et ON e.parent_entity_id = et.id
        )
        SELECT * FROM entity_tree WHERE id = $2`,
        [user.entity_id, entityId]
      );
      if (result.rows.length > 0) return next();
    }

    if (user.role === 'entity_user') {
      const allowed = user.institutions?.length > 0
        ? user.institutions
        : (user.entity_id != null ? [user.entity_id] : []);
      if (allowed.includes(entityId)) return next();
    }

    return res.status(403).json({ error: 'Access denied to this entity' });
  } catch (error) {
    console.error('Entity access check error:', error.message);
    return res.status(500).json({ error: 'Access check failed' });
  }
};
