/**
 * Questions Management Routes - New System
 * إدارة الأسئلة - النظام الجديد
 * يدعم: Manual, YesNo, MultiChoice, MultiSelect, StaticData, Composite
 * يدعم: Parent/Child Questions
 */

import express from 'express';
import { query } from '../database/db.js';
import pool from '../database/db.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { VALID_QUESTION_TYPES, validateQuestionType } from '../constants/questionTypes.js';
import { logAudit } from '../utils/auditLog.js';

const router = express.Router();

function performedBy(req) {
  return req.user?.email || req.user?.full_name || String(req.user?.id ?? 'system');
}

// ============================================
// GET: الحصول على جميع الأسئلة مع الإجابات (إن وجدت)
// ============================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      type, 
      category, 
      is_active = 'true',
      search,
      institution_id,
      include_answers = 'false'
    } = req.query;

    let sql = `
      SELECT 
        q.id,
        q.text_en,
        q.text_ar,
        q.question_type,
        q.parent_question_id,
        q.trigger_answer_value,
        q.composite_columns,
        q.options,
        q.weight,
        q.category_id,
        mc.name_en as category_name_en,
        mc.name_ar as category_name_ar,
        q.category as category_legacy,
        q.is_active,
        q.created_at,
        q.updated_at
    `;

    // إذا طلب المستخدم الإجابات أيضاً
    if (include_answers === 'true' && institution_id) {
      sql += `,
        a.id as answer_id,
        a.answer_value,
        a.is_active as answer_is_active,
        a.assessment_id
      `;
    }

    sql += `
      FROM Questions q
      LEFT JOIN master_categories mc ON q.category_id = mc.id
    `;

    // JOIN مع Answers إذا طُلب
    if (include_answers === 'true' && institution_id) {
      sql += `
        LEFT JOIN Answers a ON a.question_id = q.id
          AND a.institution_id = $${1}
          AND a.is_active = TRUE
          AND a.assessment_id IS NULL
      `;
    }

    sql += ` WHERE 1=1`;

    const params = [];
    let paramCount = 1;

    if (include_answers === 'true' && institution_id) {
      params.push(institution_id);
      paramCount++;
    }

    if (type) {
      sql += ` AND q.question_type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    if (category) {
      // Support both category_id (integer) and category code/name (string) for backward compatibility
      if (!isNaN(category)) {
        sql += ` AND q.category_id = $${paramCount}`;
        params.push(parseInt(category));
      } else {
        sql += ` AND (mc.name_en ILIKE $${paramCount} OR mc.name_ar ILIKE $${paramCount} OR q.category = $${paramCount})`;
        params.push(category);
      }
      paramCount++;
    }

    if (is_active === 'true') {
      sql += ` AND q.is_active = TRUE`;
    }

    if (search) {
      sql += ` AND (q.text_en ILIKE $${paramCount} OR q.text_ar ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    sql += ` ORDER BY COALESCE(mc.name_ar, q.category), q.created_at DESC`;

    const result = await query(sql, params);

    // تجميع الأسئلة الفرعية مع الأب
    const questionsMap = new Map();
    const rootQuestions = [];

    result.rows.forEach(row => {
      if (!row.parent_question_id) {
        // سؤال جذر
        questionsMap.set(row.id, { ...row, child_questions: [] });
        rootQuestions.push(questionsMap.get(row.id));
      }
    });

    // إضافة الأسئلة الفرعية
    result.rows.forEach(row => {
      if (row.parent_question_id) {
        const parent = questionsMap.get(row.parent_question_id);
        if (parent) {
          parent.child_questions.push(row);
        }
      }
    });

    res.json({
      success: true,
      count: rootQuestions.length,
      questions: include_answers === 'true' ? rootQuestions : result.rows
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
// GET: الحصول على سؤال محدد مع الأسئلة الفرعية
// ============================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { institution_id, include_answers = 'false' } = req.query;

    // الحصول على السؤال الرئيسي
    let sql = `
      SELECT 
        q.*
    `;

    if (include_answers === 'true' && institution_id) {
      sql += `,
        a.id as answer_id,
        a.answer_value,
        a.is_active as answer_is_active
      `;
    }

    sql += `
      FROM Questions q
    `;

    if (include_answers === 'true' && institution_id) {
      sql += `
        LEFT JOIN Answers a ON a.question_id = q.id
          AND a.institution_id = $2
          AND a.is_active = TRUE
          AND a.assessment_id IS NULL
      `;
    }

    sql += ` WHERE q.id = $1`;

    const params = [id];
    if (include_answers === 'true' && institution_id) {
      params.push(institution_id);
    }

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question not found' 
      });
    }

    const question = result.rows[0];

    // الحصول على الأسئلة الفرعية
    const childQuestions = await query(`
      SELECT q.*
      ${include_answers === 'true' && institution_id ? `
        , a.id as answer_id,
        a.answer_value,
        a.is_active as answer_is_active
        FROM Questions q
        LEFT JOIN Answers a ON a.question_id = q.id
          AND a.institution_id = $2
          AND a.is_active = TRUE
          AND a.assessment_id IS NULL
      ` : 'FROM Questions q'}
      WHERE q.parent_question_id = $1
      ORDER BY q.created_at
    `, include_answers === 'true' && institution_id ? [id, institution_id] : [id]);

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
// POST: إنشاء سؤال جديد
// ============================================
router.post('/', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  try {
    const {
      text_en,
      text_ar,
      question_type,
      parent_question_id,
      trigger_answer_value,
      composite_columns,
      options,
      weight,
      category_id,
      category // Legacy support
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!text_en || !text_ar || !question_type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Required fields: text_en, text_ar, question_type' 
      });
    }

    // التحقق من صحة نوع السؤال (مصدر واحد للحقيقة: constants/questionTypes.js)
    const typeValidation = validateQuestionType(question_type);
    if (!typeValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: typeValidation.error 
      });
    }

    // التحقق من الأسئلة المركبة
    if (question_type === 'Composite' && (!composite_columns || !Array.isArray(composite_columns))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Composite questions require composite_columns as array' 
      });
    }

    // التحقق من اختيار متعدد: يجب وجود خيارات
    if (question_type === 'MultiChoice') {
      const opts = options && typeof options === 'object' && !Array.isArray(options);
      const hasOptions = opts && Object.keys(options).filter(k => k !== '__other_options').length > 0;
      if (!hasOptions) {
        return res.status(400).json({ 
          success: false, 
          message: 'MultiChoice questions require at least one option (label -> points)' 
        });
      }
    }

    // التحقق من اختيار أكثر من إجابة (MultiSelect): خيارات كالمعتاد (يمكن إضافة خيار "أخرى" ليفتح إضافة عدة إجابات عند الإجابة)
    if (question_type === 'MultiSelect') {
      const opts = options && typeof options === 'object' && !Array.isArray(options);
      const mainKeys = opts ? Object.keys(options).filter(k => k !== '__other_options' && k !== '__otherOptionKey') : [];
      const hasOptions = mainKeys.length > 0;
      const correctCount = hasOptions ? mainKeys.filter(k => options[k] === 1 || options[k] === true).length : 0;
      if (!hasOptions) {
        return res.status(400).json({ 
          success: false, 
          message: 'MultiSelect questions require at least one option' 
        });
      }
      if (correctCount === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'MultiSelect questions require at least one correct option (value 1 or true)' 
        });
      }
    }

    // التحقق من الأسئلة الفرعية
    if (parent_question_id) {
      const parentCheck = await query(
        'SELECT id FROM Questions WHERE id = $1',
        [parent_question_id]
      );

      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Parent question not found' 
        });
      }

      if (!trigger_answer_value) {
        return res.status(400).json({ 
          success: false, 
          message: 'Child questions require trigger_answer_value' 
        });
      }
    }

    const hasMainOptions = options && typeof options === 'object' && !Array.isArray(options) && Object.keys(options).filter(k => k !== '__other_options').length > 0;
    const optionsVal = ((question_type === 'MultiChoice' || question_type === 'MultiSelect') && hasMainOptions)
      ? JSON.stringify(options)
      : null;

    // Handle category_id - if category (legacy) is provided, try to find category_id
    let finalCategoryId = category_id || null;
    if (!finalCategoryId && category) {
      const categoryResult = await query(
        'SELECT id FROM master_categories WHERE name_en ILIKE $1 OR name_ar ILIKE $1 LIMIT 1',
        [category]
      );
      if (categoryResult.rows.length > 0) {
        finalCategoryId = categoryResult.rows[0].id;
      }
    }

    const result = await query(`
      INSERT INTO Questions (
        text_en, text_ar, question_type,
        parent_question_id, trigger_answer_value,
        composite_columns, options, weight, category_id, category
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      text_en,
      text_ar,
      question_type,
      parent_question_id || null,
      trigger_answer_value || null,
      composite_columns ? JSON.stringify(composite_columns) : null,
      optionsVal,
      weight || 1,
      finalCategoryId,
      category || null // Keep for backward compatibility
    ]);

    const row = result.rows[0];
    await logAudit(pool, 'Questions', row.id, 'INSERT', null, { text_ar: row.text_ar, question_type: row.question_type, weight: row.weight }, performedBy(req));

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      question: row
    });

  } catch (error) {
    console.error('Error creating question:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({ 
        success: false, 
        message: 'Question already exists (duplicate)' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to create question',
      error: error.message 
    });
  }
});

// ============================================
// PUT: تحديث سؤال
// ============================================
router.put('/:id', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      text_en,
      text_ar,
      question_type,
      parent_question_id,
      trigger_answer_value,
      composite_columns,
      options,
      weight,
      category_id,
      category, // Legacy support
      is_active
    } = req.body;

    // التحقق من وجود السؤال والحصول على القيم القديمة للتدقيق
    const oldResult = await query('SELECT id, text_ar, question_type, weight, is_active FROM Questions WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question not found' 
      });
    }
    const oldRow = oldResult.rows[0];

    // إذا تم إرسال question_type، التحقق من صحته قبل التحديث
    if (question_type !== undefined && question_type !== null) {
      const typeValidation = validateQuestionType(question_type);
      if (!typeValidation.valid) {
        return res.status(400).json({ success: false, message: typeValidation.error });
      }
    }

    // Handle category_id - if category (legacy) is provided, try to find category_id
    let finalCategoryId = category_id;
    if (finalCategoryId === undefined && category) {
      const categoryResult = await query(
        'SELECT id FROM master_categories WHERE name_en ILIKE $1 OR name_ar ILIKE $1 LIMIT 1',
        [category]
      );
      if (categoryResult.rows.length > 0) {
        finalCategoryId = categoryResult.rows[0].id;
      }
    }

    const hasOpts = options !== undefined && options !== null && typeof options === 'object' && !Array.isArray(options);
    const hasMainOpts = hasOpts && Object.keys(options).filter(k => k !== '__other_options').length > 0;
    const hasOtherOpts = hasOpts && Array.isArray(options.__other_options) && options.__other_options.length > 0;
    const optionsVal = (options !== undefined && options !== null)
      ? (hasOpts && (hasMainOpts || hasOtherOpts) ? JSON.stringify(options) : null)
      : undefined;

    const result = await query(`
      UPDATE Questions SET
        text_en = COALESCE($1, text_en),
        text_ar = COALESCE($2, text_ar),
        question_type = COALESCE($3, question_type),
        parent_question_id = $4,
        trigger_answer_value = $5,
        composite_columns = COALESCE($6, composite_columns),
        options = COALESCE($7, options),
        weight = COALESCE($8, weight),
        category_id = COALESCE($9, category_id),
        category = COALESCE($10, category),
        is_active = COALESCE($11, is_active),
        updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `, [
      text_en, text_ar, question_type,
      parent_question_id, trigger_answer_value,
      composite_columns ? JSON.stringify(composite_columns) : null,
      optionsVal !== undefined ? optionsVal : null,
      weight, finalCategoryId, category, is_active,
      id
    ]);

    const newRow = result.rows[0];
    await logAudit(pool, 'Questions', parseInt(id), 'UPDATE', { text_ar: oldRow.text_ar, question_type: oldRow.question_type, is_active: oldRow.is_active }, { text_ar: newRow.text_ar, question_type: newRow.question_type, is_active: newRow.is_active }, performedBy(req));

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
// DELETE: حذف سؤال (Soft delete)
// ============================================
router.delete('/:id', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // التحقق من وجود السؤال والحصول على القيم القديمة للتدقيق
    const oldResult = await query('SELECT id, text_ar, is_active FROM Questions WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question not found' 
      });
    }

    // التحقق من وجود إجابات مرتبطة
    const answersCheck = await query(
      'SELECT COUNT(*) as count FROM Answers WHERE question_id = $1 AND is_active = TRUE',
      [id]
    );

    if (parseInt(answersCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete question with active answers. Deactivate it instead.',
        active_answers_count: answersCheck.rows[0].count
      });
    }

    // Soft delete
    const result = await query(`
      UPDATE Questions 
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1 
      RETURNING id
    `, [id]);

    await logAudit(pool, 'Questions', parseInt(id), 'UPDATE', { is_active: oldResult.rows[0].is_active }, { is_active: false }, performedBy(req));

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

// ============================================
// GET: الحصول على فئات الأسئلة
// ============================================
router.get('/meta/categories', authenticateToken, async (req, res) => {
  try {
    // Get categories from master_categories with usage counts
    const result = await query(`
      SELECT 
        mc.id,
        mc.name_en,
        mc.name_ar,
        COUNT(DISTINCT q.id) as count,
        mc.is_active
      FROM master_categories mc
      LEFT JOIN Questions q ON q.category_id = mc.id AND q.is_active = TRUE
      WHERE mc.is_active = TRUE
      GROUP BY mc.id, mc.name_en, mc.name_ar, mc.is_active
      HAVING COUNT(DISTINCT q.id) > 0
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
