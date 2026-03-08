import express from 'express';
import { query } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import generateAssessmentPDF from '../utils/pdfGeneratorNew.js';
import { generateExcelExport, generateEntityComparisonExcel } from '../utils/excelGenerator.js';
import XLSX from 'xlsx';

const router = express.Router();

// Export single assessment as PDF
router.get('/pdf/:assessmentId', authenticateToken, async (req, res) => {
  try {
    const { assessmentId } = req.params;

    // Get assessment with entity info
    const assessmentResult = await query(
      `SELECT a.*, e.name, e.name_ar, e.activity_type
       FROM assessments a
       JOIN entities e ON a.entity_id = e.id
       WHERE a.id = $1`,
      [assessmentId]
    );

    if (assessmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessment = assessmentResult.rows[0];
    const entity = {
      name: assessment.name,
      name_ar: assessment.name_ar,
      activity_type: assessment.activity_type
    };

    // Get all assessment data
    const dataResult = await query(
      `SELECT step_number, data FROM assessment_data 
       WHERE assessment_id = $1 
       ORDER BY step_number`,
      [assessmentId]
    );

    const assessmentData = {};
    dataResult.rows.forEach(row => {
      assessmentData[`step${row.step_number}`] = row.data;
    });

    // Generate PDF
    const pdfBuffer = await generateAssessmentPDF(assessment, assessmentData, entity);

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="assessment_${assessmentId}_${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Export multiple assessments as Excel
router.get('/excel', authenticateToken, async (req, res) => {
  try {
    const { entity_id, year, status } = req.query;

    // Build query based on user role and filters
    let queryText = `
      SELECT a.*, e.name, e.name_ar, e.activity_type
      FROM assessments a
      JOIN entities e ON a.entity_id = e.id
      WHERE 1=1
    `;
    let params = [];
    let paramCount = 0;

    // Role-based filtering
    if (req.user.role === 'entity_user') {
      queryText += ` AND a.entity_id = $${++paramCount}`;
      params.push(req.user.entity_id);
    } else if (req.user.role === 'ministry_admin') {
      queryText += ` AND a.entity_id IN (
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
    if (entity_id) {
      queryText += ` AND a.entity_id = $${++paramCount}`;
      params.push(entity_id);
    }
    if (year) {
      queryText += ` AND a.year = $${++paramCount}`;
      params.push(year);
    }
    if (status) {
      queryText += ` AND a.status = $${++paramCount}`;
      params.push(status);
    }

    queryText += ` ORDER BY a.created_at DESC`;

    const assessmentsResult = await query(queryText, params);
    const assessments = assessmentsResult.rows;

    if (assessments.length === 0) {
      return res.status(404).json({ error: 'No assessments found' });
    }

    // Get all assessment data
    const assessmentIds = assessments.map(a => a.id);
    const dataResult = await query(
      `SELECT assessment_id, step_number, data 
       FROM assessment_data 
       WHERE assessment_id = ANY($1)
       ORDER BY assessment_id, step_number`,
      [assessmentIds]
    );

    // Organize data by assessment
    const assessmentDataMap = {};
    dataResult.rows.forEach(row => {
      if (!assessmentDataMap[row.assessment_id]) {
        assessmentDataMap[row.assessment_id] = {};
      }
      assessmentDataMap[row.assessment_id][`step${row.step_number}`] = row.data;
    });

    // Create entities map
    const entitiesMap = {};
    assessments.forEach(a => {
      entitiesMap[a.entity_id] = {
        name: a.name,
        name_ar: a.name_ar,
        activity_type: a.activity_type
      };
    });

    // Generate Excel
    const workbook = generateExcelExport(assessments, assessmentDataMap, entitiesMap);
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="assessments_export_${Date.now()}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Failed to generate Excel export' });
  }
});

// Export entity comparison as Excel
router.get('/comparison-excel', authenticateToken, async (req, res) => {
  try {
    const { parent_entity_id } = req.query;

    let queryText = `
      SELECT 
        e.id,
        e.name,
        e.name_ar,
        COUNT(a.id) as assessment_count,
        AVG(a.maturity_score) as avg_maturity_score,
        MAX(a.maturity_score) as max_maturity_score,
        MIN(a.maturity_score) as min_maturity_score,
        COUNT(*) FILTER (WHERE a.risk_level = 'critical') as critical_count,
        COUNT(*) FILTER (WHERE a.risk_level = 'high') as high_count
      FROM entities e
      LEFT JOIN assessments a ON e.id = a.entity_id AND a.status = 'approved'
    `;

    let params = [];
    if (parent_entity_id) {
      queryText += ` WHERE e.parent_entity_id = $1`;
      params.push(parent_entity_id);
    }

    queryText += ` GROUP BY e.id, e.name, e.name_ar ORDER BY avg_maturity_score DESC`;

    const result = await query(queryText, params);
    const comparisonData = result.rows;

    if (comparisonData.length === 0) {
      return res.status(404).json({ error: 'No data found for comparison' });
    }

    // Generate Excel
    const workbook = generateEntityComparisonExcel(comparisonData);
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="entity_comparison_${Date.now()}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Comparison Excel export error:', error);
    res.status(500).json({ error: 'Failed to generate comparison Excel' });
  }
});

export default router;
