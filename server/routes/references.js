/**
 * Reference Dictionary API
 * إدارة قاموس المراجع (reference_dictionary)
 * For Composite questions and MultiSelect with options_from_reference
 */

import express from 'express';
import pool from '../database/db.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// GET REFERENCES (filtered by category_id or type for backward compat)
// ============================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category_id, type, include_inactive } = req.query;

    let query = `
      SELECT rd.id, rd.type, rd.category_id, rd.name_en, rd.name_ar, rd.is_active, rd.display_order,
             rd.created_at, rd.updated_at,
             mc.name_ar as category_name_ar, mc.name_en as category_name_en
      FROM reference_dictionary rd
      LEFT JOIN master_categories mc ON mc.id = rd.category_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (category_id) {
      query += ` AND rd.category_id = $${idx}`;
      params.push(parseInt(category_id, 10));
      idx++;
    } else if (type) {
      const typeNum = parseInt(type, 10);
      if (!isNaN(typeNum)) {
        query += ` AND rd.category_id = $${idx}`;
        params.push(typeNum);
        idx++;
      } else {
        query += ` AND rd.type = $${idx}`;
        params.push(type);
        idx++;
      }
    }

    if (include_inactive !== 'true') {
      query += ` AND rd.is_active = TRUE`;
    }

    query += ` ORDER BY mc.name_ar, rd.display_order, rd.name_ar`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      references: result.rows
    });

  } catch (error) {
    console.error('Error fetching references:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch references',
      error: error.message
    });
  }
});

// ============================================
// CREATE REFERENCE (admin only) - category_id from master_categories
// ============================================
router.post('/', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  try {
    const { category_id, name_en, name_ar, display_order } = req.body;

    if (!category_id || !name_ar) {
      return res.status(400).json({
        success: false,
        message: 'category_id and name_ar are required'
      });
    }

    const catId = parseInt(category_id, 10);
    if (isNaN(catId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category_id'
      });
    }

    const result = await pool.query(`
      INSERT INTO reference_dictionary (category_id, type, name_en, name_ar, display_order)
      SELECT $1, mc.name_en, $2, $3, $4
      FROM master_categories mc WHERE mc.id = $1
      RETURNING *
    `, [catId, name_en || '', name_ar, display_order ?? 0]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(201).json({
      success: true,
      reference: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating reference:', error);
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Invalid category_id'
      });
    }
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Duplicate entry for this category'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create reference',
      error: error.message
    });
  }
});

// ============================================
// UPDATE REFERENCE (admin only)
// ============================================
router.put('/:id', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name_en, name_ar, display_order } = req.body;

    let result;
    if (category_id != null) {
      const catId = parseInt(category_id, 10);
      result = await pool.query(`
        UPDATE reference_dictionary rd SET
          category_id = $2,
          type = (SELECT name_en FROM master_categories WHERE id = $2 LIMIT 1),
          name_en = COALESCE($3, rd.name_en),
          name_ar = COALESCE($4, rd.name_ar),
          display_order = COALESCE($5, rd.display_order),
          updated_at = CURRENT_TIMESTAMP
        WHERE rd.id = $1
        RETURNING *
      `, [id, catId, name_en, name_ar, display_order]);
    } else {
      result = await pool.query(`
        UPDATE reference_dictionary SET
          name_en = COALESCE($2, name_en),
          name_ar = COALESCE($3, name_ar),
          display_order = COALESCE($4, display_order),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [id, name_en, name_ar, display_order]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reference not found'
      });
    }

    res.json({
      success: true,
      reference: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating reference:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update reference',
      error: error.message
    });
  }
});

// ============================================
// TOGGLE ACTIVE (admin only)
// ============================================
router.patch('/:id/toggle', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE reference_dictionary
      SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reference not found'
      });
    }

    res.json({
      success: true,
      reference: result.rows[0]
    });

  } catch (error) {
    console.error('Error toggling reference:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle reference',
      error: error.message
    });
  }
});

// ============================================
// DELETE REFERENCE (admin only)
// ============================================
router.delete('/:id', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const inUse = await pool.query(
      'SELECT 1 FROM assessment_reference_values WHERE reference_id = $1 LIMIT 1',
      [id]
    );

    if (inUse.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete reference that is in use'
      });
    }

    const result = await pool.query(
      'DELETE FROM reference_dictionary WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reference not found'
      });
    }

    res.json({
      success: true,
      message: 'Reference deleted'
    });

  } catch (error) {
    console.error('Error deleting reference:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete reference',
      error: error.message
    });
  }
});

export default router;
