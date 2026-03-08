import XLSX from 'xlsx';
import { format } from 'date-fns';

export function generateExcelExport(assessments, assessmentDataMap, entitiesMap) {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Assessment Summary
  const summaryData = assessments.map(assessment => {
    const entity = entitiesMap[assessment.entity_id] || {};
    return {
      'Assessment ID': assessment.id,
      'Entity Name': entity.name || '',
      'Entity Name (AR)': entity.name_ar || '',
      'Activity Type': entity.activity_type || '',
      'Year': assessment.year,
      'Quarter': assessment.quarter || 'Annual',
      'Status': assessment.status,
      'Maturity Score': assessment.maturity_score || 'N/A',
      'Risk Level': assessment.risk_level || 'N/A',
      'Submitted Date': assessment.submitted_at ? format(new Date(assessment.submitted_at), 'yyyy-MM-dd') : 'N/A',
      'Created Date': format(new Date(assessment.created_at), 'yyyy-MM-dd')
    };
  });

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Assessment Summary');

  // Sheet 2: General Information (Step 1)
  const generalData = [];
  assessments.forEach(assessment => {
    const entity = entitiesMap[assessment.entity_id] || {};
    const data = assessmentDataMap[assessment.id]?.step1 || {};
    generalData.push({
      'Assessment ID': assessment.id,
      'Entity Name': entity.name || '',
      'Total Employees': data.total_employees || 0,
      'IT Staff': data.it_staff || 0,
      'Cybersecurity Staff': data.cybersecurity_staff || 0,
      'IT Staff %': data.total_employees ? ((data.it_staff / data.total_employees) * 100).toFixed(2) + '%' : 'N/A',
      'Cyber Staff %': data.total_employees ? ((data.cybersecurity_staff / data.total_employees) * 100).toFixed(2) + '%' : 'N/A'
    });
  });
  const generalSheet = XLSX.utils.json_to_sheet(generalData);
  XLSX.utils.book_append_sheet(workbook, generalSheet, 'General Information');

  // Sheet 3: Infrastructure (Step 2)
  const infraData = [];
  assessments.forEach(assessment => {
    const entity = entitiesMap[assessment.entity_id] || {};
    const data = assessmentDataMap[assessment.id]?.step2 || {};
    infraData.push({
      'Assessment ID': assessment.id,
      'Entity Name': entity.name || '',
      'Has Infrastructure': data.has_infrastructure || 'N/A',
      'Data Centers': data.data_center_count || 0,
      'Physical Servers': data.physical_servers || 0,
      'Virtual Servers': data.virtual_servers || 0,
      'Storage (TB)': data.storage_tb || 0,
      'Network Types': data.network_types?.join(', ') || 'N/A',
      'Inventory Items': data.inventory?.length || 0
    });
  });
  const infraSheet = XLSX.utils.json_to_sheet(infraData);
  XLSX.utils.book_append_sheet(workbook, infraSheet, 'Infrastructure');

  // Sheet 4: Digital Services (Step 3)
  const servicesData = [];
  assessments.forEach(assessment => {
    const entity = entitiesMap[assessment.entity_id] || {};
    const data = assessmentDataMap[assessment.id]?.step3 || {};
    servicesData.push({
      'Assessment ID': assessment.id,
      'Entity Name': entity.name || '',
      'Services': data.services?.join(', ') || 'N/A',
      'Website Management': data.website_management || 'N/A',
      'Domain Type': data.domain_type || 'N/A',
      'Email Infrastructure': data.email_infrastructure || 'N/A',
      'Email Users': data.email_users || 0,
      'Security Gateway': data.security_gateway || 'N/A'
    });
  });
  const servicesSheet = XLSX.utils.json_to_sheet(servicesData);
  XLSX.utils.book_append_sheet(workbook, servicesSheet, 'Digital Services');

  // Sheet 5: Cybersecurity (Step 4)
  const cyberData = [];
  assessments.forEach(assessment => {
    const entity = entitiesMap[assessment.entity_id] || {};
    const data = assessmentDataMap[assessment.id]?.step4 || {};
    const compliance = data.compliance || [];
    const tools = data.security_tools || [];
    
    cyberData.push({
      'Assessment ID': assessment.id,
      'Entity Name': entity.name || '',
      'ISO 27001': compliance.includes('ISO 27001') ? 'Yes' : 'No',
      'NIST': compliance.includes('NIST') ? 'Yes' : 'No',
      'ISO 27032': compliance.includes('ISO 27032') ? 'Yes' : 'No',
      'Firewall': tools.includes('firewall') ? 'Yes' : 'No',
      'IDS/IPS': tools.includes('ids_ips') ? 'Yes' : 'No',
      'IAM': tools.includes('iam') ? 'Yes' : 'No',
      'Backup': tools.includes('backup') ? 'Yes' : 'No',
      'SIEM': tools.includes('siem') ? 'Yes' : 'No',
      'MFA': tools.includes('mfa') ? 'Yes' : 'No',
      'DLP': tools.includes('dlp') ? 'Yes' : 'No',
      'Endpoint Protection': tools.includes('endpoint_protection') ? 'Yes' : 'No',
      'Total Tools': tools.length
    });
  });
  const cyberSheet = XLSX.utils.json_to_sheet(cyberData);
  XLSX.utils.book_append_sheet(workbook, cyberSheet, 'Cybersecurity');

  // Sheet 6: Monitoring & Advanced (Steps 5 & 6)
  const advancedData = [];
  assessments.forEach(assessment => {
    const entity = entitiesMap[assessment.entity_id] || {};
    const data5 = assessmentDataMap[assessment.id]?.step5 || {};
    const data6 = assessmentDataMap[assessment.id]?.step6 || {};
    
    advancedData.push({
      'Assessment ID': assessment.id,
      'Entity Name': entity.name || '',
      'Security Approval': data5.security_approval || 'N/A',
      'NDA Signed': data5.nda_signed || 'N/A',
      'Reporting Frequency': data5.reporting_frequency || 'N/A',
      'Has Subsidiaries': data5.has_subsidiaries || 'N/A',
      'Virtualization': data6.uses_virtualization || 'N/A',
      'Virtualization Type': data6.virtualization_type || 'N/A',
      'VPN': data6.has_vpn || 'N/A',
      'API Integration': data6.api_integration || 'N/A',
      'Pentesting': data6.pentesting_frequency || 'N/A',
      'Has SOC': data6.has_soc || 'N/A',
      'Has NOC': data6.has_noc || 'N/A'
    });
  });
  const advancedSheet = XLSX.utils.json_to_sheet(advancedData);
  XLSX.utils.book_append_sheet(workbook, advancedSheet, 'Monitoring & Advanced');

  // Sheet 7: Risk Analysis
  const riskData = [];
  assessments.forEach(assessment => {
    const entity = entitiesMap[assessment.entity_id] || {};
    const step1 = assessmentDataMap[assessment.id]?.step1 || {};
    const step4 = assessmentDataMap[assessment.id]?.step4 || {};
    const tools = step4.security_tools || [];
    
    const risks = [];
    if (step1.total_employees && (step1.cybersecurity_staff / step1.total_employees) < 0.01) {
      risks.push('Low cyber staffing');
    }
    if (!tools.includes('mfa')) risks.push('No MFA');
    if (!tools.includes('backup')) risks.push('No backup');
    if (!tools.includes('firewall')) risks.push('No firewall');
    if (step4.compliance?.length === 0) risks.push('No compliance');
    
    riskData.push({
      'Assessment ID': assessment.id,
      'Entity Name': entity.name || '',
      'Maturity Score': assessment.maturity_score || 'N/A',
      'Risk Level': assessment.risk_level || 'N/A',
      'Identified Risks': risks.join('; ') || 'None identified'
    });
  });
  const riskSheet = XLSX.utils.json_to_sheet(riskData);
  XLSX.utils.book_append_sheet(workbook, riskSheet, 'Risk Analysis');

  return workbook;
}

export function generateEntityComparisonExcel(comparisonData) {
  const workbook = XLSX.utils.book_new();

  const data = comparisonData.map(item => ({
    'Entity ID': item.id,
    'Entity Name': item.name,
    'Entity Name (AR)': item.name_ar,
    'Total Assessments': item.assessment_count,
    'Average Maturity Score': item.avg_maturity_score ? parseFloat(item.avg_maturity_score).toFixed(2) : 'N/A',
    'Maximum Score': item.max_maturity_score ? parseFloat(item.max_maturity_score).toFixed(2) : 'N/A',
    'Minimum Score': item.min_maturity_score ? parseFloat(item.min_maturity_score).toFixed(2) : 'N/A',
    'Critical Risk Count': item.critical_count || 0,
    'High Risk Count': item.high_count || 0
  }));

  const sheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Entity Comparison');

  return workbook;
}

export default { generateExcelExport, generateEntityComparisonExcel };
