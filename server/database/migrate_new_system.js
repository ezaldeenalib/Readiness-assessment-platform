/**
 * Migration Script for New Assessment System
 * نظام التقييم الجديد - Migration Script
 * 
 * هذا الملف ينشئ:
 * - جدول Questions الجديد
 * - جدول Answers الجديد
 * - جدول AuditLog
 * - Functions و Triggers المطلوبة
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateNewSystem() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 بدء Migration للنظام الجديد...\n');
    console.log('🚀 Starting New System Migration...\n');

    // التحقق من وجود جداول قديمة وحذفها إذا لزم
    console.log('🔍 التحقق من الجداول الموجودة...');
    console.log('🔍 Checking existing tables...');
    
    // التحقق من وجود جداول قديمة (بأحرف صغيرة وكبيرة)
    const existingTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name IN ('Questions', 'Answers', 'AuditLog')
           OR LOWER(table_name) IN ('questions', 'answers', 'auditlog'))
    `);

    if (existingTables.rows.length > 0) {
      console.log('⚠️  وجدت جداول موجودة، سيتم حذفها أولاً...');
      console.log('⚠️  Found existing tables, dropping them first...');
      
      // حذف الجداول بالترتيب الصحيح (مع مراعاة Foreign Keys)
      // حذف بأحرف صغيرة وكبيرة للتأكد
      await client.query('DROP TABLE IF EXISTS "AuditLog" CASCADE');
      await client.query('DROP TABLE IF EXISTS auditlog CASCADE');
      await client.query('DROP TABLE IF EXISTS "Answers" CASCADE');
      await client.query('DROP TABLE IF EXISTS answers CASCADE');
      await client.query('DROP TABLE IF EXISTS "Questions" CASCADE');
      await client.query('DROP TABLE IF EXISTS questions CASCADE');
      
      // حذف Functions
      await client.query('DROP FUNCTION IF EXISTS create_assessment_snapshot(INT, VARCHAR) CASCADE');
      await client.query('DROP FUNCTION IF EXISTS update_questions_updated_at() CASCADE');
      
      console.log('✅ تم حذف الجداول القديمة');
      console.log('✅ Old tables dropped\n');
    }

    // قراءة وتنفيذ الـ schema الجديد
    const schemaPath = path.join(__dirname, 'new_system_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📊 إنشاء الجداول الجديدة...');
    console.log('📊 Creating new tables...');
    await client.query(schema);
    console.log('✅ تم إنشاء الجداول بنجاح!');
    console.log('✅ Tables created successfully!\n');

    // التحقق من إنشاء الجداول
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('Questions', 'Answers', 'AuditLog')
      ORDER BY table_name;
    `);

    console.log('📋 الجداول المنشأة:');
    console.log('📋 Created Tables:');
    tableCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // التحقق من الـ Indexes
    const indexCheck = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN ('Questions', 'Answers', 'AuditLog')
      ORDER BY tablename, indexname;
    `);

    console.log('\n📈 Indexes Created:');
    indexCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.indexname}`);
    });

    // التحقق من الـ Functions
    const functionCheck = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN ('create_assessment_snapshot', 'update_questions_updated_at')
      ORDER BY routine_name;
    `);

    console.log('\n⚙️ Functions Created:');
    functionCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.routine_name}`);
    });

    console.log('\n✨ Migration completed successfully!');
    console.log('✨ اكتمل Migration بنجاح!\n');
    
    console.log('📚 النظام الجديد يدعم:');
    console.log('   • جدول واحد للأسئلة (Questions)');
    console.log('   • جدول واحد للإجابات (Answers)');
    console.log('   • سجل كامل للعمليات (AuditLog)');
    console.log('   • دعم الأسئلة المركبة (Composite)');
    console.log('   • دعم الأسئلة الفرعية (Parent/Child)');
    console.log('   • نظام Snapshot للتقييمات');
    console.log('   • Versioning للإجابات (is_active)');
    console.log('\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
  }
}

// تشغيل الـ Migration
migrateNewSystem()
  .then(() => {
    console.log('👋 Migration script finished. Exiting...');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
