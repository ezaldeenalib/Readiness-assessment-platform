import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

// Configure jsPDF for Arabic/RTL support
export function generateAssessmentPDF(assessment, assessmentData, entity) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Title (English only for now - Arabic will show as boxes without proper font)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Digital Maturity & Cybersecurity Assessment', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Ministry Digital Transformation Assessment Form', pageWidth / 2, 28, { align: 'center' });

  let yPos = 45;

  // Header Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Entity Information', margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const headerInfo = [
    ['Entity Name (English):', entity.name || 'N/A', ''],
    ['Entity Name (Arabic):', entity.name_ar || 'N/A', ''],
    ['Activity Type:', entity.activity_type, ''],
    ['Assessment Year:', assessment.year.toString(), ''],
    ['Quarter:', assessment.quarter ? `Q${assessment.quarter}` : 'Annual', ''],
    ['Status:', assessment.status, ''],
    ['Maturity Score:', assessment.maturity_score ? `${assessment.maturity_score}/100` : 'N/A', ''],
    ['Risk Level:', assessment.risk_level || 'N/A', '']
  ];

  doc.autoTable({
    startY: yPos,
    head: [],
    body: headerInfo,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 60 },
      2: { cellWidth: 50 }
    }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // Step 1: General Information
  if (assessmentData.step1) {
    addSection(doc, 'Step 1: General Information', yPos);
    yPos = doc.lastAutoTable.finalY + 2;

    const step1Data = assessmentData.step1;
    const step1Table = [
      ['Total Employees:', step1Data.total_employees || 'N/A'],
      ['IT Staff:', step1Data.it_staff || 'N/A'],
      ['Cybersecurity Staff:', step1Data.cybersecurity_staff || 'N/A'],
      ['IT Staff Percentage:', step1Data.total_employees ? `${((step1Data.it_staff / step1Data.total_employees) * 100).toFixed(2)}%` : 'N/A'],
      ['Cyber Staff Percentage:', step1Data.total_employees ? `${((step1Data.cybersecurity_staff / step1Data.total_employees) * 100).toFixed(2)}%` : 'N/A']
    ];

    doc.autoTable({
      startY: yPos,
      body: step1Table,
      theme: 'striped',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 90 }
      }
    });
    yPos = doc.lastAutoTable.finalY + 8;
  }

  // Step 2: Infrastructure
  if (assessmentData.step2) {
    checkPageBreak(doc, yPos);
    addSection(doc, 'Step 2: Digital Infrastructure', yPos);
    yPos = doc.lastAutoTable.finalY + 2;

    const step2Data = assessmentData.step2;
    const step2Table = [
      ['Has Infrastructure:', step2Data.has_infrastructure || 'N/A'],
      ['Data Centers:', step2Data.data_center_count || 'N/A'],
      ['Physical Servers:', step2Data.physical_servers || 'N/A'],
      ['Virtual Servers:', step2Data.virtual_servers || 'N/A'],
      ['Storage (TB):', step2Data.storage_tb || 'N/A'],
      ['Network Types:', step2Data.network_types?.join(', ') || 'N/A']
    ];

    doc.autoTable({
      startY: yPos,
      body: step2Table,
      theme: 'striped',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 90 }
      }
    });
    yPos = doc.lastAutoTable.finalY + 2;

    // Infrastructure Inventory
    if (step2Data.inventory && step2Data.inventory.length > 0) {
      yPos += 5;
      checkPageBreak(doc, yPos);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Infrastructure Inventory', margin, yPos);
      yPos += 5;

      const inventoryTable = step2Data.inventory.map(item => [
        item.type || '',
        item.brand || '',
        item.model || '',
        item.quantity || ''
      ]);

      doc.autoTable({
        startY: yPos,
        head: [['Type', 'Brand', 'Model', 'Quantity']],
        body: inventoryTable,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' }
      });
      yPos = doc.lastAutoTable.finalY + 8;
    }
  }

  // Step 3: Digital Services
  if (assessmentData.step3) {
    checkPageBreak(doc, yPos);
    addSection(doc, 'Step 3: Digital Services', yPos);
    yPos = doc.lastAutoTable.finalY + 2;

    const step3Data = assessmentData.step3;
    const step3Table = [
      ['Digital Services:', step3Data.services?.join(', ') || 'N/A'],
      ['Website Management:', step3Data.website_management || 'N/A'],
      ['Domain Type:', step3Data.domain_type || 'N/A'],
      ['Email Infrastructure:', step3Data.email_infrastructure || 'N/A'],
      ['Email Users Count:', step3Data.email_users || 'N/A'],
      ['Security Gateway:', step3Data.security_gateway || 'N/A']
    ];

    doc.autoTable({
      startY: yPos,
      body: step3Table,
      theme: 'striped',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 90 }
      }
    });
    yPos = doc.lastAutoTable.finalY + 8;
  }

  // Step 4: Cybersecurity (New Page)
  if (assessmentData.step4) {
    doc.addPage();
    yPos = 20;
    addSection(doc, 'Step 4: Cybersecurity', yPos);
    yPos = doc.lastAutoTable.finalY + 2;

    const step4Data = assessmentData.step4;
    const step4Table = [
      ['Compliance Standards:', step4Data.compliance?.join(', ') || 'None'],
      ['Security Tools:', step4Data.security_tools?.join(', ') || 'None']
    ];

    doc.autoTable({
      startY: yPos,
      body: step4Table,
      theme: 'striped',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 90 }
      }
    });
    yPos = doc.lastAutoTable.finalY + 8;
  }

  // Step 5: Monitoring & Approvals
  if (assessmentData.step5) {
    checkPageBreak(doc, yPos);
    addSection(doc, 'Step 5: Monitoring & Approvals', yPos);
    yPos = doc.lastAutoTable.finalY + 2;

    const step5Data = assessmentData.step5;
    const step5Table = [
      ['Security Approval:', step5Data.security_approval || 'N/A'],
      ['NDA Signed:', step5Data.nda_signed || 'N/A'],
      ['Reporting Frequency:', step5Data.reporting_frequency || 'N/A'],
      ['Has Subsidiaries:', step5Data.has_subsidiaries || 'N/A'],
      ['Subsidiary Count:', step5Data.subsidiary_count || 'N/A']
    ];

    doc.autoTable({
      startY: yPos,
      body: step5Table,
      theme: 'striped',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 90 }
      }
    });
    yPos = doc.lastAutoTable.finalY + 8;
  }

  // Step 6: Advanced Technical
  if (assessmentData.step6) {
    checkPageBreak(doc, yPos);
    addSection(doc, 'Step 6: Advanced Technical', yPos);
    yPos = doc.lastAutoTable.finalY + 2;

    const step6Data = assessmentData.step6;
    const step6Table = [
      ['Uses Virtualization:', step6Data.uses_virtualization || 'N/A'],
      ['Virtualization Type:', step6Data.virtualization_type || 'N/A'],
      ['Has VPN:', step6Data.has_vpn || 'N/A'],
      ['VPN Type:', step6Data.vpn_type || 'N/A'],
      ['API Integration:', step6Data.api_integration || 'N/A'],
      ['API Count:', step6Data.api_count || 'N/A'],
      ['Pentesting Frequency:', step6Data.pentesting_frequency || 'N/A'],
      ['Has SOC:', step6Data.has_soc || 'N/A'],
      ['Has NOC:', step6Data.has_noc || 'N/A'],
      ['Disaster Recovery:', step6Data.disaster_recovery || 'N/A']
    ];

    doc.autoTable({
      startY: yPos,
      body: step6Table,
      theme: 'striped',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 90 }
      }
    });
    yPos = doc.lastAutoTable.finalY + 8;
  }

  // Footer on last page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Page ${i} of ${pageCount} | Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  return doc;
}

function addSection(doc, title, yPos) {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 128, 185);
  doc.autoTable({
    startY: yPos,
    head: [[title]],
    theme: 'plain',
    headStyles: { 
      fillColor: [41, 128, 185], 
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 11
    }
  });
  doc.setTextColor(0);
}

function checkPageBreak(doc, yPos) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (yPos > pageHeight - 40) {
    doc.addPage();
    return 20;
  }
  return yPos;
}

export default generateAssessmentPDF;
