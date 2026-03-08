import jwt from 'jsonwebtoken';
import { query } from '../database/db.js';
import { getDefaultPermissionsForRole } from '../rbac/defaultRoles.js';

/**
 * تحميل صلاحيات المستخدم:
 * 1. أولاً من جدول user_roles → role_permissions (RBAC الجديد)
 * 2. Fallback: من DEFAULT_ROLE_PERMISSIONS حسب user.role القديم
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
    // جدول RBAC غير مُطبَّق بعد — استخدم الـ fallback
  }

  // Fallback
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

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('❌ No token provided for:', req.method, req.path);
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from database
    const result = await query(
      'SELECT id, email, full_name, role, entity_id, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found:', decoded.userId);
      return res.status(403).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      console.log('❌ User inactive:', decoded.userId);
      return res.status(403).json({ error: 'User account is inactive' });
    }

    // تحميل الصلاحيات (RBAC) — إذا كانت محملة مسبقاً في JWT نستخدمها لتوفير query
    if (decoded.permissions && Array.isArray(decoded.permissions) && decoded.permissions.length > 0) {
      user.permissions  = decoded.permissions;
      user.scope        = decoded.scope || 'own';
      user.institutions = decoded.institutions || (user.entity_id ? [user.entity_id] : []);
    } else {
      const { permissions, scope } = await loadUserPermissions(user.id, user.role);
      user.permissions  = permissions;
      user.scope        = scope;
      user.institutions = await loadUserInstitutions(user.id, user.entity_id);
    }

    req.user = user;
    console.log('✅ Authenticated user:', user.email, 'role:', user.role, 'permissions:', user.permissions.length);
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    return res.status(403).json({ error: 'Invalid or expired token', details: error.message });
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

    // Super admins can access everything
    if (user.role === 'super_admin') {
      return next();
    }

    // Ministry admins can access their ministry and child entities
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

      if (result.rows.length > 0) {
        return next();
      }
    }

    // Entity users can only access their entity or institutions list
    if (user.role === 'entity_user') {
      const allowed = user.institutions?.length > 0 ? user.institutions : (user.entity_id != null ? [user.entity_id] : []);
      if (allowed.includes(entityId)) return next();
    }

    return res.status(403).json({ error: 'Access denied to this entity' });
  } catch (error) {
    console.error('Entity access check error:', error);
    return res.status(500).json({ error: 'Access check failed' });
  }
};
