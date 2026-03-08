import express from 'express';
import { query } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Calculate maturity score for an assessment
export function calculateMaturityScore(assessmentData) {
  let score = 0;
  let maxScore = 100;
  const risks = [];

  // Step 1: General Info (10 points)
  const step1 = assessmentData.step1 || {};
  if (step1.total_employees > 0) {
    const itRatio = (step1.it_staff || 0) / step1.total_employees;
    const cyberRatio = (step1.cybersecurity_staff || 0) / step1.total_employees;
    
    if (itRatio >= 0.05) score += 5; // At least 5% IT staff
    if (cyberRatio >= 0.01) score += 5; // At least 1% cyber staff
    else risks.push('Insufficient cybersecurity staffing (< 1% of total employees)');
  }

  // Step 2: Infrastructure (20 points)
  const step2 = assessmentData.step2 || {};
  if (step2.has_infrastructure === 'yes') {
    if (step2.data_center_count > 0) score += 5;
    if (step2.network_types && step2.network_types.length > 0) score += 5;
    if (step2.inventory && step2.inventory.length >= 3) score += 10; // Has routers, switches, firewall
    else risks.push('Limited network infrastructure inventory');
  }

  // Step 3: Digital Services (20 points)
  const step3 = assessmentData.step3 || {};
  if (step3.services && step3.services.length > 0) score += 5;
  if (step3.website_management === 'internal') score += 5;
  if (step3.domain_type === '.gov.iq') score += 5;
  if (step3.email_infrastructure === 'internal') score += 5;

  // Step 4: Cybersecurity (30 points) - MOST IMPORTANT
  const step4 = assessmentData.step4 || {};
  const compliance = step4.compliance || [];
  const securityTools = step4.security_tools || [];

  if (compliance.includes('ISO 27001')) score += 5;
  if (compliance.includes('NIST')) score += 5;
  if (compliance.length === 0) risks.push('No cybersecurity compliance frameworks implemented');

  // Critical security tools
  const criticalTools = ['firewall', 'ids_ips', 'backup', 'mfa'];
  const hasCriticalTools = criticalTools.filter(tool => securityTools.includes(tool));
  score += hasCriticalTools.length * 2.5; // 10 points total for critical tools

  if (!securityTools.includes('mfa')) risks.push('Multi-Factor Authentication (MFA) not implemented');
  if (!securityTools.includes('backup')) risks.push('No backup solution implemented');
  if (!securityTools.includes('firewall')) risks.push('No firewall protection');

  // Other security tools
  const otherTools = ['iam', 'siem', 'dlp', 'endpoint_protection'];
  const hasOtherTools = otherTools.filter(tool => securityTools.includes(tool));
  score += hasOtherTools.length * 2.5; // 10 points total

  // Step 5: Monitoring & Approvals (10 points)
  const step5 = assessmentData.step5 || {};
  if (step5.security_approval === 'yes') score += 5;
  else risks.push('No security approval obtained');
  if (step5.nda_signed === 'yes') score += 2;
  if (step5.reporting_frequency === 'quarterly') score += 3;
  else if (step5.reporting_frequency === 'yearly') score += 1;

  // Step 6: Advanced Technical (10 points)
  const step6 = assessmentData.step6 || {};
  if (step6.uses_virtualization === 'yes') score += 2;
  if (step6.has_vpn === 'yes') score += 2;
  if (step6.api_integration === 'yes') score += 2;
  if (step6.pentesting_frequency && step6.pentesting_frequency !== 'never') score += 2;
  else risks.push('No penetration testing performed');
  if (step6.has_soc === 'yes' || step6.has_noc === 'yes') score += 2;

  // Determine risk level
  let riskLevel = 'low';
  if (score < 40) riskLevel = 'critical';
  else if (score < 60) riskLevel = 'high';
  else if (score < 80) riskLevel = 'medium';

  return {
    score: Math.round(score * 10) / 10,
    maxScore,
    percentage: Math.round((score / maxScore) * 100),
    riskLevel,
    risks
  };
}

// Get maturity score for specific assessment
router.get('/maturity-score/:assessmentId', authenticateToken, async (req, res) => {
  try {
    const { assessmentId } = req.params;

    // Get all assessment data
    const dataResult = await query(
      `SELECT step_number, data FROM assessment_data 
       WHERE assessment_id = $1 
       ORDER BY step_number`,
      [assessmentId]
    );

    if (dataResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment data not found' });
    }

    // Organize data by step
    const assessmentData = {};
    dataResult.rows.forEach(row => {
      assessmentData[`step${row.step_number}`] = row.data;
    });

    // Calculate score
    const scoreData = calculateMaturityScore(assessmentData);

    // Update assessment with calculated score
    await query(
      `UPDATE assessments 
       SET maturity_score = $1, risk_level = $2 
       WHERE id = $3`,
      [scoreData.score, scoreData.riskLevel, assessmentId]
    );

    res.json(scoreData);
  } catch (error) {
    console.error('Calculate maturity score error:', error);
    res.status(500).json({ error: 'Failed to calculate maturity score' });
  }
});

// Get entity summary statistics
router.get('/entity-summary/:entityId', authenticateToken, async (req, res) => {
  try {
    const { entityId } = req.params;

    // Get entity assessments summary
    const result = await query(
      `SELECT 
        COUNT(*) as total_assessments,
        AVG(maturity_score) as avg_maturity_score,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE risk_level = 'critical') as critical_risk_count,
        COUNT(*) FILTER (WHERE risk_level = 'high') as high_risk_count,
        MAX(submitted_at) as last_assessment_date
       FROM assessments
       WHERE entity_id = $1`,
      [entityId]
    );

    // Get trend data (last 4 quarters)
    const trendResult = await query(
      `SELECT year, quarter, AVG(maturity_score) as avg_score
       FROM assessments
       WHERE entity_id = $1 AND status = 'approved'
       GROUP BY year, quarter
       ORDER BY year DESC, quarter DESC
       LIMIT 4`,
      [entityId]
    );

    res.json({
      summary: result.rows[0],
      trend: trendResult.rows
    });
  } catch (error) {
    console.error('Get entity summary error:', error);
    res.status(500).json({ error: 'Failed to fetch entity summary' });
  }
});

// Get comparison data across entities
router.get('/comparison', authenticateToken, async (req, res) => {
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

    res.json({ comparison: result.rows });
  } catch (error) {
    console.error('Get comparison error:', error);
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
});

// Get ministry dashboard (for parent entities)
router.get('/ministry-dashboard/:ministryId', authenticateToken, async (req, res) => {
  try {
    const { ministryId } = req.params;

    // Get all child entities with their latest assessment
    const result = await query(
      `SELECT 
        e.id,
        e.name,
        e.name_ar,
        e.activity_type,
        (SELECT maturity_score FROM assessments WHERE entity_id = e.id ORDER BY submitted_at DESC, created_at DESC LIMIT 1) as maturity_score,
        (SELECT risk_level FROM assessments WHERE entity_id = e.id ORDER BY submitted_at DESC, created_at DESC LIMIT 1) as risk_level,
        (SELECT status FROM assessments WHERE entity_id = e.id ORDER BY submitted_at DESC, created_at DESC LIMIT 1) as last_assessment_status,
        (SELECT submitted_at FROM assessments WHERE entity_id = e.id ORDER BY submitted_at DESC, created_at DESC LIMIT 1) as last_assessment_date,
        (SELECT COUNT(*) FROM assessments WHERE entity_id = e.id) as total_assessments
      FROM entities e
      WHERE e.parent_entity_id = $1
      ORDER BY e.name`,
      [ministryId]
    );

    // Get ministry-wide statistics
    const statsResult = await query(
      `SELECT 
        COUNT(DISTINCT a.entity_id) as entities_with_assessments,
        COUNT(a.id) as total_assessments,
        AVG(a.maturity_score) as avg_maturity_score,
        COUNT(*) FILTER (WHERE a.risk_level = 'critical') as critical_count,
        COUNT(*) FILTER (WHERE a.risk_level = 'high') as high_count,
        COUNT(*) FILTER (WHERE a.risk_level = 'medium') as medium_count,
        COUNT(*) FILTER (WHERE a.risk_level = 'low') as low_count
       FROM assessments a
       JOIN entities e ON a.entity_id = e.id
       WHERE e.parent_entity_id = $1 AND a.status = 'approved'`,
      [ministryId]
    );

    res.json({
      entities: result.rows,
      ministry_statistics: statsResult.rows[0] || {
        entities_with_assessments: 0,
        total_assessments: 0,
        avg_maturity_score: null,
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        low_count: 0
      }
    });
  } catch (error) {
    console.error('Get ministry dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch ministry dashboard', details: error.message });
  }
});

export default router;
