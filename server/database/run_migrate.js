/**
 * Migration Runner — تشغيل جميع التهجيرات
 * Run: npm run db:migrate  أو  node server/database/run_migrate.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🚀 بدء تشغيل التهجيرات (Migrations)...\n');

    // 1) تهجيرة AuditLog فقط (آمنة مع أي بنية questions موجودة)
    const safePath = path.join(__dirname, 'migrate_safe.sql');
    const safeSql = fs.readFileSync(safePath, 'utf8');
    console.log('📋 تشغيل migrate_safe.sql (auditlog)...');
    await client.query(safeSql);
    console.log('✅ تم.\n');

    // 2) إضافة أنواع الأسئلة (MultiSelect, StaticData, Composite) إن وُجد الملف
    try {
      const multiPath = path.join(__dirname, 'add_question_type_values.sql');
      if (fs.existsSync(multiPath)) {
        const multiSql = fs.readFileSync(multiPath, 'utf8');
        console.log('📋 تشغيل add_question_type_values.sql...');
        await client.query(multiSql);
        console.log('✅ تم.\n');
      } else {
        console.log('⏭️ add_question_type_values.sql غير موجود، تخطي.\n');
      }
    } catch (e) {
      if (e.message && e.message.includes('already exists')) {
        console.log('⏭️ قيم question_type موجودة مسبقاً، تخطي.\n');
      } else {
        throw e;
      }
    }

    // 3) إضافة axis_weights للقوالب (مدير توزيع الأوزان)
    try {
      const axisPath = path.join(__dirname, 'add_axis_weights.sql');
      const axisSql = fs.readFileSync(axisPath, 'utf8');
      console.log('📋 تشغيل add_axis_weights.sql (axis_weights + override_weight)...');
      await client.query(axisSql);
      console.log('✅ تم.\n');
    } catch (e) {
      if (e.message && (e.message.includes('already exists') || e.message.includes('does not exist'))) {
        console.log('⏭️ axis_weights أو الأعمدة موجودة مسبقاً، تخطي.\n');
      } else {
        throw e;
      }
    }

    // التحقق من الجداول
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('auditlog', 'questions', 'templates', 'template_assessments', 'question_answers', 'entities', 'users')
      ORDER BY table_name
    `);
    console.log('📋 الجداول المتوفرة:');
    tables.rows.forEach((r) => console.log('   ✓', r.table_name));

    console.log('\n✨ انتهت التهجيرات بنجاح.');
  } catch (err) {
    console.error('❌ فشل التهجير:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
