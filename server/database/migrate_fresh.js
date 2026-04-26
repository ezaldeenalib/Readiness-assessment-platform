/**
 * Fresh migration (single flow):
 * 1) Drop all old schema objects
 * 2) Run migrate_unified.sql
 * 3) Run ensure_legacy_answers.sql (compatibility update)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function dropAllTables(client) {
  const dropOrder = [
    'assessment_reference_attributes',
    'assessment_reference_values',
    'reference_dictionary',
    'role_permissions',
    'user_roles',
    'user_institutions',
    'question_answers',
    'answers',
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

  await client.query('DROP VIEW IF EXISTS assessment_summary CASCADE');
  await client.query('DROP VIEW IF EXISTS entity_hierarchy CASCADE');
  await client.query('DROP VIEW IF EXISTS current_static_data CASCADE');
  await client.query('DROP VIEW IF EXISTS template_summary CASCADE');
  await client.query('DROP VIEW IF EXISTS assessment_with_template CASCADE');

  for (const table of dropOrder) {
    try {
      await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`   🗑️  Dropped: ${table}`);
    } catch (_) {
      // ignore non-existing tables
    }
  }

  await client.query('DROP TYPE IF EXISTS question_type CASCADE');
  await client.query('DROP TYPE IF EXISTS evaluation_rule CASCADE');
  await client.query('DROP TYPE IF EXISTS entity_activity_type CASCADE');
  await client.query('DROP TYPE IF EXISTS user_role CASCADE');
  await client.query('DROP TYPE IF EXISTS assessment_status CASCADE');

  console.log('   ✅ Old tables/types dropped.\n');
}

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting unified fresh migration...\n');
    await dropAllTables(client);

    // 1) unified migration
    let unifiedSql = fs.readFileSync(path.join(__dirname, 'migrate_unified.sql'), 'utf8');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    unifiedSql = unifiedSql.replace(/\$2a\$10\$YourHashedPasswordHere/g, hashedPassword);

    console.log('📋 Running migrate_unified.sql ...');
    await client.query(unifiedSql);
    console.log('   ✅ migrate_unified.sql applied.\n');

    // 2) compatibility update: ensure legacy answers table/indexes exist
    const ensureLegacyAnswersSql = fs.readFileSync(
      path.join(__dirname, 'ensure_legacy_answers.sql'),
      'utf8'
    );
    console.log('📋 Running ensure_legacy_answers.sql ...');
    await client.query(ensureLegacyAnswersSql);
    console.log('   ✅ ensure_legacy_answers.sql applied.\n');

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'users', 'entities', 'assessments', 'assessment_data',
          'static_data_fields', 'static_data_values', 'questions',
          'templates', 'template_questions', 'template_assessments',
          'question_answers', 'answers', 'auditlog', 'master_categories',
          'reference_dictionary', 'permissions', 'roles', 'user_roles', 'role_permissions'
        )
      ORDER BY table_name
    `);

    console.log('📋 Tables created:');
    tables.rows.forEach((r) => console.log(`   ✓ ${r.table_name}`));
    console.log('\n✨ Fresh unified migration completed successfully.\n');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ فشل الترحيل:', err?.message || err);
    if (err?.stack) console.error(err.stack);
    process.exit(1);
  });
