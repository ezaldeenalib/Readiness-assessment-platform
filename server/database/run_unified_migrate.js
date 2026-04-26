/**
 * تشغيل الترحيل الموحد - Unified Migration Runner
 * ================================================
 * يجمع جميع عمليات الترحيل في تشغيل واحد
 *
 * الاستخدام:
 *   ترحيل من الصفر (حذف وإعادة إنشاء):  node run_unified_migrate.js --fresh
 *   ترحيل تزايدي (إضافة التعديلات فقط):   node run_unified_migrate.js
 *
 * أو عبر npm:
 *   npm run db:migrate-unified
 *   npm run db:migrate-unified -- --fresh
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isFresh = process.argv.includes('--fresh');

async function runUnifiedMigration() {
  const client = await pool.connect();
  try {
    console.log('🚀 بدء الترحيل الموحد...\n');
    console.log('🚀 Starting unified migration...\n');

    if (isFresh) {
      console.log('⚠️  وضع --fresh: سيتم حذف جميع الجداول وإعادة إنشائها!\n');
      await dropAllTables(client);
    }

    // قراءة وتشغيل ملف الترحيل الموحد
    const migrationPath = path.join(__dirname, 'migrate_unified.sql');
    let sql = fs.readFileSync(migrationPath, 'utf8');

    // استبدال كلمات المرور المزيفة
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    sql = sql.replace(/\$2a\$10\$YourHashedPasswordHere/g, hashedPassword);

    console.log('📋 تشغيل migrate_unified.sql...\n');
    await client.query(sql);

    // التحقق من الجداول
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('📋 الجداول المتوفرة:');
    tables.rows.forEach((r) => console.log(`   ✓ ${r.table_name}`));

    console.log('\n✨ اكتمل الترحيل الموحد بنجاح!');
    if (isFresh) {
      console.log('\n📝 بيانات الدخول الافتراضية:');
      console.log('   Super Admin: admin@system.gov / password123');
      console.log('   Ministry Admin: admin@modt.gov / password123');
      console.log('   Entity User: user@ncc.gov / password123');
    }
    console.log('');
  } catch (err) {
    console.error('❌ فشل الترحيل:', err.message);
    if (err.detail) console.error('   التفاصيل:', err.detail);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function dropAllTables(client) {
  const dropOrder = [
    'assessment_reference_attributes',
    'assessment_reference_values',
    'reference_dictionary',
    'role_permissions',
    'user_roles',
    'user_institutions',
    'question_answers',
    'template_assessments',
    'template_questions',
    'templates',
    'questions',
    'static_data_values',
    'static_data_fields',
    'auditlog',
    'assessment_data',
    'assessments',
    'permissions',
    'roles',
    'entities',
    'users',
    'master_categories',
  ];

  // حذف الـ views أولاً
  await client.query(`DROP VIEW IF EXISTS assessment_summary CASCADE`);
  await client.query(`DROP VIEW IF EXISTS entity_hierarchy CASCADE`);
  await client.query(`DROP VIEW IF EXISTS current_static_data CASCADE`);
  await client.query(`DROP VIEW IF EXISTS template_summary CASCADE`);
  await client.query(`DROP VIEW IF EXISTS assessment_with_template CASCADE`);

  for (const table of dropOrder) {
    try {
      await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`   🗑️  Dropped: ${table}`);
    } catch (e) {
      // تجاهل إذا الجدول غير موجود
    }
  }

  // حذف الأنواع
  await client.query(`DROP TYPE IF EXISTS question_type CASCADE`);
  await client.query(`DROP TYPE IF EXISTS evaluation_rule CASCADE`);
  await client.query(`DROP TYPE IF EXISTS entity_activity_type CASCADE`);
  await client.query(`DROP TYPE IF EXISTS user_role CASCADE`);
  await client.query(`DROP TYPE IF EXISTS assessment_status CASCADE`);

  console.log('   ✅ تم حذف الجداول والأنواع القديمة\n');
}

runUnifiedMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err?.stack || err);
    process.exit(1);
  });
