import express from 'express';
import crypto from 'crypto';
import { query, transaction } from '../database/db.js';
import pool from '../database/db.js';
import { authenticateToken, checkEntityAccess } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLog.js';
import { validateStepData } from '../utils/stepSchemas.js';

const router = express.Router();

function performedBy(req) {
  return req.user?.email || req.user?.full_name || String(req.user?.id ?? 'system');
}

// Get all assessments for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, year, entity_id } = req.query;
    let queryText = `SELECT * FROM assessment_summary WHERE 1=1`;
    let params = [];
    let paramCount = 0;

    // Filter by entity access
    if (req.user.role === 'entity_user') {
      queryText += ` AND entity_id = $${++paramCount}`;
      params.push(req.user.entity_id);
    } else if (req.user.role === 'ministry_admin') {
      // Ministry admin can see their ministry and children
      queryText += ` AND entity_id IN (
        WITH RECURSIVE entity_tree AS (
          SELECT id FROM entities WHERE id = $${++paramCount}
          UNION ALL
          SELECT e.id FROM entities e
          JOIN entity_tree et ON e.parent_entity_id = et.id
        )
        SELECT id FROM entity_tree
      )`;
      params.push(req.user.entity_id);
    }

    // Additional filters
    if (status) {
      queryText += ` AND status = $${++paramCount}`;
      params.push(status);
    }
    if (year) {
      queryText += ` AND year = $${++paramCount}`;
      params.push(year);
    }
    if (entity_id) {
      queryText += ` AND entity_id = $${++paramCount}`;
      params.push(entity_id);
    }

    queryText += ` ORDER BY created_at DESC`;

    const result = await query(queryText, params);
    res.json({ assessments: result.rows });
  } catch (error) {
    console.error('Get assessments error:', error);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

// Get assessment by ID with all data
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { include_snapshot = 'false' } = req.query;

    const assessmentResult = await query(
      `SELECT a.*, e.name as entity_name, e.name_ar as entity_name_ar
       FROM assessments a
       JOIN entities e ON a.entity_id = e.id
       WHERE a.id = $1`,
      [id]
    );

    if (assessmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessment = assessmentResult.rows[0];

    // V-02: ownership check — entity_user can only access own entity's assessments
    if (req.user.role === 'entity_user') {
      const allowed = req.user.institutions?.length > 0
        ? req.user.institutions
        : (req.user.entity_id != null ? [req.user.entity_id] : []);
      if (!allowed.includes(assessment.entity_id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (req.user.role === 'ministry_admin') {
      const treeCheck = await query(
        `WITH RECURSIVE entity_tree AS (
          SELECT id FROM entities WHERE id = $1
          UNION ALL
          SELECT e.id FROM entities e JOIN entity_tree et ON e.parent_entity_id = et.id
        ) SELECT id FROM entity_tree WHERE id = $2`,
        [req.user.entity_id, assessment.entity_id]
      );
      if (treeCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get all step data (legacy)
    const dataResult = await query(
      `SELECT step_number, data FROM assessment_data 
       WHERE assessment_id = $1 
       ORDER BY step_number`,
      [id]
    );

    // Organize data by step
    const stepData = {};
    dataResult.rows.forEach(row => {
      stepData[`step${row.step_number}`] = row.data;
    });

    const response = { 
      assessment,
      data: stepData
    };

    // Include snapshot answers if requested
    if (include_snapshot === 'true') {
      const snapshotResult = await query(`
        SELECT 
          qa.id,
          qa.question_id,
          qa.answer_value,
          q.id as question_id,
          q.question_text as question_text_en,
          q.question_text_ar as question_text_ar,
          q.question_type
        FROM question_answers qa
        JOIN template_assessments ta ON qa.template_assessment_id = ta.id
        JOIN questions q ON qa.question_id = q.id
        WHERE ta.assessment_id = $1
        ORDER BY q.category, q.created_at
      `, [id]);

      response.snapshot_answers = snapshotResult.rows;
    }

    res.json(response);
  } catch (error) {
    console.error('Get assessment error:', error);
    res.status(500).json({ error: 'Failed to fetch assessment' });
  }
});

// Create new assessment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { entity_id, year, quarter } = req.body;

    if (!entity_id || !year) {
      return res.status(400).json({ error: 'Entity ID and year are required' });
    }

    // Check if user has access to this entity
    if (req.user.role === 'entity_user' && req.user.entity_id !== entity_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `INSERT INTO assessments (entity_id, created_by, year, quarter, status)
       VALUES ($1, $2, $3, $4, 'draft')
       RETURNING *`,
      [entity_id, req.user.id, year, quarter]
    );

    const assessment = result.rows[0];
    await logAudit(pool, 'assessments', assessment.id, 'INSERT', null, { entity_id: assessment.entity_id, year: assessment.year, quarter: assessment.quarter, status: assessment.status }, performedBy(req));

    res.status(201).json({
      message: 'Assessment created successfully',
      assessment
    });
  } catch (error) {
    console.error('Create assessment error:', error);
    res.status(500).json({ error: 'Failed to create assessment' });
  }
});

// Update assessment step data
router.put('/:id/step/:stepNumber', authenticateToken, async (req, res) => {
  try {
    const { id, stepNumber } = req.params;
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Step data is required' });
    }

    const step = parseInt(stepNumber);
    if (step < 1 || step > 7) {
      return res.status(400).json({ error: 'Step number must be between 1 and 7' });
    }

    // V-13: validate step data against schema
    const validation = validateStepData(step, data);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid step data', details: validation.error });
    }

    // Check if assessment exists and user has access
    const assessmentResult = await query(
      `SELECT entity_id, status FROM assessments WHERE id = $1`,
      [id]
    );

    if (assessmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessment = assessmentResult.rows[0];

    // Check access
    if (req.user.role === 'entity_user' && req.user.entity_id !== assessment.entity_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if assessment is editable
    if (assessment.status === 'approved') {
      return res.status(400).json({ error: 'Cannot edit approved assessment' });
    }

    const existingStep = await query(
      'SELECT id, assessment_id, step_number, data FROM assessment_data WHERE assessment_id = $1 AND step_number = $2',
      [id, step]
    );

    // Upsert step data
    const result = await query(
      `INSERT INTO assessment_data (assessment_id, step_number, data)
       VALUES ($1, $2, $3)
       ON CONFLICT (assessment_id, step_number)
       DO UPDATE SET data = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, step, JSON.stringify(data)]
    );

    const row = result.rows[0];
    if (existingStep.rows.length > 0) {
      await logAudit(pool, 'assessment_data', row.id, 'UPDATE', { step_number: existingStep.rows[0].step_number, data: existingStep.rows[0].data }, { step_number: row.step_number, data: row.data }, performedBy(req));
    } else {
      await logAudit(pool, 'assessment_data', row.id, 'INSERT', null, { assessment_id: row.assessment_id, step_number: row.step_number, data: row.data }, performedBy(req));
    }

    res.json({
      message: 'Step data saved successfully',
      step_data: row
    });
  } catch (error) {
    console.error('Update step error:', error);
    res.status(500).json({ error: 'Failed to update step data' });
  }
});

// Submit assessment
router.post('/:id/submit', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Check if all steps are completed
    const stepsResult = await client.query(
      `SELECT COUNT(*) as step_count FROM assessment_data WHERE assessment_id = $1`,
      [id]
    );

    if (parseInt(stepsResult.rows[0].step_count) < 6) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'All 6 steps must be completed before submission',
        completed_steps: parseInt(stepsResult.rows[0].step_count)
      });
    }

    // Get assessment info
    const assessmentResult = await client.query(
      `SELECT entity_id FROM assessments WHERE id = $1`,
      [id]
    );

    if (assessmentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const performedBy = req.user.email || req.user.full_name || 'system';

    // Create snapshot of all current answers
    await client.query(
      `SELECT create_assessment_snapshot($1, $2)`,
      [id, performedBy]
    );

    const oldAssessment = await client.query('SELECT id, status FROM assessments WHERE id = $1', [id]);

    // Update assessment status
    const result = await client.query(
      `UPDATE assessments 
       SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    const performedByUser = req.user?.email || req.user?.full_name || 'system';
    await logAudit(client, 'assessments', parseInt(id), 'UPDATE', { status: oldAssessment.rows[0].status }, { status: 'submitted' }, performedByUser);

    await client.query('COMMIT');

    res.json({
      message: 'Assessment submitted successfully with snapshot',
      assessment: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Submit assessment error:`, error);
    res.status(500).json({ error: 'An internal error occurred', errorId });
  } finally {
    client.release();
  }
});

// Create snapshot for assessment
router.post('/:id/snapshot', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Check if assessment exists
    const assessmentResult = await client.query(
      `SELECT entity_id FROM assessments WHERE id = $1`,
      [id]
    );

    if (assessmentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false,
        error: 'Assessment not found' 
      });
    }

    // Check access
    if (req.user.role === 'entity_user') {
      const entityCheck = await client.query(
        `SELECT entity_id FROM assessments WHERE id = $1`,
        [id]
      );
      
      if (entityCheck.rows[0].entity_id !== req.user.entity_id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ 
          success: false,
          error: 'Access denied' 
        });
      }
    }

    const performedBy = req.user.email || req.user.full_name || 'system';

    // Create snapshot
    await client.query(
      `SELECT create_assessment_snapshot($1, $2)`,
      [id, performedBy]
    );

    // Get snapshot count
    const snapshotCount = await client.query(
      `SELECT COUNT(*)::int as count
       FROM question_answers qa
       JOIN template_assessments ta ON qa.template_assessment_id = ta.id
       WHERE ta.assessment_id = $1`,
      [id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Snapshot created successfully',
      snapshot_count: parseInt(snapshotCount.rows[0].count)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Create snapshot error:`, error);
    res.status(500).json({ success: false, error: 'An internal error occurred', errorId });
  } finally {
    client.release();
  }
});

// Get assessment with snapshot answers
router.get('/:id/answers', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get assessment
    const assessmentResult = await query(
      `SELECT entity_id FROM assessments WHERE id = $1`,
      [id]
    );

    if (assessmentResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Assessment not found' 
      });
    }

    // Check access
    if (req.user.role === 'entity_user' && req.user.entity_id !== assessmentResult.rows[0].entity_id) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied' 
      });
    }

    // Get snapshot answers
    const answersResult = await query(`
      SELECT 
        qa.id,
        qa.question_id,
        qa.answer_value,
        qa.created_at,
        q.id as question_id,
        q.question_text as question_text_en,
        q.question_text_ar as question_text_ar,
        q.question_type,
        q.composite_columns
      FROM question_answers qa
      JOIN template_assessments ta ON qa.template_assessment_id = ta.id
      JOIN questions q ON qa.question_id = q.id
      WHERE ta.assessment_id = $1
      ORDER BY q.category, q.created_at
    `, [id]);

    res.json({
      success: true,
      count: answersResult.rows.length,
      answers: answersResult.rows
    });

  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Get assessment answers error:`, error);
    res.status(500).json({ success: false, error: 'An internal error occurred', errorId });
  }
});

// Approve/Reject assessment — V-11: positive role allowlist
router.post('/:id/review', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comments } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    // V-11: only super_admin and ministry_admin may review
    if (!['super_admin', 'ministry_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only admins can review assessments' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const oldResult = await query('SELECT id, status FROM assessments WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const result = await query(
      `UPDATE assessments 
       SET status = $1, approved_at = CURRENT_TIMESTAMP, approved_by = $2
       WHERE id = $3
       RETURNING *`,
      [newStatus, req.user.id, id]
    );

    await logAudit(pool, 'assessments', parseInt(id), 'UPDATE', { status: oldResult.rows[0].status }, { status: newStatus }, performedBy(req));

    res.json({
      message: `Assessment ${action}d successfully`,
      assessment: result.rows[0]
    });
  } catch (error) {
    console.error('Review assessment error:', error);
    res.status(500).json({ error: 'Failed to review assessment' });
  }
});

// Delete assessment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has permission
    const assessmentResult = await query(
      `SELECT id, entity_id, year, status FROM assessments WHERE id = $1`,
      [id]
    );

    if (assessmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessment = assessmentResult.rows[0];

    // Check access - entity users can only delete their own draft assessments
    // Super admins and ministry admins can delete any assessment
    if (req.user.role === 'entity_user') {
      if (req.user.entity_id !== assessment.entity_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      // Entity users can only delete draft assessments
      if (assessment.status !== 'draft') {
        return res.status(400).json({ error: 'Only draft assessments can be deleted' });
      }
    }

    await logAudit(pool, 'assessments', parseInt(id), 'DELETE', { entity_id: assessment.entity_id, year: assessment.year, status: assessment.status }, null, performedBy(req));

    await query('DELETE FROM assessments WHERE id = $1', [id]);

    res.json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error('Delete assessment error:', error);
    res.status(500).json({ error: 'Failed to delete assessment' });
  }
});

export default router;
