/**
 * Migration: Update question_answers and template_questions tables
 * تشغيل: node server/database/run_update_question_tables.js
 * 
 * التعديلات:
 * 1. حذف حقول من question_answers
 * 2. إضافة حقل include_in_evaluation إلى template_questions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runUpdateMigration() {
  const client = await pool.connect();
  try {
    console.log('🚀 بدء تشغيل Migration تحديث الجداول...\n');
    console.log('🚀 Starting Migration to update question_answers and template_questions...\n');

    // قراءة وتنفيذ SQL migration
    const sqlPath = path.join(__dirname, 'update_question_tables.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration file not found: ${sqlPath}`);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📋 تنفيذ التعديلات على قاعدة البيانات...');
    console.log('📋 Executing database updates...\n');
    
    await client.query(sqlContent);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('✅ اكتمل Migration بنجاح!\n');

    // عرض ملخص التعديلات
    console.log('📊 ملخص التعديلات / Summary:\n');
    console.log('1. ✅ حذف الحقول من question_answers:');
    console.log('   - linked_static_data_value');
    console.log('   - linked_static_data_field');
    console.log('   - inherited_from_template_assessment_id');
    console.log('   - linked_static_data_snapshot (إن وُجد)\n');
    
    console.log('2. ✅ إضافة حقل إلى template_questions:');
    console.log('   - include_in_evaluation (BOOLEAN, DEFAULT true)');
    console.log('   - هل يدخل السؤال في التقييم؟ (نعم/لا)\n');

    // التحقق من الجداول
    const qaColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'question_answers'
      ORDER BY ordinal_position
    `);

    const tqColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'template_questions'
      ORDER BY ordinal_position
    `);

    console.log('📋 أعمدة جدول question_answers:');
    qaColumns.rows.forEach((col) => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    console.log('\n📋 أعمدة جدول template_questions:');
    tqColumns.rows.forEach((col) => {
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`   - ${col.column_name} (${col.data_type})${defaultVal}`);
    });

    console.log('\n✨ Migration script finished successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('❌ فشل Migration:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runUpdateMigration()
  .then(() => {
    console.log('👋 Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
