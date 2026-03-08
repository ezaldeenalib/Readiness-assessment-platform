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

export async function generateEntitiesPDF(entities) {
  // V-06: removed --no-sandbox; run as non-root user in production
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ]
  });

  try {
    const page = await browser.newPage();
    
    const htmlContent = generateHTMLContent(entities);
    
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
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

function generateHTMLContent(entities) {
  const totalEntities = entities.length;
  const activeEntities = entities.filter(e => e.is_active).length;
  const inactiveEntities = entities.filter(e => !e.is_active).length;
  
  const activityTypeCounts = {
    government: entities.filter(e => e.activity_type === 'government').length,
    mixed: entities.filter(e => e.activity_type === 'mixed').length,
    private: entities.filter(e => e.activity_type === 'private').length,
  };

  const entitiesWithParent = entities.filter(e => e.parent_entity_id).length;
  const entitiesWithoutParent = entities.filter(e => !e.parent_entity_id).length;

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير الجهات</title>
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

    .summary-box {
      background: #f3f4f6;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 25px;
      border-right: 4px solid #2563eb;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-top: 15px;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .summary-label {
      font-weight: 700;
      color: #4b5563;
    }

    .summary-value {
      font-weight: 500;
      color: #1f2937;
    }

    .entities-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .entities-table thead {
      background: #1f2937;
      color: white;
    }

    .entities-table th {
      padding: 12px 15px;
      text-align: right;
      font-weight: 700;
      font-size: 14px;
    }

    .entities-table td {
      padding: 10px 15px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 13px;
    }

    .entities-table tbody tr:hover {
      background: #f9fafb;
    }

    .entities-table tbody tr:last-child td {
      border-bottom: none;
    }

    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
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

    .activity-type {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .activity-government {
      background: #dbeafe;
      color: #1e40af;
    }

    .activity-mixed {
      background: #fef3c7;
      color: #92400e;
    }

    .activity-private {
      background: #e0e7ff;
      color: #3730a3;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }

    .page-break {
      page-break-before: always;
    }

    @media print {
      .page-break {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>📋 تقرير الجهات المسجلة</h1>
    <p>نظام تقييم النضج الرقمي والأمن السيبراني</p>
    <p style="font-size: 14px; margin-top: 8px;">تاريخ التقرير: ${format(new Date(), 'yyyy-MM-dd')}</p>
  </div>

  <!-- Summary -->
  <div class="summary-box">
    <h3 style="margin-bottom: 15px; color: #2563eb; font-size: 20px;">📊 ملخص إحصائي</h3>
    <div class="summary-grid">
      <div class="summary-item">
        <span class="summary-label">إجمالي الجهات:</span>
        <span class="summary-value"><strong>${totalEntities}</strong></span>
      </div>
      <div class="summary-item">
        <span class="summary-label">الجهات النشطة:</span>
        <span class="summary-value"><strong style="color: #10b981;">${activeEntities}</strong></span>
      </div>
      <div class="summary-item">
        <span class="summary-label">الجهات غير النشطة:</span>
        <span class="summary-value"><strong style="color: #ef4444;">${inactiveEntities}</strong></span>
      </div>
      <div class="summary-item">
        <span class="summary-label">جهات حكومية:</span>
        <span class="summary-value"><strong>${activityTypeCounts.government}</strong></span>
      </div>
      <div class="summary-item">
        <span class="summary-label">جهات مختلطة:</span>
        <span class="summary-value"><strong>${activityTypeCounts.mixed}</strong></span>
      </div>
      <div class="summary-item">
        <span class="summary-label">جهات خاصة:</span>
        <span class="summary-value"><strong>${activityTypeCounts.private}</strong></span>
      </div>
      <div class="summary-item">
        <span class="summary-label">جهات تابعة:</span>
        <span class="summary-value"><strong>${entitiesWithParent}</strong></span>
      </div>
      <div class="summary-item">
        <span class="summary-label">جهات رئيسية:</span>
        <span class="summary-value"><strong>${entitiesWithoutParent}</strong></span>
      </div>
    </div>
  </div>

  <!-- Entities Table -->
  <h3 style="margin: 25px 0 15px 0; color: #1f2937; font-size: 18px;">📑 قائمة الجهات</h3>
  <table class="entities-table">
    <thead>
      <tr>
        <th style="width: 5%;">#</th>
        <th style="width: 25%;">اسم الجهة (عربي)</th>
        <th style="width: 25%;">اسم الجهة (إنجليزي)</th>
        <th style="width: 12%;">نوع النشاط</th>
        <th style="width: 15%;">البريد الإلكتروني</th>
        <th style="width: 10%;">الهاتف</th>
        <th style="width: 8%;">الحالة</th>
      </tr>
    </thead>
    <tbody>
      ${entities.map((entity, index) => `
        <tr>
          <td style="text-align: center; font-weight: 600;">${index + 1}</td>
          <td><strong>${escapeHtml(entity.name_ar || '-')}</strong></td>
          <td>${escapeHtml(entity.name || '-')}</td>
          <td>
            <span class="activity-type activity-${escapeHtml(entity.activity_type)}">
              ${entity.activity_type === 'government' ? 'حكومي' :
                entity.activity_type === 'mixed' ? 'مختلط' : 'خاص'}
            </span>
          </td>
          <td>${escapeHtml(entity.contact_email || '-')}</td>
          <td>${escapeHtml(entity.contact_phone || '-')}</td>
          <td>
            ${entity.is_active ?
              '<span class="badge badge-success">نشط</span>' :
              '<span class="badge badge-danger">غير نشط</span>'}
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  ${entities.some(e => e.address) ? `
    <div class="page-break"></div>
    <h3 style="margin: 25px 0 15px 0; color: #1f2937; font-size: 18px;">📍 العناوين</h3>
    <table class="entities-table">
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 30%;">اسم الجهة</th>
          <th style="width: 65%;">العنوان</th>
        </tr>
      </thead>
      <tbody>
        ${entities.filter(e => e.address).map((entity, index) => `
          <tr>
            <td style="text-align: center; font-weight: 600;">${index + 1}</td>
            <td><strong>${escapeHtml(entity.name_ar || entity.name || '-')}</strong></td>
            <td>${escapeHtml(entity.address)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    <p>تم إنشاء هذا التقرير تلقائياً من نظام تقييم النضج الرقمي والأمن السيبراني</p>
    <p style="margin-top: 5px;">تاريخ الطباعة: ${format(new Date(), 'yyyy-MM-dd HH:mm')}</p>
  </div>
</body>
</html>
  `;
}
