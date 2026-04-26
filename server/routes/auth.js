import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../database/db.js';
import pool from '../database/db.js';
import { authenticateToken, loadUserPermissions, loadUserInstitutions } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLog.js';
import { validatePassword } from '../utils/validatePassword.js';
import { sanitizeName, normalizeEmail } from '../utils/sanitize.js';

const router = express.Router();

// ── Constants ─────────────────────────────────────────────────────────────────
const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_MS  = 15 * 60 * 1000;       // 15 minutes
const REFRESH_TOKEN_MS = 24 * 60 * 60 * 1000;  // 24 hours
const MAX_FAILED_ATTEMPTS = 5;
/** مدة التعطيل بعد تجاوز المحاولات — افتراضي 5 دقائق، حد أقصى 5 (لا يزيد عبر env) */
const LOCKOUT_MINUTES = Math.min(
  5,
  Math.max(1, parseInt(process.env.LOCKOUT_MINUTES || '5', 10) || 5)
);

// M-01: pre-computed dummy hash used to normalize timing on non-existent email
// Generated once at startup — never changes, never stored
const DUMMY_HASH = await bcrypt.hash('__timing_normalization_dummy__', BCRYPT_ROUNDS);

// Shared cookie options helper
function cookieOpts(isProd, extraMs) {
  return { httpOnly: true, secure: isProd, sameSite: 'Strict', maxAge: extraMs };
}

// ── F-01: Registration — gated by env var ─────────────────────────────────────
router.post('/register', async (req, res) => {
  if (process.env.ALLOW_PUBLIC_REGISTRATION !== 'true') {
    return res.status(403).json({ error: 'Registration is not available. Contact an administrator.' });
  }

  try {
    const email     = normalizeEmail(req.body.email);     // M-04: validate email format
    const full_name = sanitizeName(req.body.full_name);   // M-03: shared sanitizer
    const { entity_id } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
    if (!full_name) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    if (!req.body.password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // L-01: optional domain allowlist (e.g. ALLOWED_EMAIL_DOMAINS=gov.iq,ministry.gov.iq)
    const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || '')
      .split(',').map(d => d.trim()).filter(Boolean);
    if (allowedDomains.length > 0) {
      const domain = email.split('@')[1];
      if (!allowedDomains.includes(domain)) {
        return res.status(403).json({ error: 'Email domain is not permitted for registration' });
      }
    }

    const pwErr = validatePassword(req.body.password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const role = 'entity_user'; // V-01: always server-assigned

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const password_hash = await bcrypt.hash(req.body.password, BCRYPT_ROUNDS);

    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role, entity_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, entity_id`,
      [email, password_hash, full_name, role, entity_id || null]
    );

    const user = result.rows[0];
    await logAudit(pool, 'users', user.id, 'INSERT', null,
      { email: user.email, role: user.role }, email);

    res.status(201).json({
      message: 'User registered successfully. Please log in.',
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role }
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  try {
    const email    = normalizeEmail(req.body.email);   // M-04
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let result;
    try {
      result = await query(
        `SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.entity_id, u.is_active,
                u.failed_attempts, u.locked_until,
                e.name as entity_name, e.name_ar as entity_name_ar
         FROM users u
         LEFT JOIN entities e ON u.entity_id = e.id
         WHERE u.email = $1`,
        [email]
      );
    } catch (dbErr) {
      // أعمدة القفل غير موجودة — شغّل: npm run db:security-hardening
      if (dbErr.code === '42703' || String(dbErr.message).includes('failed_attempts')) {
        console.error('[auth] Missing lockout columns — run: npm run db:security-hardening');
        result = await query(
          `SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.entity_id, u.is_active,
                  e.name as entity_name, e.name_ar as entity_name_ar
           FROM users u
           LEFT JOIN entities e ON u.entity_id = e.id
           WHERE u.email = $1`,
          [email]
        );
        if (result.rows[0]) {
          result.rows[0].failed_attempts = 0;
          result.rows[0].locked_until = null;
        }
      } else {
        throw dbErr;
      }
    }

    // M-01: always run bcrypt compare to normalize timing (prevents user-enumeration via timing)
    let userRow = result.rows[0] || null;
    const hashToCompare = userRow?.password_hash || DUMMY_HASH;
    const isValidPassword = await bcrypt.compare(password, hashToCompare);

    if (!userRow) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // إذا انتهت فترة القفل في قاعدة البيانات — أعد ضبط العداد (لا يعتمد على إعادة تشغيل السيرفر)
    const lockEnd = userRow.locked_until ? new Date(userRow.locked_until) : null;
    if (lockEnd && lockEnd <= new Date()) {
      await query(
        'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1',
        [userRow.id]
      ).catch(e => console.error('Failed to clear expired lockout:', e.message));
      userRow = { ...userRow, failed_attempts: 0, locked_until: null };
    }

    // M-02: Account lockout — نشط فقط إذا locked_until لا يزال في المستقبل
    if (userRow.locked_until && new Date(userRow.locked_until) > new Date()) {
      const remainingMs = new Date(userRow.locked_until) - new Date();
      const remainingMin = Math.max(1, Math.ceil(remainingMs / 60000));
      return res.status(429).json({
        error: `Account is temporarily locked. Try again in ${remainingMin} minute(s).`
      });
    }

    if (!userRow.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    if (!isValidPassword) {
      // M-06: log failed attempt; M-02: increment lockout counter
      const newAttempts = (userRow.failed_attempts || 0) + 1;
      const lockUntil = newAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;

      await query(
        `UPDATE users SET failed_attempts = $1, locked_until = $2 WHERE id = $3`,
        [newAttempts, lockUntil, userRow.id]
      ).catch(e => console.error('Failed to update attempt counter:', e.message));

      await logAudit(pool, 'users', userRow.id, 'LOGIN_FAILED', null,
        { email, ip: req.ip, attempts: newAttempts, locked: !!lockUntil }, 'system');

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset lockout on successful login
    await query(
      'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1',
      [userRow.id]
    ).catch(e => console.error('Failed to reset attempt counter:', e.message));

    const { permissions, scope } = await loadUserPermissions(userRow.id, userRow.role);
    const institutions = await loadUserInstitutions(userRow.id, userRow.entity_id);

    const token = jwt.sign(
      { userId: userRow.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    // H-02: refresh token — rotated on every login
    const refreshToken = jwt.sign(
      { userId: userRow.id },
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '24h' }
    );

    res.cookie('access_token',  token,        cookieOpts(isProd, ACCESS_TOKEN_MS));
    res.cookie('refresh_token', refreshToken, {
      ...cookieOpts(isProd, REFRESH_TOKEN_MS),
      path: '/api/auth/refresh',
    });

    await logAudit(pool, 'users', userRow.id, 'LOGIN', null,
      { email, ip: req.ip }, email);

    res.json({
      message: 'Login successful',
      user: {
        id:            userRow.id,
        email:         userRow.email,
        full_name:     userRow.full_name,
        role:          userRow.role,
        entity_id:     userRow.entity_id,
        entity_name:   userRow.entity_name,
        entity_name_ar:userRow.entity_name_ar,
        permissions:   permissions || [],
        scope:         scope || 'own',
        institutions:  institutions || (userRow.entity_id ? [userRow.entity_id] : []),
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── H-02: Refresh — rotates BOTH access_token AND refresh_token ───────────────
router.post('/refresh', async (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  const refreshToken = req.cookies?.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET
    );

    let result;
    try {
      result = await query(
        'SELECT id, is_active, locked_until FROM users WHERE id = $1',
        [decoded.userId]
      );
    } catch (dbErr) {
      if (dbErr.code === '42703' || String(dbErr.message).includes('locked_until')) {
        result = await query('SELECT id, is_active FROM users WHERE id = $1', [decoded.userId]);
        if (result.rows[0]) result.rows[0].locked_until = null;
      } else {
        throw dbErr;
      }
    }

    const user = result.rows[0];
    if (!user || !user.is_active) {
      return res.status(403).json({ error: 'User not found or inactive' });
    }
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(429).json({ error: 'Account is temporarily locked' });
    }

    // H-02: Issue new access_token AND new refresh_token (token rotation)
    const newAccessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
    const newRefreshToken = jwt.sign(
      { userId: decoded.userId },
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '24h' }
    );

    res.cookie('access_token',  newAccessToken,  cookieOpts(isProd, ACCESS_TOKEN_MS));
    res.cookie('refresh_token', newRefreshToken, {
      ...cookieOpts(isProd, REFRESH_TOKEN_MS),
      path: '/api/auth/refresh',
    });

    res.json({ message: 'Token refreshed' });
  } catch {
    return res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
});

// ── Logout — clear both cookies ────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  const base   = { httpOnly: true, secure: isProd, sameSite: 'Strict' };
  res.clearCookie('access_token',  base);
  res.clearCookie('refresh_token', { ...base, path: '/api/auth/refresh' });
  res.json({ message: 'Logged out successfully' });
});

// ── Get current user ───────────────────────────────────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.entity_id,
              e.name as entity_name, e.name_ar as entity_name_ar
       FROM users u
       LEFT JOIN entities e ON u.entity_id = e.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    user.permissions = req.user.permissions || [];
    user.scope       = req.user.scope || 'own';
    user.institutions = req.user.institutions || (user.entity_id ? [user.entity_id] : []);

    if (user.institutions?.length > 0) {
      const entResult = await query(
        'SELECT id, name, name_ar FROM entities WHERE id = ANY($1::int[]) ORDER BY name_ar',
        [user.institutions]
      );
      user.institution_names = entResult.rows;
    } else {
      user.institution_names = [];
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error.message);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// ── Change password (self) ─────────────────────────────────────────────────────
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    const pwErr = validatePassword(new_password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isValid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const new_password_hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [new_password_hash, req.user.id]);

    const performedByUser = req.user?.email || String(req.user?.id);
    await logAudit(pool, 'users', req.user.id, 'PASSWORD_CHANGE',
      null, { changed: true }, performedByUser);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error.message);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
