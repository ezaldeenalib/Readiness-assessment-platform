/**
 * Answers Management Routes
 * إدارة الإجابات - نظام جديد مع AuditLog
 */

import express from 'express';
import { query, transaction } from '../database/db.js';
import pool from '../database/db.js';
import { authenticateToken, checkEntityAccess } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// Helper Function: تسجيل في AuditLog
// ============================================
async function logAudit(client, tableName, recordId, operationType, oldValue, newValue, performedBy) {
  await client.query(`
    INSERT INTO AuditLog (table_name, record_id, operation_type, old_value, new_value, performed_by)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [tableName, recordId, operationType, oldValue, newValue, performedBy]);
}

// ============================================
// GET: الحصول على إجابات مؤسسة معينة
// ============================================
router.get('/institution/:institutionId', authenticateToken, async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { question_id, assessment_id, active_only = 'true' } = req.query;

    // التحقق من الصلاحيات
    if (req.user.role === 'entity_user' && req.user.entity_id !== parseInt(institutionId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    let sql = `
      SELECT 
        a.id,
        a.institution_id,
        a.template_id,
        a.question_id,
        a.answer_value,
        a.is_active,
        a.valid_from,
        a.valid_to,
        a.assessment_id,
        a.created_at,
        q.id as question_id,
        q.text_en as question_text_en,
        q.text_ar as question_text_ar,
        q.question_type
      FROM Answers a
      JOIN Questions q ON a.question_id = q.id
      WHERE a.institution_id = $1
    `;

    const params = [institutionId];
    let paramCount = 1;

    if (active_only === 'true') {
      sql += ` AND a.is_active = TRUE`;
    }

    if (question_id) {
      paramCount++;
      sql += ` AND a.question_id = $${paramCount}`;
      params.push(question_id);
    }

    if (assessment_id) {
      paramCount++;
      sql += ` AND a.assessment_id = $${paramCount}`;
      params.push(assessment_id);
    } else {
      // إذا لم يتم تحديد assessment_id، نرجع فقط الإجابات غير المرتبطة بـ snapshot
      sql += ` AND a.assessment_id IS NULL`;
    }

    sql += ` ORDER BY a.valid_from DESC, a.created_at DESC`;

    const result = await query(sql, params);

    res.json({
      success: true,
      count: result.rows.length,
      answers: result.rows
    });

  } catch (error) {
    console.error('Error fetching answers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch answers',
      error: error.message 
    });
  }
});

// ============================================
// GET: الحصول على إجابة محددة
// ============================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        a.*,
        q.id as question_id,
        q.text_en as question_text_en,
        q.text_ar as question_text_ar,
        q.question_type
      FROM Answers a
      JOIN Questions q ON a.question_id = q.id
      WHERE a.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Answer not found' 
      });
    }

    res.json({
      success: true,
      answer: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching answer:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch answer',
      error: error.message 
    });
  }
});

// ============================================
// POST: إضافة إجابة جديدة أو تحديث إجابة موجودة
// ============================================
router.post('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      institution_id,
      template_id,
      question_id,
      answer_value
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!institution_id || !question_id || answer_value === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Required fields: institution_id, question_id, answer_value' 
      });
    }

    // التحقق من الصلاحيات
    if (req.user.role === 'entity_user' && req.user.entity_id !== institution_id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // التحقق من وجود السؤال
    const questionCheck = await client.query(
      'SELECT id, question_type FROM Questions WHERE id = $1 AND is_active = TRUE',
      [question_id]
    );

    if (questionCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Question not found or inactive' 
      });
    }

    const performedBy = req.user.email || req.user.full_name || 'system';

    // البحث عن إجابة نشطة موجودة
    const existingAnswer = await client.query(`
      SELECT id, answer_value
      FROM Answers
      WHERE question_id = $1
        AND institution_id = $2
        AND is_active = TRUE
        AND assessment_id IS NULL
      ORDER BY valid_from DESC
      LIMIT 1
    `, [question_id, institution_id]);

    let oldAnswerId = null;
    let oldAnswerValue = null;

    // إذا كانت هناك إجابة موجودة، قم بتعطيلها
    if (existingAnswer.rows.length > 0) {
      oldAnswerId = existingAnswer.rows[0].id;
      oldAnswerValue = existingAnswer.rows[0].answer_value;

      await client.query(`
        UPDATE Answers
        SET is_active = FALSE,
            valid_to = NOW()
        WHERE id = $1
      `, [oldAnswerId]);

      // تسجيل تعطيل الإجابة القديمة
      await logAudit(
        client,
        'Answers',
        oldAnswerId,
        'UPDATE',
        JSON.stringify({ answer_value: oldAnswerValue, is_active: true }),
        JSON.stringify({ answer_value: oldAnswerValue, is_active: false }),
        performedBy
      );
    }

    // إضافة الإجابة الجديدة
    const newAnswer = await client.query(`
      INSERT INTO Answers (
        institution_id,
        template_id,
        question_id,
        answer_value,
        is_active,
        valid_from,
        created_at
      )
      VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
      RETURNING *
    `, [
      institution_id,
      template_id || null,
      question_id,
      typeof answer_value === 'string' ? answer_value : JSON.stringify(answer_value)
    ]);

    const newAnswerId = newAnswer.rows[0].id;

    // تسجيل إضافة الإجابة الجديدة
    await logAudit(
      client,
      'Answers',
      newAnswerId,
      'INSERT',
      oldAnswerValue ? JSON.stringify({ answer_value: oldAnswerValue }) : null,
      JSON.stringify({ answer_value: newAnswer.rows[0].answer_value }),
      performedBy
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Answer saved successfully',
      answer: newAnswer.rows[0],
      previous_answer_id: oldAnswerId
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving answer:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save answer',
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// ============================================
// DELETE: مسح إجابة
// ============================================
router.delete('/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // الحصول على الإجابة القديمة
    const oldAnswer = await client.query(`
      SELECT a.*, q.id as question_id
      FROM Answers a
      JOIN Questions q ON a.question_id = q.id
      WHERE a.id = $1
    `, [id]);

    if (oldAnswer.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Answer not found' 
      });
    }

    const answer = oldAnswer.rows[0];

    // التحقق من الصلاحيات
    if (req.user.role === 'entity_user' && req.user.entity_id !== answer.institution_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // لا يمكن حذف إجابات مرتبطة بـ snapshot
    if (answer.assessment_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete answers linked to assessment snapshot' 
      });
    }

    const performedBy = req.user.email || req.user.full_name || 'system';

    // حذف الإجابة
    await client.query('DELETE FROM Answers WHERE id = $1', [id]);

    // تسجيل العملية في AuditLog
    await logAudit(
      client,
      'Answers',
      parseInt(id),
      'DELETE',
      JSON.stringify({
        institution_id: answer.institution_id,
        question_id: answer.question_id,
        answer_value: answer.answer_value
      }),
      null,
      performedBy
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Answer deleted successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting answer:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete answer',
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// ============================================
// GET: الحصول على سجل AuditLog
// ============================================
router.get('/audit/:institutionId', authenticateToken, async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { table_name, operation_type, limit = 100 } = req.query;

    // التحقق من الصلاحيات
    if (req.user.role === 'entity_user' && req.user.entity_id !== parseInt(institutionId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    let sql = `
      SELECT 
        al.*,
        a.question_id,
        q.code as question_code
      FROM AuditLog al
      LEFT JOIN Answers a ON al.table_name = 'Answers' AND al.record_id = a.id
      LEFT JOIN Questions q ON a.question_id = q.id
      WHERE al.table_name = 'Answers'
        AND EXISTS (
          SELECT 1 FROM Answers a2 
          WHERE a2.id = al.record_id 
          AND a2.institution_id = $1
        )
    `;

    const params = [institutionId];
    let paramCount = 1;

    if (operation_type) {
      paramCount++;
      sql += ` AND al.operation_type = $${paramCount}`;
      params.push(operation_type);
    }

    sql += ` ORDER BY al.performed_at DESC LIMIT $${++paramCount}`;
    params.push(parseInt(limit));

    const result = await query(sql, params);

    res.json({
      success: true,
      count: result.rows.length,
      audit_logs: result.rows
    });

  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch audit log',
      error: error.message 
    });
  }
});

export default router;
