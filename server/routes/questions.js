/**
 * Question Bank Management Routes
 * Global reusable question CRUD operations
 */

import express from 'express';
import pool from '../database/db.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLog.js';

const router = express.Router();

function performedBy(req) {
  return req.user?.email || req.user?.full_name || String(req.user?.userId ?? req.user?.id ?? 'system');
}

// ============================================
// GET QUESTION CATEGORIES (for filtering)
// MUST BE BEFORE /:id ROUTE
// ============================================
router.get('/meta/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM questions
      WHERE category IS NOT NULL AND is_active = true
      GROUP BY category
      ORDER BY category
    `);

    res.json({
      success: true,
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
// GET AVAILABLE STATIC DATA FIELDS
// MUST BE BEFORE /:id ROUTE
// ============================================
router.get('/meta/static-fields', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        field_key,
        field_name,
        field_name_ar,
        field_type,
        field_category
      FROM static_data_fields
      ORDER BY field_category, display_order
    `);

    res.json({
      success: true,
      fields: result.rows
    });

  } catch (error) {
    console.error('Error fetching static fields:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch static fields',
      error: error.message 
    });
  }
});

// ============================================
// GET ALL QUESTIONS
// ============================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      type, 
      category, 
      is_active = 'true',
      search 
    } = req.query;

    let query = `
      SELECT 
        q.*,
        sdf.field_name as linked_field_name,
        sdf.field_name_ar as linked_field_name_ar,
        pq.question_text as parent_question_text,
        u.full_name as created_by_name
      FROM questions q
      LEFT JOIN static_data_fields sdf ON q.linked_static_data_field = sdf.field_key
      LEFT JOIN questions pq ON q.parent_question_id = pq.id
      LEFT JOIN users u ON q.created_by = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (type) {
      query += ` AND q.question_type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    if (category) {
      query += ` AND q.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (is_active) {
      query += ` AND q.is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    if (search) {
      query += ` AND (q.question_text ILIKE $${paramCount} OR q.question_text_ar ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY q.category, q.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      questions: result.rows
    });

  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch questions',
      error: error.message 
    });
  }
});

// ============================================
// GET QUESTION BY ID
// ============================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        q.*,
        sdf.field_name as linked_field_name,
        sdf.field_name_ar as linked_field_name_ar,
        sdf.field_type as linked_field_type,
        pq.question_text as parent_question_text,
        u.full_name as created_by_name
      FROM questions q
      LEFT JOIN static_data_fields sdf ON q.linked_static_data_field = sdf.field_key
      LEFT JOIN questions pq ON q.parent_question_id = pq.id
      LEFT JOIN users u ON q.created_by = u.id
      WHERE q.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question not found' 
      });
    }

    // Get child questions if any
    const childQuestions = await pool.query(`
      SELECT id, question_text, question_text_ar, trigger_answer_value
      FROM questions
      WHERE parent_question_id = $1
      ORDER BY created_at
    `, [id]);

    const question = result.rows[0];
    question.child_questions = childQuestions.rows;

    res.json({
      success: true,
      question
    });

  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch question',
      error: error.message 
    });
  }
});

// ============================================
// CREATE QUESTION
// ============================================
router.post('/', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  try {
    const {
      question_text,
      question_text_ar,
      question_type,
      linked_static_data_field,
      evaluation_rule,
      reference_value,
      reference_value_max,
      options,
      parent_question_id,
      trigger_answer_value,
      weight,
      description,
      description_ar,
      help_text,
      help_text_ar,
      category
    } = req.body;

    // Validation
    if (!question_text || !question_text_ar || !question_type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Required fields: question_text, question_text_ar, question_type' 
      });
    }

    // Validate question type specific requirements
    if (question_type === 'StaticDataLinked' && !linked_static_data_field) {
      return res.status(400).json({ 
        success: false, 
        message: 'StaticDataLinked questions require linked_static_data_field' 
      });
    }

    if (question_type === 'MultiChoice' && (!options || Object.keys(options).length === 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'MultiChoice questions require options object' 
      });
    }

    if (question_type === 'ParentChild' && !parent_question_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'ParentChild questions require parent_question_id' 
      });
    }

    // Convert empty strings to null for optional fields
    const cleanLinkedField = linked_static_data_field && linked_static_data_field.trim() !== '' 
      ? linked_static_data_field 
      : null;
    const cleanEvalRule = evaluation_rule && evaluation_rule.trim() !== '' 
      ? evaluation_rule 
      : null;
    const cleanRefValue = reference_value && reference_value.toString().trim() !== '' 
      ? reference_value 
      : null;
    const cleanRefValueMax = reference_value_max && reference_value_max.toString().trim() !== '' 
      ? reference_value_max 
      : null;
    const cleanCategory = category && category.trim() !== '' 
      ? category 
      : null;

    const result = await pool.query(`
      INSERT INTO questions (
        question_text, question_text_ar, question_type,
        linked_static_data_field, evaluation_rule, reference_value, reference_value_max,
        options, parent_question_id, trigger_answer_value,
        weight, description, description_ar, help_text, help_text_ar, category,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      question_text, question_text_ar, question_type,
      cleanLinkedField, cleanEvalRule, cleanRefValue, cleanRefValueMax,
      options && Object.keys(options).length > 0 ? JSON.stringify(options) : null,
      parent_question_id || null, trigger_answer_value || null,
      weight || 10.0, description || null, description_ar || null, help_text || null, help_text_ar || null, cleanCategory,
      req.user?.userId ?? req.user?.id
    ]);

    const row = result.rows[0];
    await logAudit(pool, 'questions', row.id, 'INSERT', null, { question_text: row.question_text, question_text_ar: row.question_text_ar, question_type: row.question_type, category: row.category }, performedBy(req));

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      question: row
    });

  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create question',
      error: error.message 
    });
  }
});

// ============================================
// UPDATE QUESTION
// ============================================
router.put('/:id', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      question_text,
      question_text_ar,
      question_type,
      linked_static_data_field,
      evaluation_rule,
      reference_value,
      reference_value_max,
      options,
      parent_question_id,
      trigger_answer_value,
      weight,
      description,
      description_ar,
      help_text,
      help_text_ar,
      category,
      is_active
    } = req.body;

    // Check if question exists and get old values
    const oldResult = await pool.query('SELECT id, question_text, question_text_ar, question_type, category, is_active FROM questions WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    const result = await pool.query(`
      UPDATE questions SET
        question_text = COALESCE($1, question_text),
        question_text_ar = COALESCE($2, question_text_ar),
        question_type = COALESCE($3, question_type),
        linked_static_data_field = $4,
        evaluation_rule = $5,
        reference_value = $6,
        reference_value_max = $7,
        options = $8,
        parent_question_id = $9,
        trigger_answer_value = $10,
        weight = COALESCE($11, weight),
        description = $12,
        description_ar = $13,
        help_text = $14,
        help_text_ar = $15,
        category = $16,
        is_active = COALESCE($17, is_active)
      WHERE id = $18
      RETURNING *
    `, [
      question_text, question_text_ar, question_type,
      linked_static_data_field, evaluation_rule, reference_value, reference_value_max,
      options ? JSON.stringify(options) : null,
      parent_question_id, trigger_answer_value,
      weight, description, description_ar, help_text, help_text_ar, category,
      is_active,
      id
    ]);

    const oldRow = oldResult.rows[0];
    const newRow = result.rows[0];
    await logAudit(pool, 'questions', parseInt(id), 'UPDATE', { question_text: oldRow.question_text, question_text_ar: oldRow.question_text_ar, question_type: oldRow.question_type, category: oldRow.category, is_active: oldRow.is_active }, { question_text: newRow.question_text, question_text_ar: newRow.question_text_ar, question_type: newRow.question_type, category: newRow.category, is_active: newRow.is_active }, performedBy(req));

    res.json({
      success: true,
      message: 'Question updated successfully',
      question: newRow
    });

  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update question',
      error: error.message 
    });
  }
});

// ============================================
// DELETE QUESTION (Soft delete - set is_active = false)
// ============================================
router.delete('/:id', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if question is used in any templates
    const usageCheck = await pool.query(`
      SELECT t.name, t.name_ar
      FROM template_questions tq
      JOIN templates t ON tq.template_id = t.id
      WHERE tq.question_id = $1 AND t.is_active = true
      LIMIT 5
    `, [id]);

    if (usageCheck.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete question that is used in active templates',
        templates: usageCheck.rows
      });
    }

    const oldResult = await pool.query('SELECT id, question_text, question_text_ar, is_active FROM questions WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    const result = await pool.query(`
      UPDATE questions 
      SET is_active = false 
      WHERE id = $1 
      RETURNING id, question_text
    `, [id]);

    await logAudit(pool, 'questions', parseInt(id), 'UPDATE', { is_active: oldResult.rows[0].is_active }, { is_active: false }, performedBy(req));

    res.json({
      success: true,
      message: 'Question deactivated successfully',
      question: result.rows[0]
    });

  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete question',
      error: error.message 
    });
  }
});

export default router;
