import puppeteer from 'puppeteer';
import { format } from 'date-fns';

// V-05: escapes all user-controlled strings before HTML interpolation
function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function generateAssessmentPDF(assessment, assessmentData, entity) {
  // V-06: removed --no-sandbox; run as non-root user in production
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--disable-dev-shm-usage', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    
    const htmlContent = generateHTMLContent(assessment, assessmentData, entity);
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

function generateHTMLContent(assessment, assessmentData, entity) {
  const step1 = assessmentData.step1 || {};
  const step2 = assessmentData.step2 || {};
  const step3 = assessmentData.step3 || {};
  const step4 = assessmentData.step4 || {};
  const step5 = assessmentData.step5 || {};
  const step6 = assessmentData.step6 || {};
  const step7 = assessmentData.step7 || {};

  const riskColors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#991b1b'
  };

  const riskLabels = {
    low: 'منخفض',
    medium: 'متوسط',
    high: 'عالي',
    critical: 'حرج'
  };

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير تقييم النضج الرقمي</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Tajawal', Arial, sans-serif;
      direction: rtl;
      color: #1f2937;
      line-height: 1.6;
    }

    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      padding: 30px;
      text-align: center;
      margin-bottom: 30px;
      border-radius: 10px;
    }

    .header h1 {
      font-size: 28px;
      font-weight: 900;
      margin-bottom: 8px;
    }

    .header p {
      font-size: 16px;
      opacity: 0.9;
    }

    .info-box {
      background: #f3f4f6;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 25px;
      border-right: 4px solid #2563eb;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .info-label {
      font-weight: 700;
      color: #4b5563;
    }

    .info-value {
      font-weight: 500;
      color: #1f2937;
    }

    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }

    .section-header {
      background: #2563eb;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
    }

    .section-number {
      background: white;
      color: #2563eb;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 12px;
      font-weight: 900;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .data-table tr {
      border-bottom: 1px solid #e5e7eb;
    }

    .data-table tr:last-child {
      border-bottom: none;
    }

    .data-table td {
      padding: 12px 15px;
    }

    .data-table td:first-child {
      font-weight: 700;
      color: #4b5563;
      width: 40%;
      background: #f9fafb;
    }

    .data-table td:last-child {
      color: #1f2937;
    }

    .inventory-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .inventory-table thead {
      background: #1f2937;
      color: white;
    }

    .inventory-table th {
      padding: 12px;
      text-align: right;
      font-weight: 700;
    }

    .inventory-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
    }

    .inventory-table tbody tr:hover {
      background: #f9fafb;
    }

    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
    }

    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }

    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }

    .badge-danger {
      background: #fee2e2;
      color: #991b1b;
    }

    .badge-info {
      background: #dbeafe;
      color: #1e40af;
    }

    .score-box {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 25px;
      border-radius: 10px;
      text-align: center;
      margin: 25px 0;
    }

    .score-value {
      font-size: 48px;
      font-weight: 900;
      margin: 10px 0;
    }

    .score-label {
      font-size: 16px;
      opacity: 0.9;
    }

    .risk-badge {
      display: inline-block;
      padding: 8px 20px;
      border-radius: 25px;
      font-weight: 700;
      font-size: 14px;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }

    .tag {
      background: #2563eb;
      color: white;
      padding: 4px 10px;
      border-radius: 15px;
      font-size: 12px;
      font-weight: 500;
    }

    .warning-box {
      background: #fef3c7;
      border-right: 4px solid #f59e0b;
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
    }

    .warning-box strong {
      color: #92400e;
    }

    .success-box {
      background: #d1fae5;
      border-right: 4px solid #10b981;
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
    }

    .success-box strong {
      color: #065f46;
    }

    @media print {
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>🛡️ تقرير تقييم النضج الرقمي والأمن السيبراني</h1>
    <p>نظام تقييم شامل للجهات الحكومية</p>
  </div>

  <!-- Entity Information -->
  <div class="info-box">
    <h3 style="margin-bottom: 15px; color: #2563eb; font-size: 20px;">📋 معلومات الجهة</h3>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">اسم الجهة:</span>
        <span class="info-value">${escapeHtml(entity.name_ar || entity.name)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">نوع النشاط:</span>
        <span class="info-value">${entity.activity_type === 'government' ? 'حكومي' : escapeHtml(entity.activity_type)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">سنة التقييم:</span>
        <span class="info-value">${assessment.year}</span>
      </div>
      <div class="info-item">
        <span class="info-label">الربع:</span>
        <span class="info-value">${assessment.quarter ? `الربع ${assessment.quarter}` : 'سنوي'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">حالة التقييم:</span>
        <span class="info-value">
          ${assessment.status === 'draft' ? '<span class="badge badge-warning">مسودة</span>' : ''}
          ${assessment.status === 'submitted' ? '<span class="badge badge-info">مقدم</span>' : ''}
          ${assessment.status === 'approved' ? '<span class="badge badge-success">معتمد</span>' : ''}
          ${assessment.status === 'rejected' ? '<span class="badge badge-danger">مرفوض</span>' : ''}
        </span>
      </div>
      <div class="info-item">
        <span class="info-label">تاريخ الإنشاء:</span>
        <span class="info-value">${format(new Date(assessment.created_at), 'yyyy-MM-dd')}</span>
      </div>
    </div>
  </div>

  <!-- Maturity Score -->
  ${assessment.maturity_score ? `
    <div class="score-box" style="background: linear-gradient(135deg, ${riskColors[assessment.risk_level] || '#2563eb'} 0%, ${riskColors[assessment.risk_level] || '#1e40af'} 100%);">
      <div class="score-label">درجة النضج الرقمي</div>
      <div class="score-value">${assessment.maturity_score}<span style="font-size: 24px;">/100</span></div>
      <div style="margin-top: 10px;">
        <span class="risk-badge" style="background: rgba(255,255,255,0.3);">
          مستوى المخاطر: ${riskLabels[assessment.risk_level] || 'غير محدد'}
        </span>
      </div>
    </div>
  ` : ''}

  <!-- Step 1: General Information -->
  <div class="section">
    <div class="section-header">
      <span class="section-number">1</span>
      المعلومات العامة
    </div>
    <table class="data-table">
      <tr>
        <td>إجمالي عدد الموظفين</td>
        <td><strong>${step1.total_employees || 'غير محدد'}</strong></td>
      </tr>
      <tr>
        <td>عدد موظفي تقنية المعلومات</td>
        <td><strong>${step1.it_staff || 'غير محدد'}</strong></td>
      </tr>
      <tr>
        <td>عدد موظفي الأمن السيبراني</td>
        <td><strong>${step1.cybersecurity_staff || 'غير محدد'}</strong></td>
      </tr>
      ${step1.total_employees ? `
      <tr>
        <td>نسبة موظفي تقنية المعلومات</td>
        <td><strong>${((step1.it_staff / step1.total_employees) * 100).toFixed(2)}%</strong></td>
      </tr>
      <tr>
        <td>نسبة موظفي الأمن السيبراني</td>
        <td><strong>${((step1.cybersecurity_staff / step1.total_employees) * 100).toFixed(2)}%</strong>
        ${(step1.cybersecurity_staff / step1.total_employees) < 0.01 ? '<span class="badge badge-danger" style="margin-right: 10px;">أقل من 1%</span>' : ''}
        </td>
      </tr>
      ` : ''}
    </table>
  </div>

  <!-- Step 2: Infrastructure -->
  <div class="section">
    <div class="section-header">
      <span class="section-number">2</span>
      البنية التحتية الرقمية
    </div>
    <table class="data-table">
      <tr>
        <td>هل لديكم بنية تحتية رقمية؟</td>
        <td><strong>${step2.has_infrastructure === 'yes' ? '✅ نعم' : '❌ لا'}</strong></td>
      </tr>
      ${step2.has_infrastructure === 'yes' ? `
      <tr>
        <td>عدد مراكز البيانات</td>
        <td><strong>${step2.data_center_count || 0}</strong></td>
      </tr>
      <tr>
        <td>الخوادم الفيزيائية</td>
        <td><strong>${step2.physical_servers || 0}</strong></td>
      </tr>
      <tr>
        <td>الخوادم الافتراضية</td>
        <td><strong>${step2.virtual_servers || 0}</strong></td>
      </tr>
      <tr>
        <td>سعة التخزين الإجمالية</td>
        <td><strong>${step2.storage_amount || 0} ${step2.storage_unit || 'TB'}</strong></td>
      </tr>
      <tr>
        <td>البنية التحتية مدارة من قبل</td>
        <td><strong>${step2.infrastructure_managed_by === 'internal' ? 'الجهة نفسها' : step2.infrastructure_managed_by === 'third_party' ? `طرف ثالث (${step2.third_party_name || ''})` : step2.infrastructure_managed_by === 'hybrid' ? `مشترك (${step2.third_party_name || ''})` : 'غير محدد'}</strong></td>
      </tr>
      <tr>
        <td>هل يوجد سجل محدث ودقيق لجميع الأصول التقنية؟</td>
        <td><strong>${step2.has_accurate_asset_register === 'yes' ? '✅ نعم' : step2.has_accurate_asset_register === 'no' ? '❌ لا' : 'غير محدد'}</strong></td>
      </tr>
      <tr>
        <td>أنواع الشبكات</td>
        <td>
          <div class="tags">
            ${(step2.network_types || []).map(type => `<span class="tag">${type.toUpperCase()}</span>`).join('')}
            ${step2.network_types_other ? `<span class="tag">${step2.network_types_other}</span>` : ''}
          </div>
        </td>
      </tr>
      ` : ''}
    </table>

    ${step2.inventory && step2.inventory.length > 0 ? `
      <h4 style="margin: 20px 0 10px 0; color: #1f2937;">📦 جرد الأجهزة والمعدات:</h4>
      <table class="inventory-table">
        <thead>
          <tr>
            <th>النوع</th>
            <th>العلامة التجارية</th>
            <th>الطراز</th>
            <th>الكمية</th>
            <th>سعة التخزين</th>
          </tr>
        </thead>
        <tbody>
          ${step2.inventory.map(item => `
            <tr>
              <td>${item.type || '-'}</td>
              <td>${item.brand || '-'}</td>
              <td>${item.model || '-'}</td>
              <td><strong>${item.quantity || 0}</strong></td>
              <td>${item.storage_amount ? `${item.storage_amount} ${item.storage_unit || 'TB'}` : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
  </div>

  <!-- Step 3: Digital Services -->
  <div class="section">
    <div class="section-header">
      <span class="section-number">3</span>
      الخدمات الرقمية
    </div>
    <table class="data-table">
      <tr>
        <td>أنواع الخدمات المقدمة</td>
        <td>
          <div class="tags">
            ${(step3.services || []).map(service => `<span class="tag">${service}</span>`).join('')}
            ${step3.services_other ? `<span class="tag">${step3.services_other}</span>` : ''}
          </div>
        </td>
      </tr>
      ${step3.service_details ? `
      <tr>
        <td>تفاصيل الخدمة</td>
        <td>${step3.service_details}</td>
      </tr>
      ` : ''}
      <tr>
        <td>هل تم توثيق الخدمات في قاعدة بيانات وطنية؟</td>
        <td><strong>${step3.services_documented === 'yes' ? '✅ نعم' : step3.services_documented === 'no' ? '❌ لا' : 'غير محدد'}</strong></td>
      </tr>
      <tr>
        <td>هل لدى المؤسسة موقع إلكتروني رسمي؟</td>
        <td><strong>${step3.has_official_website === 'yes' ? '✅ نعم' : '❌ لا'}</strong></td>
      </tr>
      ${step3.has_official_website === 'yes' ? `
      <tr>
        <td>من يدير الموقع؟</td>
        <td><strong>${step3.website_managed_by === 'internal' ? 'داخلية' : step3.website_managed_by === 'external' ? `خارجية (${step3.website_external_company_name || ''})` : step3.website_managed_by === 'hybrid' ? `مختلطة (${step3.website_external_company_name || ''})` : 'غير محدد'}</strong></td>
      </tr>
      ` : ''}
      <tr>
        <td>نوع النطاق (Domain)</td>
        <td><strong>${step3.domain_type || 'غير محدد'}</strong>
        ${step3.domain_type === '.gov.iq' ? '<span class="badge badge-success" style="margin-right: 10px;">✓ نطاق حكومي</span>' : ''}
        ${step3.domain_type === 'other' && step3.domain_type_other ? `<span class="badge badge-info" style="margin-right: 10px;">${step3.domain_type_other}</span>` : ''}
        </td>
      </tr>
      <tr>
        <td>هل لدى المؤسسة بريد إلكتروني رسمي؟</td>
        <td><strong>${step3.has_official_email === 'yes' ? '✅ نعم' : '❌ لا'}</strong></td>
      </tr>
      ${step3.has_official_email === 'yes' ? `
      <tr>
        <td>اسم النطاق للبريد</td>
        <td><strong>${step3.email_domain_name || 'غير محدد'}</strong></td>
      </tr>
      <tr>
        <td>نوع البريد الإلكتروني</td>
        <td><strong>${step3.email_type === 'internal' ? 'داخلي' : step3.email_type === 'external' ? 'خارجي' : step3.email_type === 'both' ? 'كلاهما' : 'غير محدد'}</strong></td>
      </tr>
      <tr>
        <td>عدد مستخدمي البريد الإلكتروني</td>
        <td><strong>${step3.email_users || 0}</strong></td>
      </tr>
      <tr>
        <td>هل يوجد حماية على البريد؟</td>
        <td><strong>${step3.email_protection === 'yes' ? '✅ يوجد' : '❌ لا يوجد'}</strong></td>
      </tr>
      ` : ''}
    </table>
  </div>

  <!-- Step 4: Cybersecurity -->
  <div class="section" style="page-break-before: always;">
    <div class="section-header">
      <span class="section-number">4</span>
      الأمن السيبراني (أهم قسم - 30 نقطة)
    </div>
    
    <h4 style="margin: 15px 0 10px 0; color: #1f2937;">📜 معايير الامتثال:</h4>
    ${(step4.compliance && step4.compliance.length > 0) ? `
      <div class="tags">
        ${step4.compliance.map(standard => {
          const level = step4.compliance_levels ? step4.compliance_levels[standard] : '';
          const levelText = level === 'full' ? ' (كلي)' : level === 'partial' ? ' (جزئي)' : '';
          return `<span class="tag" style="background: #10b981;">${standard}${levelText}</span>`;
        }).join('')}
      </div>
    ` : '<div class="warning-box"><strong>⚠️ تحذير:</strong> لا توجد معايير امتثال مطبقة</div>'}

    <table class="data-table" style="margin-top: 20px;">
      <tr>
        <td>هل يوجد وحدة/فريق مختص بالأمن السيبراني؟</td>
        <td><strong>${step4.has_cybersecurity_unit === 'yes' ? '✅ نعم' : '❌ لا'}</strong></td>
      </tr>
    </table>

    <h4 style="margin: 20px 0 10px 0; color: #1f2937;">🛡️ أدوات وحلول الأمن السيبراني:</h4>
    ${(step4.security_tools && step4.security_tools.length > 0) ? `
      <div class="tags">
        ${step4.security_tools.map(tool => `<span class="tag">${tool.toUpperCase()}</span>`).join('')}
        ${step4.security_tools_other ? `<span class="tag">${step4.security_tools_other}</span>` : ''}
      </div>
      
      ${!step4.security_tools.includes('iam') ? '<div class="warning-box"><strong>⚠️ مفقود:</strong> إدارة الهوية والوصول (IAM)</div>' : ''}
      ${!step4.security_tools.includes('backup') ? '<div class="warning-box"><strong>⚠️ مفقود:</strong> نظام النسخ الاحتياطي</div>' : ''}
      ${!step4.security_tools.includes('firewall') ? '<div class="warning-box"><strong>⚠️ مفقود:</strong> جدار الحماية (Firewall)</div>' : ''}
      
      ${step4.security_tools.includes('iam') && step4.security_tools.includes('backup') && step4.security_tools.includes('firewall') ? 
        '<div class="success-box"><strong>✅ ممتاز!</strong> جميع الأدوات الحرجة مطبقة</div>' : ''}
    ` : '<div class="warning-box"><strong>⚠️ تحذير:</strong> لا توجد أدوات أمن سيبراني مطبقة</div>'}

    <table class="data-table" style="margin-top: 20px;">
      <tr>
        <td>هل يتم تطبيق المصادقة متعددة العوامل (MFA)؟</td>
        <td><strong>${step4.has_mfa === 'yes' ? '✅ نعم' : '❌ لا'}</strong></td>
      </tr>
      <tr>
        <td>هل يتم مراجعة صلاحيات المستخدمين بشكل دوري؟</td>
        <td><strong>${step4.user_permissions_review === 'yes' ? '✅ نعم (كل 90 يوم)' : '❌ لا'}</strong></td>
      </tr>
      <tr>
        <td>هل يخضع جميع الموظفين لبرنامج تدريب أمني دوري؟</td>
        <td><strong>${step4.security_training_program === 'yes' ? '✅ نعم' : '❌ لا'}</strong></td>
      </tr>
    </table>
  </div>

  <!-- Step 5: Monitoring -->
  <div class="section">
    <div class="section-header">
      <span class="section-number">5</span>
      المراقبة والموافقات
    </div>
    <table class="data-table">
      <tr>
        <td>الموافقة الأمنية</td>
        <td><strong>${step5.security_approval === 'yes' ? '✅ تم الحصول عليها' : step5.security_approval === 'no' ? '❌ لم يتم' : 'غير محدد'}</strong></td>
      </tr>
      ${step5.security_approval === 'yes' && step5.security_approval_authority ? `
      <tr>
        <td>اسم الجهة المانحة للموافقة الأمنية</td>
        <td><strong>${step5.security_approval_authority}</strong></td>
      </tr>
      <tr>
        <td>تاريخ الموافقة</td>
        <td><strong>${step5.security_approval_date ? format(new Date(step5.security_approval_date), 'yyyy-MM-dd') : 'غير محدد'}</strong></td>
      </tr>
      ` : ''}
      ${step5.security_approval === 'no' && step5.security_approval_reason ? `
      <tr>
        <td>سبب عدم الحصول على الموافقة</td>
        <td>${step5.security_approval_reason}</td>
      </tr>
      ` : ''}
      <tr>
        <td>اتفاقية السرية (NDA)</td>
        <td><strong>${step5.nda_signed === 'yes' ? '✅ موقعة' : step5.nda_signed === 'no' ? '❌ غير موقعة' : 'لا ينطبق'}</strong></td>
      </tr>
    </table>
  </div>

  <!-- Step 6: Branches Info -->
  <div class="section">
    <div class="section-header">
      <span class="section-number">6</span>
      معلومات الفروع
    </div>
    <table class="data-table">
      <tr>
        <td>هل لديكم فروع/جهات تابعة؟</td>
        <td><strong>${step6.has_subsidiaries === 'yes' ? `✅ نعم (${step6.subsidiary_count || 0} فرع)` : '❌ لا'}</strong></td>
      </tr>
      <tr>
        <td>هل يوجد مدقق أمن معلومات خارجي؟</td>
        <td><strong>${step6.has_external_security_auditor === 'yes' ? '✅ نعم' : '❌ لا'}</strong></td>
      </tr>
      ${step6.has_external_security_auditor === 'yes' && step6.external_security_auditor_name ? `
      <tr>
        <td>اسم المدقق الأمني/الجهة السيبرانية</td>
        <td><strong>${step6.external_security_auditor_name}</strong></td>
      </tr>
      ` : ''}
    </table>
  </div>

  <!-- Step 7: Advanced Technical -->
  <div class="section" style="page-break-before: always;">
    <div class="section-header">
      <span class="section-number">7</span>
      التقنيات المتقدمة
    </div>
    <table class="data-table">
      <tr>
        <td>المحاكاة الافتراضية (Virtualization)</td>
        <td><strong>${step7.uses_virtualization === 'yes' ? `✅ نعم${step7.virtualization_type ? ` (${step7.virtualization_type})` : ''}${step7.virtualization_type === 'other' && step7.virtualization_type_other ? ` - ${step7.virtualization_type_other}` : ''}` : step7.uses_virtualization === 'no' ? '❌ لا' : 'قيد التخطيط'}</strong></td>
      </tr>
      <tr>
        <td>تكامل الواجهات البرمجية (APIs)</td>
        <td><strong>${step7.api_integration === 'yes' ? `✅ نعم${step7.api_entity_name ? ` (${step7.api_entity_name})` : ''}` : step7.api_integration === 'no' ? '❌ لا' : 'قيد التخطيط'}</strong></td>
      </tr>
      <tr>
        <td>هل يتم إجراء نسخ احتياطي بانتظام؟</td>
        <td><strong>${step7.regular_backup === 'yes' ? '✅ نعم' : '❌ لا'}</strong></td>
      </tr>
      <tr>
        <td>هل يتم اختبار النسخ الاحتياطية؟</td>
        <td><strong>${step7.backup_testing === 'yes' ? '✅ نعم' : '❌ لا'}</strong></td>
      </tr>
      <tr>
        <td>عدد المستخدمين الداخليين</td>
        <td><strong>${step7.digital_users_internal || 0}</strong></td>
      </tr>
      <tr>
        <td>عدد المستخدمين الخارجيين</td>
        <td><strong>${step7.digital_users_external || 0}</strong></td>
      </tr>
      <tr>
        <td>الاعتماد على الأنظمة الرقمية مقابل الورقية</td>
        <td><strong>${
          step7.digital_vs_paper_reliance === 'fully_digital' ? '✅ تحول رقمي كامل (100%)' :
          step7.digital_vs_paper_reliance === 'mostly_digital' ? 'معظم العمليات رقمية (75-99%)' :
          step7.digital_vs_paper_reliance === 'mixed' ? 'مختلط (50-74%)' :
          step7.digital_vs_paper_reliance === 'mostly_paper' ? '⚠️ معظم العمليات ورقية (25-49%)' :
          step7.digital_vs_paper_reliance === 'mostly_paper_low' ? '❌ معظم العمليات ورقية (<25%)' :
          'غير محدد'
        }</strong></td>
      </tr>
      <tr>
        <td>تكرار اختبارات الاختراق</td>
        <td><strong>${
          step7.pentesting_frequency === 'quarterly' ? '✅ ربع سنوي (ممتاز)' : 
          step7.pentesting_frequency === 'semi-annual' ? 'نصف سنوي' :
          step7.pentesting_frequency === 'yearly' ? 'سنوي' : 
          step7.pentesting_frequency === 'ad-hoc' ? 'عند الحاجة' :
          step7.pentesting_frequency === 'never' ? '❌ لا يتم' : 
          'غير محدد'
        }</strong>
        ${step7.pentesting_frequency === 'never' ? '<span class="badge badge-danger" style="margin-right: 10px;">يتطلب اهتمام</span>' : ''}
        </td>
      </tr>
      <tr>
        <td>مركز العمليات الأمنية (SOC)</td>
        <td><strong>${step7.has_soc === 'yes' ? '✅ يوجد' : step7.has_soc === 'outsourced' ? '✅ خارجي' : '❌ لا يوجد'}</strong></td>
      </tr>
      <tr>
        <td>مركز عمليات الشبكة (NOC)</td>
        <td><strong>${step7.has_noc === 'yes' ? '✅ يوجد' : step7.has_noc === 'outsourced' ? '✅ خارجي' : '❌ لا يوجد'}</strong></td>
      </tr>
      <tr>
        <td>خطة التعافي من الكوارث</td>
        <td><strong>${step7.disaster_recovery === 'yes' ? '✅ يوجد' : step7.disaster_recovery === 'no' ? '❌ لا يوجد' : 'قيد التطوير'}</strong></td>
      </tr>
      <tr>
        <td>هل يوجد ربط بين الفروع؟</td>
        <td><strong>${step7.branches_connected === 'yes' ? `✅ نعم (${step7.connected_branches_count || 0} فرع - ${step7.connection_type || 'غير محدد'})` : '❌ لا'}</strong></td>
      </tr>
      <tr>
        <td>تقارير دورية للمركز الوطني</td>
        <td><strong>${
          step7.national_center_cybersecurity_reports === 'yes_monthly' ? '✅ نعم - شهرياً' :
          step7.national_center_cybersecurity_reports === 'yes_quarterly' ? '✅ نعم - ربع سنوي' :
          step7.national_center_cybersecurity_reports === 'yes_yearly' ? '✅ نعم - سنوي' :
          step7.national_center_cybersecurity_reports === 'no' ? '❌ لا' :
          'غير محدد'
        }</strong></td>
      </tr>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p><strong>نظام تقييم النضج الرقمي والأمن السيبراني</strong></p>
    <p>تاريخ إنشاء التقرير: ${format(new Date(), 'yyyy-MM-dd HH:mm')}</p>
    <p>جميع الحقوق محفوظة © ${new Date().getFullYear()}</p>
  </div>
</body>
</html>
  `;
}

export default generateAssessmentPDF;
