import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../database/db.js';
import pool from '../database/db.js';
import { authenticateToken, loadUserPermissions, loadUserInstitutions } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLog.js';

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, role = 'entity_user', entity_id } = req.body;

    // Validate input
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role, entity_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, full_name, role, entity_id, created_at`,
      [email, password_hash, full_name, role, entity_id]
    );

    const user = result.rows[0];
    const performedByUser = email || 'registration';
    await logAudit(pool, 'users', user.id, 'INSERT', null, { email: user.email, full_name: user.full_name, role: user.role, entity_id: user.entity_id }, performedByUser);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        entity_id: user.entity_id
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await query(
      `SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.entity_id, u.is_active,
              e.name as entity_name, e.name_ar as entity_name_ar
       FROM users u
       LEFT JOIN entities e ON u.entity_id = e.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { permissions, scope } = await loadUserPermissions(user.id, user.role);
    const institutions = await loadUserInstitutions(user.id, user.entity_id);

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        permissions,
        scope: scope || 'own',
        institutions: institutions || (user.entity_id ? [user.entity_id] : []),
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        entity_id: user.entity_id,
        entity_name: user.entity_name,
        entity_name_ar: user.entity_name_ar,
        permissions: permissions || [],
        scope: scope || 'own',
        institutions: institutions || (user.entity_id ? [user.entity_id] : []),
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
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
    user.scope = req.user.scope || 'own';
    user.institutions = req.user.institutions || (user.entity_id ? [user.entity_id] : []);

    if (user.institutions && user.institutions.length > 0) {
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
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    // Get current password hash
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    const isValid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const new_password_hash = await bcrypt.hash(new_password, salt);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [new_password_hash, req.user.id]
    );

    const performedByUser = req.user?.email || req.user?.full_name || String(req.user?.id ?? 'system');
    await logAudit(pool, 'users', req.user.id, 'UPDATE', { password_changed: false }, { password_changed: true }, performedByUser);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
