/**
 * Fix Evaluation Engine Tables
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixEvaluationEngine() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing Evaluation Engine Tables...\n');

    const schemaPath = path.join(__dirname, 'fix_evaluation_engine.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await client.query(schema);
    console.log('✅ Tables created/fixed successfully!\n');

    // Verify tables
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'static_data_fields',
        'static_data_values',
        'questions',
        'templates',
        'template_questions',
        'template_assessments',
        'question_answers'
      )
      ORDER BY table_name;
    `);

    console.log('📋 Tables verified:');
    tableCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Check counts
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM static_data_fields) as fields_count,
        (SELECT COUNT(*) FROM questions) as questions_count,
        (SELECT COUNT(*) FROM templates) as templates_count;
    `);

    console.log('\n📈 Data counts:');
    console.log(`   • Static Data Fields: ${stats.rows[0].fields_count}`);
    console.log(`   • Questions: ${stats.rows[0].questions_count}`);
    console.log(`   • Templates: ${stats.rows[0].templates_count}`);

    console.log('\n✨ Fix completed successfully!');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
  }
}

fixEvaluationEngine()
  .then(() => {
    console.log('\n👋 Done. Exiting...');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
