// V-10: Replaced xlsx (vulnerable) with ExcelJS (actively maintained)
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

function headerStyle(worksheet, columns) {
  columns.forEach((col, i) => {
    const cell = worksheet.getRow(1).getCell(i + 1);
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center' };
  });
}

export async function generateExcelExport(assessments, assessmentDataMap, entitiesMap) {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Assessment Summary
  const summarySheet = workbook.addWorksheet('Assessment Summary');
  summarySheet.columns = [
    { header: 'Assessment ID', key: 'id', width: 15 },
    { header: 'Entity Name', key: 'name', width: 30 },
    { header: 'Entity Name (AR)', key: 'name_ar', width: 30 },
    { header: 'Activity Type', key: 'activity_type', width: 20 },
    { header: 'Year', key: 'year', width: 8 },
    { header: 'Quarter', key: 'quarter', width: 10 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Maturity Score', key: 'maturity_score', width: 15 },
    { header: 'Risk Level', key: 'risk_level', width: 12 },
    { header: 'Submitted Date', key: 'submitted_at', width: 15 },
    { header: 'Created Date', key: 'created_at', width: 15 },
  ];
  assessments.forEach(a => {
    const entity = entitiesMap[a.entity_id] || {};
    summarySheet.addRow({
      id: a.id,
      name: entity.name || '',
      name_ar: entity.name_ar || '',
      activity_type: entity.activity_type || '',
      year: a.year,
      quarter: a.quarter || 'Annual',
      status: a.status,
      maturity_score: a.maturity_score ?? 'N/A',
      risk_level: a.risk_level || 'N/A',
      submitted_at: a.submitted_at ? format(new Date(a.submitted_at), 'yyyy-MM-dd') : 'N/A',
      created_at: format(new Date(a.created_at), 'yyyy-MM-dd'),
    });
  });
  headerStyle(summarySheet, summarySheet.columns);

  // Sheet 2: General Information (Step 1)
  const generalSheet = workbook.addWorksheet('General Information');
  generalSheet.columns = [
    { header: 'Assessment ID', key: 'id', width: 15 },
    { header: 'Entity Name', key: 'name', width: 30 },
    { header: 'Total Employees', key: 'total_employees', width: 18 },
    { header: 'IT Staff', key: 'it_staff', width: 12 },
    { header: 'Cybersecurity Staff', key: 'cybersecurity_staff', width: 20 },
    { header: 'IT Staff %', key: 'it_pct', width: 12 },
    { header: 'Cyber Staff %', key: 'cyber_pct', width: 14 },
  ];
  assessments.forEach(a => {
    const entity = entitiesMap[a.entity_id] || {};
    const d = assessmentDataMap[a.id]?.step1 || {};
    generalSheet.addRow({
      id: a.id,
      name: entity.name || '',
      total_employees: d.total_employees || 0,
      it_staff: d.it_staff || 0,
      cybersecurity_staff: d.cybersecurity_staff || 0,
      it_pct: d.total_employees ? ((d.it_staff / d.total_employees) * 100).toFixed(2) + '%' : 'N/A',
      cyber_pct: d.total_employees ? ((d.cybersecurity_staff / d.total_employees) * 100).toFixed(2) + '%' : 'N/A',
    });
  });
  headerStyle(generalSheet, generalSheet.columns);

  // Sheet 3: Infrastructure (Step 2)
  const infraSheet = workbook.addWorksheet('Infrastructure');
  infraSheet.columns = [
    { header: 'Assessment ID', key: 'id', width: 15 },
    { header: 'Entity Name', key: 'name', width: 30 },
    { header: 'Has Infrastructure', key: 'has_infrastructure', width: 18 },
    { header: 'Data Centers', key: 'data_center_count', width: 14 },
    { header: 'Physical Servers', key: 'physical_servers', width: 16 },
    { header: 'Virtual Servers', key: 'virtual_servers', width: 16 },
    { header: 'Storage (TB)', key: 'storage_tb', width: 14 },
    { header: 'Network Types', key: 'network_types', width: 25 },
    { header: 'Inventory Items', key: 'inventory_count', width: 16 },
  ];
  assessments.forEach(a => {
    const entity = entitiesMap[a.entity_id] || {};
    const d = assessmentDataMap[a.id]?.step2 || {};
    infraSheet.addRow({
      id: a.id,
      name: entity.name || '',
      has_infrastructure: d.has_infrastructure || 'N/A',
      data_center_count: d.data_center_count || 0,
      physical_servers: d.physical_servers || 0,
      virtual_servers: d.virtual_servers || 0,
      storage_tb: d.storage_tb || 0,
      network_types: d.network_types?.join(', ') || 'N/A',
      inventory_count: d.inventory?.length || 0,
    });
  });
  headerStyle(infraSheet, infraSheet.columns);

  // Sheet 4: Digital Services (Step 3)
  const servicesSheet = workbook.addWorksheet('Digital Services');
  servicesSheet.columns = [
    { header: 'Assessment ID', key: 'id', width: 15 },
    { header: 'Entity Name', key: 'name', width: 30 },
    { header: 'Services', key: 'services', width: 30 },
    { header: 'Website Management', key: 'website_management', width: 20 },
    { header: 'Domain Type', key: 'domain_type', width: 15 },
    { header: 'Email Infrastructure', key: 'email_infrastructure', width: 20 },
    { header: 'Email Users', key: 'email_users', width: 13 },
    { header: 'Security Gateway', key: 'security_gateway', width: 18 },
  ];
  assessments.forEach(a => {
    const entity = entitiesMap[a.entity_id] || {};
    const d = assessmentDataMap[a.id]?.step3 || {};
    servicesSheet.addRow({
      id: a.id,
      name: entity.name || '',
      services: d.services?.join(', ') || 'N/A',
      website_management: d.website_management || 'N/A',
      domain_type: d.domain_type || 'N/A',
      email_infrastructure: d.email_infrastructure || 'N/A',
      email_users: d.email_users || 0,
      security_gateway: d.security_gateway || 'N/A',
    });
  });
  headerStyle(servicesSheet, servicesSheet.columns);

  // Sheet 5: Cybersecurity (Step 4)
  const cyberSheet = workbook.addWorksheet('Cybersecurity');
  cyberSheet.columns = [
    { header: 'Assessment ID', key: 'id', width: 15 },
    { header: 'Entity Name', key: 'name', width: 30 },
    { header: 'ISO 27001', key: 'iso27001', width: 12 },
    { header: 'NIST', key: 'nist', width: 8 },
    { header: 'ISO 27032', key: 'iso27032', width: 12 },
    { header: 'Firewall', key: 'firewall', width: 10 },
    { header: 'IDS/IPS', key: 'ids_ips', width: 10 },
    { header: 'IAM', key: 'iam', width: 8 },
    { header: 'Backup', key: 'backup', width: 10 },
    { header: 'SIEM', key: 'siem', width: 8 },
    { header: 'MFA', key: 'mfa', width: 8 },
    { header: 'DLP', key: 'dlp', width: 8 },
    { header: 'Endpoint Protection', key: 'endpoint', width: 20 },
    { header: 'Total Tools', key: 'total_tools', width: 13 },
  ];
  assessments.forEach(a => {
    const entity = entitiesMap[a.entity_id] || {};
    const d = assessmentDataMap[a.id]?.step4 || {};
    const compliance = d.compliance || [];
    const tools = d.security_tools || [];
    cyberSheet.addRow({
      id: a.id, name: entity.name || '',
      iso27001: compliance.includes('ISO 27001') ? 'Yes' : 'No',
      nist: compliance.includes('NIST') ? 'Yes' : 'No',
      iso27032: compliance.includes('ISO 27032') ? 'Yes' : 'No',
      firewall: tools.includes('firewall') ? 'Yes' : 'No',
      ids_ips: tools.includes('ids_ips') ? 'Yes' : 'No',
      iam: tools.includes('iam') ? 'Yes' : 'No',
      backup: tools.includes('backup') ? 'Yes' : 'No',
      siem: tools.includes('siem') ? 'Yes' : 'No',
      mfa: tools.includes('mfa') ? 'Yes' : 'No',
      dlp: tools.includes('dlp') ? 'Yes' : 'No',
      endpoint: tools.includes('endpoint_protection') ? 'Yes' : 'No',
      total_tools: tools.length,
    });
  });
  headerStyle(cyberSheet, cyberSheet.columns);

  // Sheet 6: Monitoring & Advanced (Steps 5 & 6)
  const advSheet = workbook.addWorksheet('Monitoring & Advanced');
  advSheet.columns = [
    { header: 'Assessment ID', key: 'id', width: 15 },
    { header: 'Entity Name', key: 'name', width: 30 },
    { header: 'Security Approval', key: 'security_approval', width: 18 },
    { header: 'NDA Signed', key: 'nda_signed', width: 12 },
    { header: 'Reporting Frequency', key: 'reporting_frequency', width: 20 },
    { header: 'Virtualization', key: 'uses_virtualization', width: 16 },
    { header: 'VPN', key: 'has_vpn', width: 8 },
    { header: 'API Integration', key: 'api_integration', width: 16 },
    { header: 'Pentesting', key: 'pentesting_frequency', width: 15 },
    { header: 'Has SOC', key: 'has_soc', width: 10 },
    { header: 'Has NOC', key: 'has_noc', width: 10 },
  ];
  assessments.forEach(a => {
    const entity = entitiesMap[a.entity_id] || {};
    const d5 = assessmentDataMap[a.id]?.step5 || {};
    const d6 = assessmentDataMap[a.id]?.step6 || {};
    advSheet.addRow({
      id: a.id, name: entity.name || '',
      security_approval: d5.security_approval || 'N/A',
      nda_signed: d5.nda_signed || 'N/A',
      reporting_frequency: d5.reporting_frequency || 'N/A',
      uses_virtualization: d6.uses_virtualization || 'N/A',
      has_vpn: d6.has_vpn || 'N/A',
      api_integration: d6.api_integration || 'N/A',
      pentesting_frequency: d6.pentesting_frequency || 'N/A',
      has_soc: d6.has_soc || 'N/A',
      has_noc: d6.has_noc || 'N/A',
    });
  });
  headerStyle(advSheet, advSheet.columns);

  // Sheet 7: Risk Analysis
  const riskSheet = workbook.addWorksheet('Risk Analysis');
  riskSheet.columns = [
    { header: 'Assessment ID', key: 'id', width: 15 },
    { header: 'Entity Name', key: 'name', width: 30 },
    { header: 'Maturity Score', key: 'maturity_score', width: 15 },
    { header: 'Risk Level', key: 'risk_level', width: 12 },
    { header: 'Identified Risks', key: 'risks', width: 50 },
  ];
  assessments.forEach(a => {
    const entity = entitiesMap[a.entity_id] || {};
    const step1 = assessmentDataMap[a.id]?.step1 || {};
    const step4 = assessmentDataMap[a.id]?.step4 || {};
    const tools = step4.security_tools || [];
    const risks = [];
    if (step1.total_employees && (step1.cybersecurity_staff / step1.total_employees) < 0.01) risks.push('Low cyber staffing');
    if (!tools.includes('mfa')) risks.push('No MFA');
    if (!tools.includes('backup')) risks.push('No backup');
    if (!tools.includes('firewall')) risks.push('No firewall');
    if (!step4.compliance?.length) risks.push('No compliance');
    riskSheet.addRow({
      id: a.id, name: entity.name || '',
      maturity_score: a.maturity_score ?? 'N/A',
      risk_level: a.risk_level || 'N/A',
      risks: risks.join('; ') || 'None identified',
    });
  });
  headerStyle(riskSheet, riskSheet.columns);

  return workbook.xlsx.writeBuffer();
}

export async function generateEntityComparisonExcel(comparisonData) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Entity Comparison');
  sheet.columns = [
    { header: 'Entity ID', key: 'id', width: 12 },
    { header: 'Entity Name', key: 'name', width: 30 },
    { header: 'Entity Name (AR)', key: 'name_ar', width: 30 },
    { header: 'Total Assessments', key: 'assessment_count', width: 18 },
    { header: 'Avg Maturity Score', key: 'avg_maturity_score', width: 20 },
    { header: 'Maximum Score', key: 'max_maturity_score', width: 15 },
    { header: 'Minimum Score', key: 'min_maturity_score', width: 15 },
    { header: 'Critical Risk Count', key: 'critical_count', width: 18 },
    { header: 'High Risk Count', key: 'high_count', width: 16 },
  ];
  comparisonData.forEach(item => {
    sheet.addRow({
      id: item.id,
      name: item.name,
      name_ar: item.name_ar,
      assessment_count: item.assessment_count,
      avg_maturity_score: item.avg_maturity_score ? parseFloat(item.avg_maturity_score).toFixed(2) : 'N/A',
      max_maturity_score: item.max_maturity_score ? parseFloat(item.max_maturity_score).toFixed(2) : 'N/A',
      min_maturity_score: item.min_maturity_score ? parseFloat(item.min_maturity_score).toFixed(2) : 'N/A',
      critical_count: item.critical_count || 0,
      high_count: item.high_count || 0,
    });
  });
  headerStyle(sheet, sheet.columns);

  return workbook.xlsx.writeBuffer();
}
