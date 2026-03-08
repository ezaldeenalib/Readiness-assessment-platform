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
      INSERT INTO AuditLog (table_name, record_id, operation_type, old_value, new_value, performed_by)
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
    console.error('Error logging audit:', error);
    // لا نرمي الخطأ هنا حتى لا نوقف العملية الرئيسية
    // لكن نسجله في الـ console
  }
}

/**
 * الحصول على سجل AuditLog لجدول معين
 * @param {string} tableName - اسم الجدول
 * @param {number} recordId - ID الصف (اختياري)
 * @param {Object} options - خيارات إضافية
 * @returns {Promise<Array>} قائمة بسجلات AuditLog
 */
export async function getAuditLog(tableName, recordId = null, options = {}) {
  const {
    operationType = null,
    limit = 100,
    offset = 0,
    orderBy = 'performed_at',
    orderDirection = 'DESC'
  } = options;

  let sql = `
    SELECT *
    FROM AuditLog
    WHERE table_name = $1
  `;

  const params = [tableName];
  let paramCount = 1;

  if (recordId) {
    paramCount++;
    sql += ` AND record_id = $${paramCount}`;
    params.push(recordId);
  }

  if (operationType) {
    paramCount++;
    sql += ` AND operation_type = $${paramCount}`;
    params.push(operationType);
  }

  sql += ` ORDER BY ${orderBy} ${orderDirection}`;
  paramCount++;
  sql += ` LIMIT $${paramCount}`;
  params.push(limit);
  
  paramCount++;
  sql += ` OFFSET $${paramCount}`;
  params.push(offset);

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
    tableName = 'Answers',
    operationType = null,
    limit = 100,
    offset = 0
  } = options;

  let sql = `
    SELECT 
      al.*,
      a.question_id,
      q.id as question_id,
      q.text_ar as question_text_ar
    FROM AuditLog al
    LEFT JOIN Answers a ON al.table_name = 'Answers' AND al.record_id = a.id
    LEFT JOIN Questions q ON a.question_id = q.id
    WHERE al.table_name = $1
      AND EXISTS (
        SELECT 1 FROM Answers a2 
        WHERE a2.id = al.record_id 
        AND a2.institution_id = $2
      )
  `;

  const params = [tableName, institutionId];
  let paramCount = 2;

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
    FROM AuditLog
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
export async function cleanupOldAuditLogs(daysOld = 365) {
  const result = await pool.query(`
    DELETE FROM AuditLog
    WHERE performed_at < NOW() - INTERVAL '${daysOld} days'
    RETURNING id
  `);

  return result.rowCount;
}
