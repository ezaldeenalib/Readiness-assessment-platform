import jwt from 'jsonwebtoken';
import { query } from '../database/db.js';
import { getDefaultPermissionsForRole } from '../rbac/defaultRoles.js';
import { parseId } from '../utils/sanitize.js';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Load user permissions from DB.
 * H-03: In production, a DB error is a hard failure — do NOT silently fall back,
 *       as that could grant unexpected default permissions.
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
      return {
        permissions: result.rows.map(r => r.permission),
        scope: result.rows[0].scope || 'own',
        source: 'db',
      };
    }
    // Empty rows = user has no explicit RBAC rows → use role defaults (legitimate path)
    const defaults = getDefaultPermissionsForRole(legacyRole);
    return { ...defaults, source: 'fallback' };

  } catch (err) {
    // H-03: Log the error prominently
    console.error('[SECURITY] RBAC query failed for user', userId, ':', err.message);

    // H-03: In production, DENY rather than silently fall back
    if (isProd) {
      throw new Error('Permission system unavailable — access denied');
    }
    // Dev-only fallback so migrations can still run without RBAC tables
    console.warn('[SECURITY] Dev mode: falling back to default role permissions');
    const defaults = getDefaultPermissionsForRole(legacyRole);
    return { ...defaults, source: 'fallback-error' };
  }
}

/**
 * Load institution IDs assigned to a user.
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
 * authenticateToken — verify JWT, load fresh user + permissions from DB.
 * Accepts token from httpOnly cookie (preferred) or Authorization Bearer header.
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const token =
      req.cookies?.access_token ||
      req.headers['authorization']?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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

    // H-03: loadUserPermissions now throws in prod on DB error
    const { permissions, scope } = await loadUserPermissions(user.id, user.role);
    user.permissions  = permissions;
    user.scope        = scope;
    user.institutions = await loadUserInstitutions(user.id, user.entity_id);

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    // H-03: permission system failure → 503 in prod, 403 in dev
    if (error.message?.includes('Permission system unavailable')) {
      return res.status(503).json({ error: 'Service temporarily unavailable' });
    }
    return res.status(403).json({ error: 'Authentication failed' });
  }
};

/**
 * authorizeRoles — check legacy role string.
 * F-07: never expose which roles are required or what the current role is.
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

/**
 * checkEntityAccess — verify that the authenticated user can operate on entityId.
 * L-05: guard against NaN if entityId is missing or non-numeric.
 */
export const checkEntityAccess = async (req, res, next) => {
  try {
    const { user } = req;

    // L-05: use parseId to catch NaN early
    const rawId = req.params.entityId ?? req.body.entity_id;
    const entityId = parseId(rawId);
    if (entityId === null) {
      return res.status(400).json({ error: 'Invalid entity ID' });
    }

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
        SELECT id FROM entity_tree WHERE id = $2`,
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
