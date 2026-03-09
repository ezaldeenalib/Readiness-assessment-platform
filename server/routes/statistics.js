import express from 'express';
import { query } from '../database/db.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { checkPermission } from '../middleware/checkPermission.js';
import ExcelJS from 'exceljs'; // V-10: replaced xlsx with exceljs
import generateStatisticsReport from '../utils/statisticsPdfGenerator.js';

const router = express.Router();

// Get comprehensive statistics (for Super Admin only)
router.get('/comprehensive', authenticateToken, checkPermission('view_reports'), async (req, res) => {
  try {
    // 1. Get all completed assessments with entity info
    const assessmentsResult = await query(`
      SELECT 
        a.id, a.entity_id, a.year, a.quarter, a.status, a.maturity_score, a.risk_level,
        e.name, e.name_ar, e.activity_type, e.parent_entity_id,
        ad.step_number, ad.data
      FROM assessments a
      JOIN entities e ON a.entity_id = e.id
      LEFT JOIN assessment_data ad ON a.id = ad.assessment_id
      WHERE a.status IN ('submitted', 'approved')
      ORDER BY a.id, ad.step_number
    `);

    // 2. Get all entities
    const entitiesResult = await query(`
      SELECT id, name, name_ar, activity_type, parent_entity_id
      FROM entities
      WHERE is_active = true
    `);

    // 3. Process data
    const assessments = processAssessments(assessmentsResult.rows);
    const entities = entitiesResult.rows;
    
    // 4. Calculate statistics
    const stats = calculateComprehensiveStatistics(assessments, entities);

    res.json(stats);
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({ error: 'Failed to generate statistics' });
  }
});

// Get ministry-specific statistics
router.get('/ministry/:ministryId', authenticateToken, checkPermission('view_reports'), async (req, res) => {
  try {
    const { ministryId } = req.params;

    // Get ministry and its children
    const entitiesResult = await query(`
      WITH RECURSIVE entity_tree AS (
        SELECT id, name, name_ar, parent_entity_id
        FROM entities
        WHERE id = $1
        UNION ALL
        SELECT e.id, e.name, e.name_ar, e.parent_entity_id
        FROM entities e
        INNER JOIN entity_tree et ON e.parent_entity_id = et.id
      )
      SELECT * FROM entity_tree
    `, [ministryId]);

    const entityIds = entitiesResult.rows.map(e => e.id);

    // Get assessments for ministry and children
    const assessmentsResult = await query(`
      SELECT 
        a.id, a.entity_id, a.year, a.quarter, a.status, a.maturity_score,
        e.name, e.name_ar,
        ad.step_number, ad.data
      FROM assessments a
      JOIN entities e ON a.entity_id = e.id
      LEFT JOIN assessment_data ad ON a.id = ad.assessment_id
      WHERE a.entity_id = ANY($1) AND a.status IN ('submitted', 'approved')
      ORDER BY a.id, ad.step_number
    `, [entityIds]);

    const assessments = processAssessments(assessmentsResult.rows);
    const stats = calculateMinistryStatistics(assessments, entitiesResult.rows);

    res.json(stats);
  } catch (error) {
    console.error('Ministry statistics error:', error);
    res.status(500).json({ error: 'Failed to generate ministry statistics' });
  }
});

// Helper function to process assessments
function processAssessments(rows) {
  const assessmentsMap = new Map();

  rows.forEach(row => {
    if (!assessmentsMap.has(row.id)) {
      assessmentsMap.set(row.id, {
        id: row.id,
        entity_id: row.entity_id,
        entity_name: row.name_ar || row.name,
        year: row.year,
        quarter: row.quarter,
        status: row.status,
        maturity_score: row.maturity_score,
        risk_level: row.risk_level,
        activity_type: row.activity_type,
        parent_entity_id: row.parent_entity_id,
        data: {}
      });
    }

    if (row.step_number) {
      assessmentsMap.get(row.id).data[`step${row.step_number}`] = row.data;
    }
  });

  return Array.from(assessmentsMap.values());
}

// Main statistics calculation function
function calculateComprehensiveStatistics(assessments, entities) {
  const stats = {
    summary: {
      total_entities: entities.length,
      total_ministries: entities.filter(e => !e.parent_entity_id).length,
      total_branches: entities.filter(e => e.parent_entity_id).length,
      total_assessments: assessments.length,
      total_completed: assessments.filter(a => a.status === 'approved').length,
      average_maturity_score: calculateAverage(assessments.map(a => a.maturity_score)),
    },
    workforce: analyzeWorkforce(assessments),
    compliance: analyzeCompliance(assessments),
    digitalTransformation: analyzeDigitalTransformation(assessments),
    criticalGaps: analyzeCriticalGaps(assessments),
    infrastructure: analyzeInfrastructure(assessments),
    securityTools: analyzeSecurityTools(assessments),
    riskDistribution: analyzeRiskDistribution(assessments),
    entitiesComparison: compareEntities(assessments),
    recommendations: generateRecommendations(assessments),
    trends: analyzeTrends(assessments),
  };

  return stats;
}

// 1. Workforce Analysis
function analyzeWorkforce(assessments) {
  const workforceData = assessments.map(a => {
    const step1 = a.data.step1 || {};
    const total = parseInt(step1.total_employees) || 0;
    const cyber = parseInt(step1.cybersecurity_staff) || 0;
    const it = parseInt(step1.it_staff) || 0;
    
    return {
      entity_name: a.entity_name,
      total_employees: total,
      cyber_staff: cyber,
      it_staff: it,
      cyber_ratio: total > 0 ? (cyber / total) * 100 : 0,
      it_ratio: total > 0 ? (it / total) * 100 : 0,
    };
  }).filter(d => d.total_employees > 0);

  const avgCyberRatio = calculateAverage(workforceData.map(d => d.cyber_ratio));
  const criticalDeficit = workforceData.filter(d => d.cyber_ratio < 0.5);

  return {
    average_cyber_ratio: avgCyberRatio,
    average_it_ratio: calculateAverage(workforceData.map(d => d.it_ratio)),
    total_cyber_staff: workforceData.reduce((sum, d) => sum + d.cyber_staff, 0),
    total_it_staff: workforceData.reduce((sum, d) => sum + d.it_staff, 0),
    entities_with_deficit: criticalDeficit.length,
    deficit_entities: criticalDeficit.map(d => ({
      name: d.entity_name,
      ratio: d.cyber_ratio.toFixed(2),
      staff: d.cyber_staff
    })),
    distribution: {
      excellent: workforceData.filter(d => d.cyber_ratio >= 2).length,
      good: workforceData.filter(d => d.cyber_ratio >= 1 && d.cyber_ratio < 2).length,
      acceptable: workforceData.filter(d => d.cyber_ratio >= 0.5 && d.cyber_ratio < 1).length,
      critical: workforceData.filter(d => d.cyber_ratio < 0.5).length,
    }
  };
}

// 2. Compliance Analysis
function analyzeCompliance(assessments) {
  const complianceData = assessments.map(a => {
    const step4 = a.data.step4 || {};
    const compliance = step4.compliance || [];
    const levels = step4.compliance_levels || {};
    
    return {
      entity_name: a.entity_name,
      has_iso27001: compliance.includes('ISO 27001'),
      iso27001_level: levels['ISO 27001'] || 'none',
      has_nist: compliance.includes('NIST'),
      nist_level: levels['NIST'] || 'none',
      total_standards: compliance.length,
      standards: compliance
    };
  });

  const iso27001Count = complianceData.filter(d => d.has_iso27001).length;
  const nistCount = complianceData.filter(d => d.has_nist).length;

  return {
    iso27001: {
      total: iso27001Count,
      percentage: (iso27001Count / assessments.length) * 100,
      full: complianceData.filter(d => d.iso27001_level === 'full').length,
      partial: complianceData.filter(d => d.iso27001_level === 'partial').length,
      none: assessments.length - iso27001Count,
    },
    nist: {
      total: nistCount,
      percentage: (nistCount / assessments.length) * 100,
      full: complianceData.filter(d => d.nist_level === 'full').length,
      partial: complianceData.filter(d => d.nist_level === 'partial').length,
      none: assessments.length - nistCount,
    },
    no_compliance: complianceData.filter(d => d.total_standards === 0).length,
    entities_without_compliance: complianceData
      .filter(d => d.total_standards === 0)
      .map(d => d.entity_name),
  };
}

// 3. Digital Transformation Analysis
function analyzeDigitalTransformation(assessments) {
  const digitalData = assessments.map(a => {
    const step7 = a.data.step7 || {};
    const level = step7.digital_vs_paper_reliance || 'unknown';
    
    return {
      entity_name: a.entity_name,
      level: level,
      score: getDigitalScore(level)
    };
  });

  return {
    fully_digital: digitalData.filter(d => d.level === 'fully_digital').length,
    mostly_digital: digitalData.filter(d => d.level === 'mostly_digital').length,
    mixed: digitalData.filter(d => d.level === 'mixed').length,
    mostly_paper: digitalData.filter(d => d.level === 'mostly_paper').length,
    mostly_paper_low: digitalData.filter(d => d.level === 'mostly_paper_low').length,
    average_digital_score: calculateAverage(digitalData.map(d => d.score)),
    digital_gap: digitalData.filter(d => d.score < 50).length,
    leaders: digitalData.filter(d => d.score >= 75).map(d => d.entity_name),
    laggards: digitalData.filter(d => d.score < 25).map(d => d.entity_name),
  };
}

// 4. Critical Gaps Analysis
function analyzeCriticalGaps(assessments) {
  const gapsData = assessments.map(a => {
    const step7 = a.data.step7 || {};
    const step4 = a.data.step4 || {};
    const tools = step4.security_tools || [];
    
    return {
      entity_name: a.entity_name,
      no_soc: !step7.has_soc || step7.has_soc === 'no',
      no_noc: !step7.has_noc || step7.has_noc === 'no',
      no_disaster_recovery: !step7.disaster_recovery || step7.disaster_recovery === 'no',
      no_mfa: !tools.includes('mfa') && step4.has_mfa !== 'yes',
      no_backup: !tools.includes('backup') && step7.regular_backup !== 'yes',
      no_firewall: !tools.includes('firewall'),
      no_training: step4.security_training_program !== 'yes',
    };
  });

  const countGap = (field) => gapsData.filter(d => d[field]).length;

  return {
    soc: {
      missing: countGap('no_soc'),
      percentage: (countGap('no_soc') / assessments.length) * 100,
      entities: gapsData.filter(d => d.no_soc).map(d => d.entity_name),
    },
    noc: {
      missing: countGap('no_noc'),
      percentage: (countGap('no_noc') / assessments.length) * 100,
      entities: gapsData.filter(d => d.no_noc).map(d => d.entity_name),
    },
    disaster_recovery: {
      missing: countGap('no_disaster_recovery'),
      percentage: (countGap('no_disaster_recovery') / assessments.length) * 100,
      entities: gapsData.filter(d => d.no_disaster_recovery).map(d => d.entity_name),
    },
    mfa: {
      missing: countGap('no_mfa'),
      percentage: (countGap('no_mfa') / assessments.length) * 100,
    },
    backup: {
      missing: countGap('no_backup'),
      percentage: (countGap('no_backup') / assessments.length) * 100,
    },
    firewall: {
      missing: countGap('no_firewall'),
      percentage: (countGap('no_firewall') / assessments.length) * 100,
    },
    training: {
      missing: countGap('no_training'),
      percentage: (countGap('no_training') / assessments.length) * 100,
    },
    critical_entities: gapsData.filter(d => {
      const gapCount = Object.values(d).filter((v, i) => i > 0 && v).length;
      return gapCount >= 3;
    }).map(d => ({
      name: d.entity_name,
      gaps: Object.keys(d).filter(k => k !== 'entity_name' && d[k])
    })),
  };
}

// 5. Infrastructure Analysis
function analyzeInfrastructure(assessments) {
  const infraData = assessments.map(a => {
    const step2 = a.data.step2 || {};
    const storageAmount = parseFloat(step2.storage_amount) || 0;
    const storageUnit = step2.storage_unit || 'TB';
    const storageTB = storageUnit === 'PB' ? storageAmount * 1024 : storageAmount;
    
    return {
      entity_name: a.entity_name,
      has_infrastructure: step2.has_infrastructure === 'yes',
      data_centers: parseInt(step2.data_center_count) || 0,
      physical_servers: parseInt(step2.physical_servers) || 0,
      virtual_servers: parseInt(step2.virtual_servers) || 0,
      storage_tb: storageTB,
      uses_virtualization: a.data.step7?.uses_virtualization === 'yes',
      managed_by: step2.infrastructure_managed_by,
      has_accurate_asset_register: step2.has_accurate_asset_register,
    };
  }).filter(d => d.has_infrastructure);

  const totalWithInfrastructure = infraData.length;
  const withAssetRegister = infraData.filter(d => d.has_accurate_asset_register === 'yes').length;
  const withoutAssetRegister = infraData.filter(d => d.has_accurate_asset_register === 'no').length;

  return {
    total_data_centers: infraData.reduce((sum, d) => sum + d.data_centers, 0),
    total_physical_servers: infraData.reduce((sum, d) => sum + d.physical_servers, 0),
    total_virtual_servers: infraData.reduce((sum, d) => sum + d.virtual_servers, 0),
    total_storage_tb: infraData.reduce((sum, d) => sum + d.storage_tb, 0),
    total_storage_pb: infraData.reduce((sum, d) => sum + d.storage_tb, 0) / 1024,
    virtualization_adoption: (infraData.filter(d => d.uses_virtualization).length / infraData.length) * 100,
    asset_register: {
      with_register: withAssetRegister,
      without_register: withoutAssetRegister,
      percentage: totalWithInfrastructure > 0 ? ((withAssetRegister / totalWithInfrastructure) * 100).toFixed(1) : 0,
    },
    management: {
      internal: infraData.filter(d => d.managed_by === 'internal').length,
      third_party: infraData.filter(d => d.managed_by === 'third_party').length,
      hybrid: infraData.filter(d => d.managed_by === 'hybrid').length,
    },
  };
}

// 6. Security Tools Analysis
function analyzeSecurityTools(assessments) {
  const toolsCount = {
    firewall: 0,
    ids_ips: 0,
    iam: 0,
    backup: 0,
    antivirus: 0,
  };

  assessments.forEach(a => {
    const step4 = a.data.step4 || {};
    const tools = step4.security_tools || [];
    tools.forEach(tool => {
      if (toolsCount.hasOwnProperty(tool)) {
        toolsCount[tool]++;
      }
    });
  });

  const total = assessments.length;

  return {
    firewall: { count: toolsCount.firewall, percentage: (toolsCount.firewall / total) * 100 },
    ids_ips: { count: toolsCount.ids_ips, percentage: (toolsCount.ids_ips / total) * 100 },
    iam: { count: toolsCount.iam, percentage: (toolsCount.iam / total) * 100 },
    backup: { count: toolsCount.backup, percentage: (toolsCount.backup / total) * 100 },
    antivirus: { count: toolsCount.antivirus, percentage: (toolsCount.antivirus / total) * 100 },
  };
}

// 7. Risk Distribution
function analyzeRiskDistribution(assessments) {
  const distribution = {
    low: assessments.filter(a => a.risk_level === 'low').length,
    medium: assessments.filter(a => a.risk_level === 'medium').length,
    high: assessments.filter(a => a.risk_level === 'high').length,
    critical: assessments.filter(a => a.risk_level === 'critical').length,
  };

  return {
    ...distribution,
    high_risk_entities: assessments
      .filter(a => a.risk_level === 'high' || a.risk_level === 'critical')
      .map(a => ({ name: a.entity_name, score: a.maturity_score, level: a.risk_level })),
  };
}

// 8. Entities Comparison
function compareEntities(assessments) {
  return assessments.map(a => {
    const step4 = a.data.step4 || {};
    const step7 = a.data.step7 || {};
    
    return {
      name: a.entity_name,
      score: a.maturity_score || 0,
      risk: a.risk_level,
      compliance_count: (step4.compliance || []).length,
      tools_count: (step4.security_tools || []).length,
      has_soc: step7.has_soc === 'yes',
      has_noc: step7.has_noc === 'yes',
      digital_level: step7.digital_vs_paper_reliance,
    };
  }).sort((a, b) => (b.score || 0) - (a.score || 0));
}

// 9. Generate Recommendations
function generateRecommendations(assessments) {
  const recommendations = [];
  const gaps = analyzeCriticalGaps(assessments);
  const workforce = analyzeWorkforce(assessments);
  const compliance = analyzeCompliance(assessments);

  // Workforce recommendations
  if (workforce.entities_with_deficit > 0) {
    recommendations.push({
      priority: 'high',
      category: 'workforce',
      title: 'نقص حاد في كوادر الأمن السيبراني',
      description: `يوجد ${workforce.entities_with_deficit} جهة تعاني من نقص حاد في موظفي الأمن السيبراني (أقل من 0.5%)`,
      action: 'إطلاق برنامج توظيف وطني أو برنامج تدريب مكثف',
      affected_entities: workforce.deficit_entities.length,
    });
  }

  // SOC/NOC recommendations
  if (gaps.soc.missing > assessments.length * 0.5) {
    recommendations.push({
      priority: 'critical',
      category: 'infrastructure',
      title: 'غياب مراكز العمليات الأمنية (SOC)',
      description: `${gaps.soc.percentage.toFixed(1)}% من الجهات لا تمتلك مركز عمليات أمنية`,
      action: 'إنشاء SOC وطني موحد أو تعاقدات جماعية مع مزودي خدمات SOC',
      affected_entities: gaps.soc.missing,
    });
  }

  // Compliance recommendations
  if (compliance.no_compliance > 0) {
    recommendations.push({
      priority: 'high',
      category: 'compliance',
      title: 'عدم الامتثال للمعايير الدولية',
      description: `${compliance.no_compliance} جهة لا تلتزم بأي معيار أمني دولي`,
      action: 'إلزام جميع الجهات بالحصول على شهادة ISO 27001 خلال 12 شهراً',
      affected_entities: compliance.no_compliance,
    });
  }

  // Training recommendations
  if (gaps.training.missing > assessments.length * 0.3) {
    recommendations.push({
      priority: 'medium',
      category: 'training',
      title: 'نقص برامج التدريب الأمني',
      description: `${gaps.training.percentage.toFixed(1)}% من الجهات لا تقدم تدريبات أمنية دورية`,
      action: 'إطلاق منصة تدريب وطنية إلزامية للأمن السيبراني',
      affected_entities: gaps.training.missing,
    });
  }

  return recommendations;
}

// 10. Trends Analysis
function analyzeTrends(assessments) {
  // Group by year
  const byYear = {};
  assessments.forEach(a => {
    if (!byYear[a.year]) {
      byYear[a.year] = [];
    }
    byYear[a.year].push(a);
  });

  const trends = Object.keys(byYear).sort().map(year => {
    const yearAssessments = byYear[year];
    return {
      year: parseInt(year),
      count: yearAssessments.length,
      average_score: calculateAverage(yearAssessments.map(a => a.maturity_score)),
      high_risk: yearAssessments.filter(a => a.risk_level === 'high' || a.risk_level === 'critical').length,
    };
  });

  // Calculate year-over-year improvement
  const improvements = [];
  for (let i = 1; i < trends.length; i++) {
    improvements.push({
      from_year: trends[i - 1].year,
      to_year: trends[i].year,
      score_change: trends[i].average_score - trends[i - 1].average_score,
      percentage_change: ((trends[i].average_score - trends[i - 1].average_score) / trends[i - 1].average_score) * 100,
    });
  }

  return {
    yearly_trends: trends,
    improvements: improvements,
  };
}

// Helper functions
function calculateAverage(numbers) {
  const validNumbers = numbers.filter(n => n != null && !isNaN(n));
  if (validNumbers.length === 0) return 0;
  return validNumbers.reduce((sum, n) => sum + n, 0) / validNumbers.length;
}

function getDigitalScore(level) {
  const scores = {
    fully_digital: 100,
    mostly_digital: 85,
    mixed: 60,
    mostly_paper: 35,
    mostly_paper_low: 15,
    unknown: 0,
  };
  return scores[level] || 0;
}

// Ministry-specific statistics
function calculateMinistryStatistics(assessments, entities) {
  // Similar to comprehensive but focused on ministry
  return {
    summary: {
      ministry_name: entities[0]?.name_ar || entities[0]?.name,
      total_branches: entities.length - 1,
      total_assessments: assessments.length,
      average_maturity_score: calculateAverage(assessments.map(a => a.maturity_score)),
    },
    branches_performance: assessments.map(a => ({
      name: a.entity_name,
      score: a.maturity_score,
      risk: a.risk_level,
      year: a.year,
      quarter: a.quarter,
    })),
    workforce: analyzeWorkforce(assessments),
    compliance: analyzeCompliance(assessments),
    criticalGaps: analyzeCriticalGaps(assessments),
  };
}

// Export Statistics as Excel
router.get('/export/excel', authenticateToken, checkPermission('export_reports'), async (req, res) => {
  try {
    console.log('Starting Excel export...');
    
    // Get all completed assessments with entity info
    const assessmentsResult = await query(`
      SELECT 
        a.id, a.entity_id, a.year, a.quarter, a.status, a.maturity_score, a.risk_level,
        e.name, e.name_ar, e.activity_type, e.parent_entity_id,
        ad.step_number, ad.data
      FROM assessments a
      JOIN entities e ON a.entity_id = e.id
      LEFT JOIN assessment_data ad ON a.id = ad.assessment_id
      WHERE a.status IN ('submitted', 'approved')
      ORDER BY a.id, ad.step_number
    `);
    console.log('Got assessments:', assessmentsResult.rows.length, 'rows');

    const assessments = processAssessments(assessmentsResult.rows);
    console.log('Processed assessments:', assessments.length);

    // Create Excel workbook (V-10: ExcelJS)
    console.log('Creating Excel workbook...');
    const workbook = new ExcelJS.Workbook();

    function addJsonSheet(wb, sheetName, rows) {
      if (!rows.length) return;
      const ws = wb.addWorksheet(sheetName);
      ws.columns = Object.keys(rows[0]).map(k => ({ header: k, key: k, width: Math.min(40, Math.max(12, k.length + 4)) }));
      rows.forEach(r => ws.addRow(r));
      ws.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
      });
    }

    // Sheet 1: Summary
    addJsonSheet(workbook, 'ملخص شامل', assessments.map(a => {
      const step1 = a.data.step1 || {}; const step2 = a.data.step2 || {};
      const step3 = a.data.step3 || {}; const step4 = a.data.step4 || {};
      const step5 = a.data.step5 || {}; const step6 = a.data.step6 || {};
      const step7 = a.data.step7 || {};
      return {
        'اسم الجهة': a.entity_name, 'السنة': a.year, 'الربع': a.quarter || '-',
        'درجة النضج': a.maturity_score || 'لم يتم الحساب', 'مستوى المخاطر': a.risk_level || '-',
        'إجمالي الموظفين': step1.total_employees || 0, 'موظفي IT': step1.it_staff || 0,
        'موظفي الأمن السيبراني': step1.cybersecurity_staff || 0,
        'نسبة الأمن السيبراني': step1.total_employees ? ((step1.cybersecurity_staff / step1.total_employees) * 100).toFixed(2) + '%' : '-',
        'عدد مراكز البيانات': step2.data_center_count || 0, 'الخوادم الفيزيائية': step2.physical_servers || 0,
        'الخوادم الافتراضية': step2.virtual_servers || 0,
        'سعة التخزين': (step2.storage_amount || 0) + ' ' + (step2.storage_unit || 'TB'),
        'إدارة البنية التحتية': step2.infrastructure_managed_by || '-',
        'سجل أصول تقنية محدث': step2.has_accurate_asset_register === 'yes' ? 'نعم' : step2.has_accurate_asset_register === 'no' ? 'لا' : '-',
        'موقع رسمي': step3.has_official_website === 'yes' ? 'نعم' : 'لا',
        'بريد رسمي': step3.has_official_email === 'yes' ? 'نعم' : 'لا',
        'عدد مستخدمي البريد': step3.email_users || 0,
        'معايير الامتثال': (step4.compliance || []).join(', ') || 'لا يوجد',
        'أدوات الأمن': (step4.security_tools || []).join(', ') || 'لا يوجد',
        'يوجد وحدة أمن سيبراني': step4.has_cybersecurity_unit === 'yes' ? 'نعم' : 'لا',
        'MFA مفعل': step4.has_mfa === 'yes' ? 'نعم' : 'لا',
        'تدريب أمني دوري': step4.security_training_program === 'yes' ? 'نعم' : 'لا',
        'الموافقة الأمنية': step5.security_approval === 'yes' ? 'نعم' : 'لا',
        'عدد الفروع': step6.has_subsidiaries === 'yes' ? step6.subsidiary_count : 0,
        'مدقق خارجي': step6.has_external_security_auditor === 'yes' ? 'نعم' : 'لا',
        'المحاكاة الافتراضية': step7.uses_virtualization === 'yes' ? 'نعم' : 'لا',
        'SOC': step7.has_soc || 'لا', 'NOC': step7.has_noc || 'لا',
        'خطة التعافي': step7.disaster_recovery || 'لا',
        'نسخ احتياطي منتظم': step7.backup_regularly === 'yes' ? 'نعم' : 'لا',
        'التحول الرقمي': step7.digital_reliance_level || '-',
        'تقارير المركز الوطني': step7.national_center_cybersecurity_reports || 'لا',
      };
    }));

    // Sheet 2: Workforce Analysis
    addJsonSheet(workbook, 'القوى البشرية', assessments.map(a => {
      const step1 = a.data.step1 || {};
      const total = parseInt(step1.total_employees) || 0;
      const cyber = parseInt(step1.cybersecurity_staff) || 0;
      return {
        'الجهة': a.entity_name, 'إجمالي الموظفين': total, 'موظفي الأمن السيبراني': cyber,
        'النسبة المئوية': total > 0 ? ((cyber / total) * 100).toFixed(2) + '%' : '-',
        'التصنيف': total > 0 ? ((cyber / total) >= 0.02 ? 'ممتاز' : (cyber / total) >= 0.01 ? 'جيد' : (cyber / total) >= 0.005 ? 'مقبول' : 'حرج') : '-',
      };
    }));

    // Sheet 3: Compliance
    addJsonSheet(workbook, 'الامتثال', assessments.map(a => {
      const step4 = a.data.step4 || {};
      const compliance = step4.compliance || [];
      const levels = step4.compliance_levels || {};
      return {
        'الجهة': a.entity_name,
        'ISO 27001': compliance.includes('ISO 27001') ? (levels['ISO 27001'] === 'full' ? 'كلي' : 'جزئي') : 'لا',
        'NIST': compliance.includes('NIST') ? (levels['NIST'] === 'full' ? 'كلي' : 'جزئي') : 'لا',
        'PCI DSS': compliance.includes('PCI DSS') ? 'نعم' : 'لا',
        'GDPR': compliance.includes('GDPR') ? 'نعم' : 'لا',
        'عدد المعايير': compliance.length,
      };
    }));

    // Sheet 4: Critical Gaps
    addJsonSheet(workbook, 'الثغرات الحرجة', assessments.map(a => {
      const step4 = a.data.step4 || {}; const step7 = a.data.step7 || {};
      const tools = step4.security_tools || [];
      return {
        'الجهة': a.entity_name,
        'SOC': step7.has_soc === 'yes' ? 'يوجد' : 'لا يوجد',
        'NOC': step7.has_noc === 'yes' ? 'يوجد' : 'لا يوجد',
        'خطة التعافي': step7.disaster_recovery === 'yes' ? 'يوجد' : 'لا يوجد',
        'Firewall': tools.includes('firewall') ? 'يوجد' : 'لا يوجد',
        'IAM': tools.includes('iam') ? 'يوجد' : 'لا يوجد',
        'MFA': step4.has_mfa === 'yes' ? 'يوجد' : 'لا يوجد',
        'نسخ احتياطي': step7.backup_regularly === 'yes' ? 'يوجد' : 'لا يوجد',
        'تدريب أمني': step4.security_training_program === 'yes' ? 'يوجد' : 'لا يوجد',
      };
    }));

    // Generate Excel buffer
    console.log('Generating Excel buffer...');
    const buffer = await workbook.xlsx.writeBuffer();
    console.log('Excel generated, size:', buffer.byteLength);

    // Send file
    const filename = `statistics_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filenameUtf8 = encodeURIComponent('التقرير_الإحصائي_الشامل_' + new Date().toISOString().split('T')[0] + '.xlsx');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filenameUtf8}`);
    res.send(buffer);
    console.log('Excel sent successfully');
  } catch (error) {
    console.error('Export Excel error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
});

// Export Statistics as PDF
router.get('/export/pdf', authenticateToken, checkPermission('export_reports'), async (req, res) => {
  try {
    console.log('Starting PDF export...');
    
    // Get all completed assessments with entity info
    const assessmentsResult = await query(`
      SELECT 
        a.id, a.entity_id, a.year, a.quarter, a.status, a.maturity_score, a.risk_level,
        e.name, e.name_ar, e.activity_type, e.parent_entity_id,
        ad.step_number, ad.data
      FROM assessments a
      JOIN entities e ON a.entity_id = e.id
      LEFT JOIN assessment_data ad ON a.id = ad.assessment_id
      WHERE a.status IN ('submitted', 'approved')
      ORDER BY a.id, ad.step_number
    `);
    console.log('Got assessments:', assessmentsResult.rows.length, 'rows');

    // Get all entities
    const entitiesResult = await query(`
      SELECT id, name, name_ar, activity_type, parent_entity_id
      FROM entities
      WHERE is_active = true
    `);
    console.log('Got entities:', entitiesResult.rows.length);

    // Process data
    const assessments = processAssessments(assessmentsResult.rows);
    console.log('Processed assessments:', assessments.length);
    const entities = entitiesResult.rows;
    
    // Calculate statistics
    console.log('Calculating statistics...');
    const stats = calculateComprehensiveStatistics(assessments, entities);
    console.log('Statistics calculated successfully');

    // Generate PDF
    console.log('Generating PDF...');
    const pdfBuffer = await generateStatisticsReport(stats);
    console.log('PDF generated, size:', pdfBuffer.length);

    // Send PDF
    const filename = `statistics_report_${new Date().toISOString().split('T')[0]}.pdf`;
    const filenameUtf8 = encodeURIComponent('التقرير_الإحصائي_الشامل_' + new Date().toISOString().split('T')[0] + '.pdf');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filenameUtf8}`);
    res.send(pdfBuffer);
    console.log('PDF sent successfully');
  } catch (error) {
    console.error('Export PDF error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

export default router;
