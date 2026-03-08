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

export async function generateStatisticsReport(stats) {
  let browser;
  
  try {
    console.log('Launching Puppeteer browser...');
    
    // V-06: removed --no-sandbox; run as non-root user in production
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu'
      ]
    });

    console.log('Browser launched successfully');
    
    const page = await browser.newPage();
    console.log('New page created');
    
    const htmlContent = generateStatisticsHTML(stats);
    console.log('HTML content generated, length:', htmlContent.length);
    
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    console.log('HTML content set on page');
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '12mm',
        bottom: '15mm',
        left: '12mm'
      }
    });

    console.log('PDF generated successfully, size:', pdfBuffer.length);
    return pdfBuffer;
    
  } catch (error) {
    console.error('Error in generateStatisticsReport:', error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('Browser closed');
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
}

function generateStatisticsHTML(stats) {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>التقرير الإحصائي الشامل</title>
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
      background: white;
    }

    .header {
      background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 32px;
      font-weight: 900;
      margin-bottom: 10px;
    }

    .header p {
      font-size: 16px;
      opacity: 0.9;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }

    .card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-right: 4px solid #2563eb;
    }

    .card-title {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .card-value {
      font-size: 28px;
      font-weight: 900;
      color: #1f2937;
      margin-bottom: 4px;
    }

    .card-subtitle {
      font-size: 10px;
      color: #9ca3af;
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

    .section-icon {
      margin-left: 10px;
      font-size: 22px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }

    .stat-box {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      border-right: 3px solid #3b82f6;
    }

    .stat-label {
      font-size: 11px;
      color: #6b7280;
      font-weight: 600;
      margin-bottom: 5px;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #1f2937;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }

    .table thead {
      background: #1f2937;
      color: white;
    }

    .table th {
      padding: 10px;
      text-align: right;
      font-weight: 700;
      font-size: 12px;
    }

    .table td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 11px;
    }

    .table tbody tr:hover {
      background: #f9fafb;
    }

    .alert {
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 15px;
    }

    .alert-danger {
      background: #fee2e2;
      border-right: 4px solid #ef4444;
      color: #991b1b;
    }

    .alert-warning {
      background: #fef3c7;
      border-right: 4px solid #f59e0b;
      color: #92400e;
    }

    .alert-success {
      background: #d1fae5;
      border-right: 4px solid #10b981;
      color: #065f46;
    }

    .alert-title {
      font-weight: 700;
      margin-bottom: 8px;
      font-size: 13px;
    }

    .alert-content {
      font-size: 11px;
    }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 700;
    }

    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }

    .badge-danger {
      background: #fee2e2;
      color: #991b1b;
    }

    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }

    .recommendations {
      margin-top: 30px;
    }

    .recommendation-item {
      background: white;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border-right: 4px solid #f59e0b;
    }

    .recommendation-title {
      font-weight: 700;
      font-size: 13px;
      margin-bottom: 8px;
      color: #92400e;
    }

    .recommendation-desc {
      font-size: 11px;
      color: #4b5563;
      margin-bottom: 8px;
    }

    .recommendation-action {
      background: #fef3c7;
      padding: 10px;
      border-radius: 6px;
      font-size: 10px;
      color: #78350f;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 10px;
    }

    .progress-bar {
      width: 100%;
      height: 20px;
      background: #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
      margin-top: 5px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #059669);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 10px;
      font-weight: 700;
    }

    .entity-list {
      font-size: 10px;
      color: #4b5563;
      margin-top: 8px;
      padding-right: 15px;
    }

    .entity-list li {
      margin-bottom: 3px;
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
    <h1>🎯 التقرير الإحصائي الشامل للنضج الرقمي والأمن السيبراني</h1>
    <p>تحليل متقدم لجميع الجهات الحكومية المسجلة في النظام</p>
    <p style="margin-top: 10px; font-size: 14px;">تاريخ التقرير: ${format(new Date(), 'yyyy-MM-dd HH:mm')}</p>
  </div>

  <!-- Summary Cards -->
  <div class="summary-cards">
    <div class="card" style="border-right-color: #3b82f6;">
      <div class="card-title">إجمالي الجهات</div>
      <div class="card-value">${stats.summary.total_entities}</div>
      <div class="card-subtitle">${stats.summary.total_ministries} وزارة | ${stats.summary.total_branches} فرع</div>
    </div>
    <div class="card" style="border-right-color: #10b981;">
      <div class="card-title">التقييمات المكتملة</div>
      <div class="card-value">${stats.summary.total_completed}</div>
      <div class="card-subtitle">من أصل ${stats.summary.total_assessments} تقييم</div>
    </div>
    <div class="card" style="border-right-color: #8b5cf6;">
      <div class="card-title">متوسط النضج الرقمي</div>
      <div class="card-value">${stats.summary.average_maturity_score.toFixed(1)}</div>
      <div class="card-subtitle">من 100</div>
    </div>
    <div class="card" style="border-right-color: #ef4444;">
      <div class="card-title">جهات عالية المخاطر</div>
      <div class="card-value">${stats.riskDistribution.high + stats.riskDistribution.critical}</div>
      <div class="card-subtitle">تتطلب تدخل عاجل</div>
    </div>
  </div>

  <!-- Risk Distribution -->
  <div class="section">
    <div class="section-header">
      <span class="section-icon">📊</span>
      توزيع مستويات المخاطر
    </div>
    <div class="stats-grid">
      <div class="stat-box" style="border-right-color: #10b981;">
        <div class="stat-label">منخفض</div>
        <div class="stat-value">${stats.riskDistribution.low}</div>
      </div>
      <div class="stat-box" style="border-right-color: #f59e0b;">
        <div class="stat-label">متوسط</div>
        <div class="stat-value">${stats.riskDistribution.medium}</div>
      </div>
      <div class="stat-box" style="border-right-color: #ef4444;">
        <div class="stat-label">عالي</div>
        <div class="stat-value">${stats.riskDistribution.high}</div>
      </div>
    </div>
    ${stats.riskDistribution.high_risk_entities.length > 0 ? `
      <div class="alert alert-danger">
        <div class="alert-title">⚠️ جهات تتطلب تدخل عاجل (${stats.riskDistribution.high_risk_entities.length}):</div>
        <ul class="entity-list">
          ${stats.riskDistribution.high_risk_entities.map(e => `
            <li>• ${e.name} - درجة: ${e.score || 'غير محدد'} (${e.level})</li>
          `).join('')}
        </ul>
      </div>
    ` : ''}
  </div>

  <!-- Workforce Analysis -->
  <div class="section">
    <div class="section-header">
      <span class="section-icon">👥</span>
      تحليل القوى البشرية
    </div>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">متوسط نسبة موظفي الأمن السيبراني</div>
        <div class="stat-value">${stats.workforce.average_cyber_ratio.toFixed(2)}%</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">إجمالي موظفي الأمن السيبراني</div>
        <div class="stat-value">${stats.workforce.total_cyber_staff}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">جهات تعاني من عجز حاد</div>
        <div class="stat-value">${stats.workforce.entities_with_deficit}</div>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-box" style="background: #d1fae5;">
        <div class="stat-label">ممتاز (≥2%)</div>
        <div class="stat-value">${stats.workforce.distribution.excellent}</div>
      </div>
      <div class="stat-box" style="background: #dbeafe;">
        <div class="stat-label">جيد (1-2%)</div>
        <div class="stat-value">${stats.workforce.distribution.good}</div>
      </div>
      <div class="stat-box" style="background: #fef3c7;">
        <div class="stat-label">مقبول (0.5-1%)</div>
        <div class="stat-value">${stats.workforce.distribution.acceptable}</div>
      </div>
    </div>
    ${stats.workforce.entities_with_deficit > 0 ? `
      <div class="alert alert-warning">
        <div class="alert-title">⚠️ جهات تعاني من نقص حاد في الكوادر (&lt;0.5%):</div>
        <ul class="entity-list">
          ${stats.workforce.deficit_entities.slice(0, 10).map(e => `
            <li>• ${e.name} - نسبة: ${e.ratio}% (${e.staff} موظف)</li>
          `).join('')}
          ${stats.workforce.deficit_entities.length > 10 ? `<li>... و ${stats.workforce.deficit_entities.length - 10} جهة أخرى</li>` : ''}
        </ul>
      </div>
    ` : ''}
  </div>

  <!-- Compliance Analysis -->
  <div class="section" style="page-break-before: always;">
    <div class="section-header">
      <span class="section-icon">📜</span>
      تحليل الامتثال للمعايير
    </div>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">ISO 27001</div>
        <div class="stat-value">${stats.compliance.iso27001.percentage.toFixed(1)}%</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${stats.compliance.iso27001.percentage}%">
            ${stats.compliance.iso27001.total} جهة
          </div>
        </div>
      </div>
      <div class="stat-box">
        <div class="stat-label">NIST Framework</div>
        <div class="stat-value">${stats.compliance.nist.percentage.toFixed(1)}%</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${stats.compliance.nist.percentage}%">
            ${stats.compliance.nist.total} جهة
          </div>
        </div>
      </div>
      <div class="stat-box">
        <div class="stat-label">بدون معايير امتثال</div>
        <div class="stat-value" style="color: #ef4444;">${stats.compliance.no_compliance}</div>
      </div>
    </div>
    <table class="table">
      <thead>
        <tr>
          <th>المعيار</th>
          <th>كلي</th>
          <th>جزئي</th>
          <th>غير ممتثل</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>ISO 27001</strong></td>
          <td><span class="badge badge-success">${stats.compliance.iso27001.full}</span></td>
          <td><span class="badge badge-warning">${stats.compliance.iso27001.partial}</span></td>
          <td><span class="badge badge-danger">${stats.compliance.iso27001.none}</span></td>
        </tr>
        <tr>
          <td><strong>NIST</strong></td>
          <td><span class="badge badge-success">${stats.compliance.nist.full}</span></td>
          <td><span class="badge badge-warning">${stats.compliance.nist.partial}</span></td>
          <td><span class="badge badge-danger">${stats.compliance.nist.none}</span></td>
        </tr>
      </tbody>
    </table>
    ${stats.compliance.entities_without_compliance.length > 0 ? `
      <div class="alert alert-danger">
        <div class="alert-title">❌ جهات بدون أي معيار امتثال (${stats.compliance.no_compliance}):</div>
        <ul class="entity-list">
          ${stats.compliance.entities_without_compliance.slice(0, 15).map(e => `<li>• ${e}</li>`).join('')}
          ${stats.compliance.entities_without_compliance.length > 15 ? `<li>... و ${stats.compliance.entities_without_compliance.length - 15} جهة أخرى</li>` : ''}
        </ul>
      </div>
    ` : ''}
  </div>

  <!-- Digital Transformation -->
  <div class="section">
    <div class="section-header">
      <span class="section-icon">🚀</span>
      التحول الرقمي
    </div>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">متوسط النضج الرقمي</div>
        <div class="stat-value">${stats.digitalTransformation.average_digital_score.toFixed(1)}%</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">جهات متقدمة رقمياً</div>
        <div class="stat-value">${stats.digitalTransformation.fully_digital + stats.digitalTransformation.mostly_digital}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">فجوة رقمية (&lt;50%)</div>
        <div class="stat-value" style="color: #ef4444;">${stats.digitalTransformation.digital_gap}</div>
      </div>
    </div>
    <table class="table">
      <thead>
        <tr>
          <th>مستوى التحول</th>
          <th>عدد الجهات</th>
          <th>النسبة المئوية</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>تحول رقمي كامل (100%)</td>
          <td><strong>${stats.digitalTransformation.fully_digital}</strong></td>
          <td><span class="badge badge-success">${((stats.digitalTransformation.fully_digital / stats.summary.total_assessments) * 100).toFixed(1)}%</span></td>
        </tr>
        <tr>
          <td>معظم العمليات رقمية (75-99%)</td>
          <td><strong>${stats.digitalTransformation.mostly_digital}</strong></td>
          <td><span class="badge badge-success">${((stats.digitalTransformation.mostly_digital / stats.summary.total_assessments) * 100).toFixed(1)}%</span></td>
        </tr>
        <tr>
          <td>مختلط (50-74%)</td>
          <td><strong>${stats.digitalTransformation.mixed}</strong></td>
          <td><span class="badge badge-warning">${((stats.digitalTransformation.mixed / stats.summary.total_assessments) * 100).toFixed(1)}%</span></td>
        </tr>
        <tr>
          <td>معظمها ورقية (25-49%)</td>
          <td><strong>${stats.digitalTransformation.mostly_paper}</strong></td>
          <td><span class="badge badge-danger">${((stats.digitalTransformation.mostly_paper / stats.summary.total_assessments) * 100).toFixed(1)}%</span></td>
        </tr>
        <tr>
          <td>ورقية جداً (&lt;25%)</td>
          <td><strong>${stats.digitalTransformation.mostly_paper_low}</strong></td>
          <td><span class="badge badge-danger">${((stats.digitalTransformation.mostly_paper_low / stats.summary.total_assessments) * 100).toFixed(1)}%</span></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Critical Gaps -->
  <div class="section" style="page-break-before: always;">
    <div class="section-header">
      <span class="section-icon">⚠️</span>
      الثغرات الحرجة
    </div>
    ${stats.criticalGaps.critical_entities.length > 0 ? `
      <div class="alert alert-danger">
        <div class="alert-title">🚨 تنبيه حرج: ${stats.criticalGaps.critical_entities.length} جهة تفتقر لـ 3+ متطلبات أساسية</div>
        <ul class="entity-list">
          ${stats.criticalGaps.critical_entities.slice(0, 10).map(e => `
            <li><strong>• ${e.name}</strong> - الثغرات: ${e.gaps.map(g => g.replace('no_', '')).join(', ')}</li>
          `).join('')}
          ${stats.criticalGaps.critical_entities.length > 10 ? `<li>... و ${stats.criticalGaps.critical_entities.length - 10} جهة أخرى</li>` : ''}
        </ul>
      </div>
    ` : ''}
    <table class="table">
      <thead>
        <tr>
          <th>المتطلب الأساسي</th>
          <th>الجهات التي تفتقده</th>
          <th>النسبة المئوية</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>SOC - مركز العمليات الأمنية</td>
          <td><strong>${stats.criticalGaps.soc.missing}</strong></td>
          <td><span class="badge badge-danger">${stats.criticalGaps.soc.percentage.toFixed(1)}%</span></td>
        </tr>
        <tr>
          <td>NOC - مركز عمليات الشبكة</td>
          <td><strong>${stats.criticalGaps.noc.missing}</strong></td>
          <td><span class="badge badge-danger">${stats.criticalGaps.noc.percentage.toFixed(1)}%</span></td>
        </tr>
        <tr>
          <td>خطة التعافي من الكوارث</td>
          <td><strong>${stats.criticalGaps.disaster_recovery.missing}</strong></td>
          <td><span class="badge badge-danger">${stats.criticalGaps.disaster_recovery.percentage.toFixed(1)}%</span></td>
        </tr>
        <tr>
          <td>MFA - المصادقة متعددة العوامل</td>
          <td><strong>${stats.criticalGaps.mfa.missing}</strong></td>
          <td><span class="badge badge-warning">${stats.criticalGaps.mfa.percentage.toFixed(1)}%</span></td>
        </tr>
        <tr>
          <td>النسخ الاحتياطي</td>
          <td><strong>${stats.criticalGaps.backup.missing}</strong></td>
          <td><span class="badge badge-warning">${stats.criticalGaps.backup.percentage.toFixed(1)}%</span></td>
        </tr>
        <tr>
          <td>برامج التدريب الأمني</td>
          <td><strong>${stats.criticalGaps.training.missing}</strong></td>
          <td><span class="badge badge-warning">${stats.criticalGaps.training.percentage.toFixed(1)}%</span></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Infrastructure -->
  <div class="section">
    <div class="section-header">
      <span class="section-icon">🖥️</span>
      البنية التحتية
    </div>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">مراكز البيانات</div>
        <div class="stat-value">${stats.infrastructure.total_data_centers}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">الخوادم الفيزيائية</div>
        <div class="stat-value">${stats.infrastructure.total_physical_servers}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">الخوادم الافتراضية</div>
        <div class="stat-value">${stats.infrastructure.total_virtual_servers}</div>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">سعة التخزين الكلية</div>
        <div class="stat-value">${stats.infrastructure.total_storage_pb.toFixed(2)} PB</div>
        <div class="card-subtitle">${stats.infrastructure.total_storage_tb.toFixed(0)} TB</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">نسبة اعتماد الافتراضية</div>
        <div class="stat-value">${stats.infrastructure.virtualization_adoption.toFixed(1)}%</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">الإدارة الداخلية / الخارجية</div>
        <div class="stat-value">${stats.infrastructure.management.internal} / ${stats.infrastructure.management.third_party}</div>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-box" style="background: ${stats.infrastructure.asset_register.percentage >= 70 ? '#d1fae5' : stats.infrastructure.asset_register.percentage >= 50 ? '#fef3c7' : '#fee2e2'};">
        <div class="stat-label">سجل الأصول التقنية محدث ودقيق</div>
        <div class="stat-value">${stats.infrastructure.asset_register.with_register}</div>
        <div class="card-subtitle">${stats.infrastructure.asset_register.percentage}% من الجهات</div>
      </div>
      <div class="stat-box" style="background: ${stats.infrastructure.asset_register.percentage >= 70 ? '#fee2e2' : stats.infrastructure.asset_register.percentage >= 50 ? '#fee2e2' : '#fef3c7'};">
        <div class="stat-label">بدون سجل أصول محدث</div>
        <div class="stat-value" style="color: ${stats.infrastructure.asset_register.without_register > 0 ? '#ef4444' : '#6b7280'};">${stats.infrastructure.asset_register.without_register}</div>
        <div class="card-subtitle">يتطلب تحسين</div>
      </div>
    </div>
  </div>

  <!-- Recommendations -->
  <div class="section recommendations" style="page-break-before: always;">
    <div class="section-header">
      <span class="section-icon">💡</span>
      التوصيات الذكية المبنية على التحليل
    </div>
    ${stats.recommendations.length > 0 ? stats.recommendations.map(rec => `
      <div class="recommendation-item" style="border-right-color: ${
        rec.priority === 'critical' ? '#ef4444' :
        rec.priority === 'high' ? '#f59e0b' :
        rec.priority === 'medium' ? '#3b82f6' : '#10b981'
      };">
        <div class="recommendation-title">
          ${rec.priority === 'critical' ? '🚨' : rec.priority === 'high' ? '⚠️' : rec.priority === 'medium' ? '💡' : 'ℹ️'}
          ${rec.title}
          <span class="badge ${
            rec.priority === 'critical' || rec.priority === 'high' ? 'badge-danger' :
            rec.priority === 'medium' ? 'badge-warning' : 'badge-success'
          }" style="margin-right: 10px;">
            ${rec.priority === 'critical' ? 'حرج' : rec.priority === 'high' ? 'عالي' : rec.priority === 'medium' ? 'متوسط' : 'منخفض'}
          </span>
        </div>
        <div class="recommendation-desc">${rec.description}</div>
        <div class="recommendation-action">
          <strong>🎯 الإجراء الموصى به:</strong> ${rec.action}
        </div>
        <div style="margin-top: 8px; font-size: 10px; color: #6b7280;">
          📊 يؤثر على <strong>${rec.affected_entities}</strong> جهة
        </div>
      </div>
    `).join('') : '<p>✅ لا توجد توصيات حرجة حالياً</p>'}
  </div>

  <!-- Footer -->
  <div class="footer">
    <p><strong>نظام تقييم النضج الرقمي والأمن السيبراني</strong></p>
    <p>تم إنشاء هذا التقرير تلقائياً بتاريخ ${format(new Date(), 'yyyy-MM-dd HH:mm')}</p>
    <p>جميع الحقوق محفوظة © ${new Date().getFullYear()}</p>
  </div>
</body>
</html>
  `;
}

export default generateStatisticsReport;
