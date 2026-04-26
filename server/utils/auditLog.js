/**
 * AuditLog Helper Functions
 * دوال مساعدة لتسجيل العمليات في AuditLog
 */

import pool from '../database/db.js';

/**
 * تسجيل عملية في AuditLog
 * @param {Object} client - Database client (for transactions)
 * @param {string} tableName - اسم الجدول المتأثر
 * @param {number} recordId - ID الصف المتأثر
 * @param {string} operationType - نوع العملية: INSERT, UPDATE, DELETE
 * @param {Object|null} oldValue - القيمة القديمة (JSONB)
 * @param {Object|null} newValue - القيمة الجديدة (JSONB)
 * @param {string} performedBy - المستخدم الذي قام بالعملية
 */
export async function logAudit(client, tableName, recordId, operationType, oldValue, newValue, performedBy) {
  try {
    await client.query(`
      INSERT INTO auditlog (table_name, record_id, operation_type, old_value, new_value, performed_by)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      tableName,
      recordId,
      operationType,
      oldValue ? (typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue)) : null,
      newValue ? (typeof newValue === 'string' ? newValue : JSON.stringify(newValue)) : null,
      performedBy
    ]);
  } catch (error) {
    // L-04: Audit failures are security-significant — log with full details
    console.error('[AUDIT FAILURE] Could not write audit record:', {
      table: tableName,
      recordId,
      operation: operationType,
      performedBy,
      error: error.message,
    });
    // Do not re-throw — primary operation should not be blocked by audit failure,
    // but the failure IS logged for investigation.
  }
}

/**
 * الحصول على سجل AuditLog لجدول معين
 * @param {string} tableName - اسم الجدول
 * @param {number} recordId - ID الصف (اختياري)
 * @param {Object} options - خيارات إضافية
 * @returns {Promise<Array>} قائمة بسجلات AuditLog
 */
// V-04: column allowlists to prevent ORDER BY SQL injection
const AUDIT_ALLOWED_COLS = ['performed_at', 'table_name', 'record_id', 'operation_type'];
const AUDIT_ALLOWED_DIRS = ['ASC', 'DESC'];

export async function getAuditLog(tableName, recordId = null, options = {}) {
  const {
    operationType = null,
    limit = 100,
    offset = 0,
    orderBy = 'performed_at',
    orderDirection = 'DESC'
  } = options;

  // V-04: validate ORDER BY column and direction against allowlist
  const safeCol = AUDIT_ALLOWED_COLS.includes(orderBy) ? orderBy : 'performed_at';
  const safeDir = AUDIT_ALLOWED_DIRS.includes((orderDirection || '').toUpperCase())
    ? orderDirection.toUpperCase()
    : 'DESC';

  let sql = `SELECT * FROM auditlog WHERE table_name = $1`;
  const params = [tableName];
  let paramCount = 1;

  if (recordId) {
    sql += ` AND record_id = $${++paramCount}`;
    params.push(recordId);
  }

  if (operationType) {
    sql += ` AND operation_type = $${++paramCount}`;
    params.push(operationType);
  }

  sql += ` ORDER BY ${safeCol} ${safeDir}`;
  sql += ` LIMIT $${++paramCount}`;
  params.push(Math.min(parseInt(limit, 10) || 100, 1000));

  sql += ` OFFSET $${++paramCount}`;
  params.push(Math.max(parseInt(offset, 10) || 0, 0));

  const result = await pool.query(sql, params);
  return result.rows;
}

/**
 * الحصول على سجل AuditLog لمؤسسة معينة
 * @param {number} institutionId - ID المؤسسة
 * @param {Object} options - خيارات إضافية
 * @returns {Promise<Array>} قائمة بسجلات AuditLog
 */
export async function getInstitutionAuditLog(institutionId, options = {}) {
  const {
    tableName = null,
    operationType = null,
    limit = 100,
    offset = 0
  } = options;

  // يدعم: إجابات القوالب (question_answers + assessments) وإجابات المؤسسة (answers)
  let sql = `
    SELECT 
      al.*,
      COALESCE(qa.question_id, a.question_id) AS question_id,
      q.question_text_ar AS question_text_ar
    FROM auditlog al
    LEFT JOIN question_answers qa ON al.table_name = 'question_answers' AND al.record_id = qa.id
    LEFT JOIN template_assessments ta ON qa.template_assessment_id = ta.id
    LEFT JOIN assessments ass ON ta.assessment_id = ass.id
    LEFT JOIN answers a ON al.table_name IN ('answers', 'Answers') AND al.record_id = a.id
    LEFT JOIN questions q ON q.id = COALESCE(qa.question_id, a.question_id)
    WHERE (
      ass.entity_id = $1
      OR a.institution_id = $1
    )
  `;

  const params = [institutionId];
  let paramCount = 1;

  if (tableName) {
    paramCount++;
    sql += ` AND (
      al.table_name = $${paramCount}
      OR ($${paramCount}::text IN ('Answers', 'answers') AND al.table_name IN ('answers', 'Answers', 'question_answers'))
    )`;
    params.push(tableName);
  }

  if (operationType) {
    paramCount++;
    sql += ` AND al.operation_type = $${paramCount}`;
    params.push(operationType);
  }

  sql += ` ORDER BY al.performed_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
  params.push(limit, offset);

  const result = await pool.query(sql, params);
  return result.rows;
}

/**
 * الحصول على إحصائيات AuditLog
 * @param {string} tableName - اسم الجدول
 * @param {number} recordId - ID الصف (اختياري)
 * @returns {Promise<Object>} إحصائيات AuditLog
 */
export async function getAuditStats(tableName, recordId = null) {
  let sql = `
    SELECT 
      operation_type,
      COUNT(*) as count,
      MIN(performed_at) as first_operation,
      MAX(performed_at) as last_operation
    FROM auditlog
    WHERE table_name = $1
  `;

  const params = [tableName];

  if (recordId) {
    sql += ` AND record_id = $2`;
    params.push(recordId);
  }

  sql += ` GROUP BY operation_type`;

  const result = await pool.query(sql, params);
  
  const stats = {
    total: 0,
    by_operation: {},
    first_operation: null,
    last_operation: null
  };

  result.rows.forEach(row => {
    stats.total += parseInt(row.count);
    stats.by_operation[row.operation_type] = parseInt(row.count);
    
    if (!stats.first_operation || row.first_operation < stats.first_operation) {
      stats.first_operation = row.first_operation;
    }
    
    if (!stats.last_operation || row.last_operation > stats.last_operation) {
      stats.last_operation = row.last_operation;
    }
  });

  return stats;
}

/**
 * حذف سجلات AuditLog القديمة (للصيانة)
 * @param {number} daysOld - عدد الأيام (حذف السجلات الأقدم من هذا العدد)
 * @returns {Promise<number>} عدد السجلات المحذوفة
 */
// V-04: parameterized INTERVAL to prevent injection
export async function cleanupOldAuditLogs(daysOld = 365) {
  const safeDays = Math.max(1, Math.floor(Number(daysOld)));
  if (!Number.isFinite(safeDays)) throw new Error('Invalid daysOld value');

  const result = await pool.query(
    `DELETE FROM auditlog WHERE performed_at < NOW() - ($1 * INTERVAL '1 day') RETURNING id`,
    [safeDays]
  );
  return result.rowCount;
}
