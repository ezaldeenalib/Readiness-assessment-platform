/**
 * Categories Management Routes
 * إدارة الفئات المركزي
 * Centralized category management for Questions, Templates, and Sections
 */

import express from 'express';
import pool from '../database/db.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLog.js';

const router = express.Router();

function performedBy(req) {
  return req.user?.email || req.user?.full_name || String(req.user?.id ?? 'system');
}

// ============================================
// GET ALL CATEGORIES
// ============================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { is_active, search } = req.query;

    let query = `
      SELECT 
        id,
        name_en,
        name_ar,
        description_en,
        description_ar,
        is_active,
        created_at,
        updated_at,
        (
          SELECT COUNT(*) FROM Questions WHERE category_id = mc.id
        ) as questions_count,
        (
          SELECT COUNT(*) FROM templates WHERE category_id = mc.id
        ) as templates_count,
        (
          SELECT COUNT(*) FROM template_questions WHERE section_id = mc.id
        ) as sections_count
      FROM master_categories mc
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    if (search) {
      query += ` AND (
        name_en ILIKE $${paramCount} OR 
        name_ar ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY name_ar, name_en`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      categories: result.rows
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch categories',
      error: error.message 
    });
  }
});

// ============================================
// GET CATEGORY BY ID
// ============================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        id,
        name_en,
        name_ar,
        description_en,
        description_ar,
        is_active,
        created_at,
        updated_at,
        (
          SELECT COUNT(*) FROM Questions WHERE category_id = mc.id
        ) as questions_count,
        (
          SELECT COUNT(*) FROM templates WHERE category_id = mc.id
        ) as templates_count,
        (
          SELECT COUNT(*) FROM template_questions WHERE section_id = mc.id
        ) as sections_count
      FROM master_categories mc
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Category not found' 
      });
    }

    res.json({
      success: true,
      category: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch category',
      error: error.message 
    });
  }
});

// ============================================
// CREATE CATEGORY
// ============================================
router.post('/', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      name_en,
      name_ar,
      description_en,
      description_ar,
      is_active = true
    } = req.body;

    // Validation
    if (!name_en || !name_ar) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'Required fields: name_en, name_ar' 
      });
    }

    // Create category
    const result = await client.query(`
      INSERT INTO master_categories (
        name_en, name_ar, description_en, description_ar, is_active
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name_en, name_ar, description_en || null, description_ar || null, is_active]);

    const category = result.rows[0];

    // Log audit
    await logAudit(
      client,
      'master_categories',
      category.id,
      'INSERT',
      null,
      {
        name_en: category.name_en,
        name_ar: category.name_ar,
        is_active: category.is_active
      },
      performedBy(req)
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating category:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({ 
        success: false, 
        message: 'Category name already exists' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to create category',
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// ============================================
// UPDATE CATEGORY
// ============================================
router.put('/:id', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      name_en,
      name_ar,
      description_en,
      description_ar,
      is_active
    } = req.body;

    // Check if category exists
    const checkResult = await client.query('SELECT * FROM master_categories WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Category not found' 
      });
    }

    const oldCategory = checkResult.rows[0];

    // Update category
    const result = await client.query(`
      UPDATE master_categories SET
        name_en = COALESCE($1, name_en),
        name_ar = COALESCE($2, name_ar),
        description_en = COALESCE($3, description_en),
        description_ar = COALESCE($4, description_ar),
        is_active = COALESCE($5, is_active),
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [
      name_en,
      name_ar,
      description_en,
      description_ar,
      is_active,
      id
    ]);

    const updatedCategory = result.rows[0];

    // Log audit
    await logAudit(
      client,
      'master_categories',
      parseInt(id),
      'UPDATE',
      {
        name_en: oldCategory.name_en,
        name_ar: oldCategory.name_ar,
        is_active: oldCategory.is_active
      },
      {
        name_en: updatedCategory.name_en,
        name_ar: updatedCategory.name_ar,
        is_active: updatedCategory.is_active
      },
      performedBy(req)
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Category updated successfully',
      category: updatedCategory
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating category:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({ 
        success: false, 
        message: 'Category name already exists' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to update category',
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// ============================================
// TOGGLE CATEGORY ACTIVE STATUS
// ============================================
router.patch('/:id/toggle', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Check if category exists
    const checkResult = await client.query('SELECT * FROM master_categories WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Category not found' 
      });
    }

    const oldCategory = checkResult.rows[0];
    const newActiveStatus = !oldCategory.is_active;

    // Check if category is in use before disabling
    if (!newActiveStatus) {
      const questionsCount = await client.query(
        'SELECT COUNT(*) as count FROM Questions WHERE category_id = $1',
        [id]
      );
      const templatesCount = await client.query(
        'SELECT COUNT(*) as count FROM templates WHERE category_id = $1',
        [id]
      );
      const sectionsCount = await client.query(
        'SELECT COUNT(*) as count FROM template_questions WHERE section_id = $1',
        [id]
      );
      const refDictCount = await client.query(
        'SELECT COUNT(*) as count FROM reference_dictionary WHERE category_id = $1',
        [id]
      ).catch(() => ({ rows: [{ count: '0' }] }));

      const totalUsage = parseInt(questionsCount.rows[0].count) + 
                         parseInt(templatesCount.rows[0].count) + 
                         parseInt(sectionsCount.rows[0].count) +
                         parseInt(refDictCount.rows[0]?.count || 0);

      if (totalUsage > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          message: `Cannot disable category that is in use (${totalUsage} references found)`,
          usage: {
            questions: parseInt(questionsCount.rows[0].count),
            templates: parseInt(templatesCount.rows[0].count),
            sections: parseInt(sectionsCount.rows[0].count),
            references: parseInt(refDictCount.rows[0]?.count || 0)
          }
        });
      }
    }

    // Toggle status
    const result = await client.query(`
      UPDATE master_categories SET
        is_active = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [newActiveStatus, id]);

    const updatedCategory = result.rows[0];

    // Log audit
    await logAudit(
      client,
      'master_categories',
      parseInt(id),
      'UPDATE',
      { is_active: oldCategory.is_active },
      { is_active: newActiveStatus },
      performedBy(req)
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Category ${newActiveStatus ? 'activated' : 'deactivated'} successfully`,
      category: updatedCategory
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error toggling category:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to toggle category',
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// ============================================
// DELETE CATEGORY (Soft delete - set is_active = false)
// ============================================
router.delete('/:id', authenticateToken, authorizeRoles('super_admin'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Check if category exists
    const checkResult = await client.query('SELECT * FROM master_categories WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Category not found' 
      });
    }

    const oldCategory = checkResult.rows[0];

    // Check if category is in use
    const questionsCount = await client.query(
      'SELECT COUNT(*) as count FROM Questions WHERE category_id = $1',
      [id]
    );
    const templatesCount = await client.query(
      'SELECT COUNT(*) as count FROM templates WHERE category_id = $1',
      [id]
    );
    const sectionsCount = await client.query(
      'SELECT COUNT(*) as count FROM template_questions WHERE section_id = $1',
      [id]
    );

    const totalUsage = parseInt(questionsCount.rows[0].count) + 
                       parseInt(templatesCount.rows[0].count) + 
                       parseInt(sectionsCount.rows[0].count);

    if (totalUsage > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete category that is in use',
        usage: {
          questions: parseInt(questionsCount.rows[0].count),
          templates: parseInt(templatesCount.rows[0].count),
          sections: parseInt(sectionsCount.rows[0].count)
        }
      });
    }

    // Soft delete (set is_active = false)
    const result = await client.query(`
      UPDATE master_categories SET
        is_active = false,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    // Log audit
    await logAudit(
      client,
      'master_categories',
      parseInt(id),
      'UPDATE',
      { is_active: oldCategory.is_active },
      { is_active: false },
      performedBy(req)
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Category deactivated successfully',
      category: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting category:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete category',
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// ============================================
// GET CATEGORY USAGE STATISTICS
// ============================================
router.get('/:id/usage', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const categoryResult = await pool.query(
      'SELECT * FROM master_categories WHERE id = $1',
      [id]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Category not found' 
      });
    }

    const questionsResult = await pool.query(`
      SELECT id, text_ar, text_en
      FROM Questions
      WHERE category_id = $1
      LIMIT 10
    `, [id]);

    const templatesResult = await pool.query(`
      SELECT id, name, name_ar
      FROM templates
      WHERE category_id = $1
      LIMIT 10
    `, [id]);

    const sectionsResult = await pool.query(`
      SELECT DISTINCT tq.id, t.name as template_name, t.name_ar as template_name_ar
      FROM template_questions tq
      JOIN templates t ON tq.template_id = t.id
      WHERE tq.section_id = $1
      LIMIT 10
    `, [id]);

    res.json({
      success: true,
      category: categoryResult.rows[0],
      usage: {
        questions: {
          total: questionsResult.rows.length,
          items: questionsResult.rows
        },
        templates: {
          total: templatesResult.rows.length,
          items: templatesResult.rows
        },
        sections: {
          total: sectionsResult.rows.length,
          items: sectionsResult.rows
        }
      }
    });

  } catch (error) {
    console.error('Error fetching category usage:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch category usage',
      error: error.message 
    });
  }
});

export default router;
