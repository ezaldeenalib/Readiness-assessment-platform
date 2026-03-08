/**
 * Template Management Routes
 * Create and manage evaluation templates with questions
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
// GET ALL TEMPLATES
// ============================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, is_active = 'true', search } = req.query;

    let query = `
      SELECT 
        t.*,
        mc.name_en as category_name_en,
        mc.name_ar as category_name_ar,
        COUNT(DISTINCT tq.id) as question_count,
        SUM(COALESCE(tq.override_weight, q.weight)) as total_weight,
        u.full_name as created_by_name
      FROM templates t
      LEFT JOIN master_categories mc ON t.category_id = mc.id
      LEFT JOIN template_questions tq ON t.id = tq.template_id
      LEFT JOIN Questions q ON tq.question_id = q.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (category) {
      // Support both category_id (integer) and category code/name (string) for backward compatibility
      if (!isNaN(category)) {
        query += ` AND t.category_id = $${paramCount}`;
        params.push(parseInt(category));
      } else {
        // Search in master_categories, and optionally in legacy category column if it exists
        query += ` AND (mc.name_en ILIKE $${paramCount} OR mc.name_ar ILIKE $${paramCount})`;
        params.push(`%${category}%`);
      }
      paramCount++;
    }

    if (is_active) {
      query += ` AND t.is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    if (search) {
      query += ` AND (t.name ILIKE $${paramCount} OR t.name_ar ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` 
      GROUP BY t.id, u.full_name, mc.name_en, mc.name_ar
      ORDER BY t.created_at DESC
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      templates: result.rows
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch templates',
      error: error.message 
    });
  }
});

// ============================================
// GET TEMPLATE BY ID WITH QUESTIONS
// ============================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get template details
    const templateResult = await pool.query(`
      SELECT 
        t.*,
        mc.name_en as category_name_en,
        mc.name_ar as category_name_ar,
        u.full_name as created_by_name
      FROM templates t
      LEFT JOIN master_categories mc ON t.category_id = mc.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `, [id]);

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    const template = templateResult.rows[0];

    // Get template questions with details - النظام الجديد
    const questionsResult = await pool.query(`
      SELECT 
        tq.id as template_question_id,
        tq.display_order,
        tq.override_weight,
        tq.is_required,
        tq.section_id,
        sc.name_en as section_name_en,
        sc.name_ar as section_name_ar,
        tq.section_name as section_name_legacy,
        tq.section_name_ar,
        tq.include_in_evaluation,
        q.id,
        q.text_en,
        q.text_ar,
        q.question_type,
        q.parent_question_id,
        q.trigger_answer_value,
        q.composite_columns,
        q.weight,
        q.category_id,
        qc.name_en as question_category_name_en,
        qc.name_ar as question_category_name_ar,
        q.category as category_legacy,
        q.is_active,
        q.created_at,
        q.updated_at,
        COALESCE(tq.override_weight, q.weight) as effective_weight,
        -- للحفاظ على التوافق مع النظام القديم
        q.text_en as question_text,
        q.text_ar as question_text_ar
      FROM template_questions tq
      JOIN Questions q ON tq.question_id = q.id
      LEFT JOIN master_categories sc ON tq.section_id = sc.id
      LEFT JOIN master_categories qc ON q.category_id = qc.id
      WHERE tq.template_id = $1
        AND q.is_active = TRUE
      ORDER BY tq.display_order
    `, [id]);

    template.questions = questionsResult.rows;
    template.total_weight = questionsResult.rows.reduce((sum, q) => sum + parseFloat(q.effective_weight), 0);
    // تطبيع axis_weights: تأكد أنه كائن وليس null
    if (!template.axis_weights || typeof template.axis_weights !== 'object') {
      template.axis_weights = {};
    }

    res.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch template',
      error: error.message 
    });
  }
});

// ============================================
// CREATE TEMPLATE
// ============================================
router.post('/', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      name,
      name_ar,
      description,
      description_ar,
      version,
      category_id,
      category, // Legacy support
      questions // Array of { question_id, display_order, override_weight, section_id, section_name, section_name_ar, include_in_evaluation }
    } = req.body;

    // Validation
    if (!name || !name_ar) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'Required fields: name, name_ar' 
      });
    }

    // Handle category_id - if category (legacy) is provided, try to find category_id
    let finalCategoryId = category_id || null;
    if (!finalCategoryId && category) {
      const categoryResult = await client.query(
        'SELECT id FROM master_categories WHERE name_en ILIKE $1 OR name_ar ILIKE $1 LIMIT 1',
        [category]
      );
      if (categoryResult.rows.length > 0) {
        finalCategoryId = categoryResult.rows[0].id;
      }
    }

    // Create template
    const templateResult = await client.query(`
      INSERT INTO templates (
        name, name_ar, description, description_ar, version, category_id, category, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [name, name_ar, description, description_ar, version || '1.0', finalCategoryId, category || null, req.user.userId]);

    const template = templateResult.rows[0];

    // Add questions to template if provided
    if (questions && questions.length > 0) {
      for (const q of questions) {
        // Handle section_id - if section_name (legacy) is provided, try to find section_id
        let finalSectionId = q.section_id || null;
        if (!finalSectionId && q.section_name) {
          const sectionResult = await client.query(
            'SELECT id FROM master_categories WHERE name_en ILIKE $1 OR name_ar ILIKE $1 LIMIT 1',
            [q.section_name]
          );
          if (sectionResult.rows.length > 0) {
            finalSectionId = sectionResult.rows[0].id;
          }
        }

        await client.query(`
          INSERT INTO template_questions (
            template_id, question_id, display_order, 
            override_weight, is_required, section_id, section_name, section_name_ar, include_in_evaluation
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          template.id,
          q.question_id,
          q.display_order || 0,
          q.override_weight || null,
          q.is_required !== false, // Default to true
          finalSectionId,
          q.section_name || null, // Keep for backward compatibility
          q.section_name_ar || null,
          q.include_in_evaluation !== false // Default to true
        ]);
      }
    }

    // تسجيل في AuditLog
    await logAudit(
      client,
      'templates',
      template.id,
      'INSERT',
      null,
      {
        name: template.name,
        name_ar: template.name_ar,
        description: template.description,
        description_ar: template.description_ar,
        version: template.version,
        category: template.category,
        question_count: questions?.length ?? 0
      },
      performedBy(req)
    );

    await client.query('COMMIT');

    // Fetch complete template with questions - النظام الجديد
    const completeTemplate = await pool.query(`
      SELECT 
        t.*,
        COUNT(tq.id) as question_count,
        SUM(COALESCE(tq.override_weight, q.weight)) as total_weight
      FROM templates t
      LEFT JOIN template_questions tq ON t.id = tq.template_id
      LEFT JOIN Questions q ON tq.question_id = q.id
      WHERE t.id = $1
      GROUP BY t.id
    `, [template.id]);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template: completeTemplate.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating template:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create template',
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// ============================================
// UPDATE AXIS WEIGHTS (TemplateWeightManager)
// PUT /templates/:id/weights
// Body: { axis_weights: {"محور": 40.0, ...}, questions: [{question_id, override_weight, section_name_ar, display_order, include_in_evaluation}] }
// ============================================
router.put('/:id/weights', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const templateId = parseInt(id, 10);
    if (isNaN(templateId)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Invalid template id' });
    }

    const { axis_weights, questions } = req.body;

    const checkResult = await client.query('SELECT id FROM templates WHERE id = $1', [templateId]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // 1. Update axis_weights (if column exists). On error, rollback and start fresh so we can continue.
    try {
      await client.query(
        `UPDATE templates SET axis_weights = $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(axis_weights || {}), templateId]
      );
    } catch (axisErr) {
      const msg = (axisErr.message || '').toLowerCase();
      const skipAxis = msg.includes('axis_weights') || (msg.includes('column') && msg.includes('does not exist'));
      if (skipAxis) {
        await client.query('ROLLBACK');
        await client.query('BEGIN');
      } else {
        throw axisErr;
      }
    }

    // 2. Update template_questions
    if (Array.isArray(questions) && questions.length > 0) {
      let useIncludeInEval = true;
      for (const q of questions) {
        const questionId = q.question_id != null ? parseInt(q.question_id, 10) : null;
        if (questionId == null || isNaN(questionId)) continue;

        const overrideWeight = q.override_weight != null ? parseFloat(q.override_weight) : 0;
        const sectionNameAr = typeof q.section_name_ar === 'string' ? q.section_name_ar : '';
        const displayOrder = q.display_order != null ? parseInt(q.display_order, 10) : 0;
        const includeInEval = q.include_in_evaluation !== false;

        try {
          if (useIncludeInEval) {
            await client.query(
              `UPDATE template_questions
               SET override_weight = $1,
                   section_name_ar = $2,
                   display_order   = $3,
                   include_in_evaluation = $4
               WHERE template_id = $5 AND question_id = $6`,
              [overrideWeight, sectionNameAr, displayOrder, includeInEval, templateId, questionId]
            );
          } else {
            await client.query(
              `UPDATE template_questions
               SET override_weight = $1,
                   section_name_ar = $2,
                   display_order   = $3
               WHERE template_id = $4 AND question_id = $5`,
              [overrideWeight, sectionNameAr, displayOrder, templateId, questionId]
            );
          }
        } catch (updateErr) {
          const msg = (updateErr.message || '').toLowerCase();
          const columnMissing = msg.includes('include_in_evaluation') || (msg.includes('column') && msg.includes('does not exist'));
          if (columnMissing && useIncludeInEval) {
            await client.query('ROLLBACK');
            await client.query('BEGIN');
            useIncludeInEval = false;
            await client.query(
              `UPDATE template_questions
               SET override_weight = $1,
                   section_name_ar = $2,
                   display_order   = $3
               WHERE template_id = $4 AND question_id = $5`,
              [overrideWeight, sectionNameAr, displayOrder, templateId, questionId]
            );
          } else {
            throw updateErr;
          }
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'تم حفظ الأوزان بنجاح' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error updating weights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update weights',
      error: error.message,
      code: error.code
    });
  } finally {
    client.release();
  }
});

// ============================================
// UPDATE TEMPLATE
// ============================================
router.put('/:id', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      name,
      name_ar,
      description,
      description_ar,
      version,
      category_id,
      category, // Legacy support
      is_active,
      questions // If provided, will replace all existing questions
    } = req.body;

    // Check if template exists and get old values for audit
    const checkResult = await client.query('SELECT * FROM templates WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }
    const oldTemplate = checkResult.rows[0];

    // Handle category_id - if category (legacy) is provided, try to find category_id
    let finalCategoryId = category_id;
    if (finalCategoryId === undefined && category) {
      const categoryResult = await client.query(
        'SELECT id FROM master_categories WHERE name_en ILIKE $1 OR name_ar ILIKE $1 LIMIT 1',
        [category]
      );
      if (categoryResult.rows.length > 0) {
        finalCategoryId = categoryResult.rows[0].id;
      }
    }

    // Update template
    await client.query(`
      UPDATE templates SET
        name = COALESCE($1, name),
        name_ar = COALESCE($2, name_ar),
        description = $3,
        description_ar = $4,
        version = COALESCE($5, version),
        category_id = COALESCE($6, category_id),
        category = COALESCE($7, category),
        is_active = COALESCE($8, is_active)
      WHERE id = $9
    `, [name, name_ar, description, description_ar, version, finalCategoryId, category, is_active, id]);

    // Update questions if provided
    if (questions && Array.isArray(questions)) {
      // Delete existing questions
      await client.query('DELETE FROM template_questions WHERE template_id = $1', [id]);

      // Add new questions
      for (const q of questions) {
        // Handle section_id - if section_name (legacy) is provided, try to find section_id
        let finalSectionId = q.section_id || null;
        if (!finalSectionId && q.section_name) {
          const sectionResult = await client.query(
            'SELECT id FROM master_categories WHERE name_en ILIKE $1 OR name_ar ILIKE $1 LIMIT 1',
            [q.section_name]
          );
          if (sectionResult.rows.length > 0) {
            finalSectionId = sectionResult.rows[0].id;
          }
        }

        await client.query(`
          INSERT INTO template_questions (
            template_id, question_id, display_order, 
            override_weight, is_required, section_id, section_name, section_name_ar, include_in_evaluation
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          id,
          q.question_id,
          q.display_order || 0,
          q.override_weight || null,
          q.is_required !== false,
          finalSectionId,
          q.section_name || null, // Keep for backward compatibility
          q.section_name_ar || null,
          q.include_in_evaluation !== false // Default to true
        ]);
      }
    }

    // تسجيل في AuditLog
    const newSnapshot = {
      name: name ?? oldTemplate.name,
      name_ar: name_ar ?? oldTemplate.name_ar,
      description: description ?? oldTemplate.description,
      description_ar: description_ar ?? oldTemplate.description_ar,
      version: version ?? oldTemplate.version,
      category: category ?? oldTemplate.category,
      is_active: is_active !== undefined ? is_active : oldTemplate.is_active,
      questions_updated: Array.isArray(questions),
      question_count: Array.isArray(questions) ? questions.length : undefined
    };
    await logAudit(
      client,
      'templates',
      parseInt(id),
      'UPDATE',
      {
        name: oldTemplate.name,
        name_ar: oldTemplate.name_ar,
        version: oldTemplate.version,
        is_active: oldTemplate.is_active
      },
      newSnapshot,
      performedBy(req)
    );

    await client.query('COMMIT');

    // Fetch updated template - النظام الجديد
    const updatedTemplate = await pool.query(`
      SELECT 
        t.*,
        COUNT(tq.id) as question_count,
        SUM(COALESCE(tq.override_weight, q.weight)) as total_weight
      FROM templates t
      LEFT JOIN template_questions tq ON t.id = tq.template_id
      LEFT JOIN Questions q ON tq.question_id = q.id
      WHERE t.id = $1
      GROUP BY t.id
    `, [id]);

    res.json({
      success: true,
      message: 'Template updated successfully',
      template: updatedTemplate.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating template:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update template',
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// ============================================
// DELETE TEMPLATE (Soft delete)
// ============================================
router.delete('/:id', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Check if template is used in any assessments
    const usageCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM template_assessments
      WHERE template_id = $1
    `, [id]);

    if (parseInt(usageCheck.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete template that has been used in assessments',
        assessment_count: usageCheck.rows[0].count
      });
    }

    const oldRow = await client.query('SELECT id, name, name_ar, is_active FROM templates WHERE id = $1', [id]);
    if (oldRow.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    const result = await client.query(`
      UPDATE templates 
      SET is_active = false 
      WHERE id = $1 
      RETURNING id, name, name_ar
    `, [id]);

    // تسجيل في AuditLog
    await logAudit(
      client,
      'templates',
      parseInt(id),
      'UPDATE',
      { name: oldRow.rows[0].name, name_ar: oldRow.rows[0].name_ar, is_active: oldRow.rows[0].is_active },
      { is_active: false },
      performedBy(req)
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Template deactivated successfully',
      template: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error deleting template:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete template',
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// ============================================
// DUPLICATE TEMPLATE
// ============================================
router.post('/:id/duplicate', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { new_name, new_name_ar } = req.body;

    // Get original template
    const originalTemplate = await client.query('SELECT * FROM templates WHERE id = $1', [id]);
    
    if (originalTemplate.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    const original = originalTemplate.rows[0];

    // Create duplicate
    const duplicateResult = await client.query(`
      INSERT INTO templates (
        name, name_ar, description, description_ar, version, category, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      new_name || `${original.name} (Copy)`,
      new_name_ar || `${original.name_ar} (نسخة)`,
      original.description,
      original.description_ar,
      original.version,
      original.category,
      req.user.userId
    ]);

    const duplicate = duplicateResult.rows[0];

    // Copy questions
    await client.query(`
      INSERT INTO template_questions (
        template_id, question_id, display_order, 
        override_weight, is_required, section_name, section_name_ar, include_in_evaluation
      )
      SELECT 
        $1, question_id, display_order, 
        override_weight, is_required, section_name, section_name_ar, include_in_evaluation
      FROM template_questions
      WHERE template_id = $2
    `, [duplicate.id, id]);

    // تسجيل في AuditLog
    await logAudit(
      client,
      'templates',
      duplicate.id,
      'INSERT',
      null,
      {
        name: duplicate.name,
        name_ar: duplicate.name_ar,
        description: duplicate.description,
        version: duplicate.version,
        category: duplicate.category,
        source_template_id: parseInt(id)
      },
      performedBy(req)
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Template duplicated successfully',
      template: duplicate
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error duplicating template:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to duplicate template',
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// ============================================
// GET TEMPLATE STATISTICS
// ============================================
router.get('/:id/statistics', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const stats = await pool.query(`
      SELECT 
        COUNT(DISTINCT ta.assessment_id) as total_assessments,
        AVG(ta.percentage_score) as average_score,
        MIN(ta.percentage_score) as min_score,
        MAX(ta.percentage_score) as max_score,
        COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN ta.assessment_id END) as completed_count
      FROM template_assessments ta
      JOIN assessments a ON ta.assessment_id = a.id
      WHERE ta.template_id = $1
    `, [id]);

    res.json({
      success: true,
      statistics: stats.rows[0]
    });

  } catch (error) {
    console.error('Error fetching template statistics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch template statistics',
      error: error.message 
    });
  }
});

// ============================================
// GET TEMPLATE CATEGORIES
// ============================================
router.get('/meta/categories', authenticateToken, async (req, res) => {
  try {
    // Get categories from master_categories with usage counts
    const result = await pool.query(`
      SELECT 
        mc.id,
        mc.name_en,
        mc.name_ar,
        COUNT(DISTINCT t.id) as count,
        mc.is_active
      FROM master_categories mc
      LEFT JOIN templates t ON t.category_id = mc.id AND t.is_active = TRUE
      WHERE mc.is_active = TRUE
      GROUP BY mc.id, mc.name_en, mc.name_ar, mc.is_active
      HAVING COUNT(DISTINCT t.id) > 0
      ORDER BY mc.name_ar, mc.name_en
    `);

    res.json({
      success: true,
      categories: result.rows.map(row => ({
        id: row.id,
        name_en: row.name_en,
        name_ar: row.name_ar,
        count: parseInt(row.count),
        // Legacy format for backward compatibility
        category: row.name_ar || row.name_en
      }))
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

export default router;
