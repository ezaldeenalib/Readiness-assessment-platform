/**
 * Migration Script for Template-based Evaluation & Scoring Engine
 * Run this after the main schema is set up
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateEvaluationEngine() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Evaluation Engine Migration...\n');

    // Read and execute the evaluation engine schema
    const schemaPath = path.join(__dirname, 'evaluation_engine_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📊 Creating evaluation engine tables...');
    await client.query(schema);
    console.log('✅ Evaluation engine schema created successfully!\n');

    // Verify tables were created
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

    console.log('📋 Created Tables:');
    tableCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Check sample data
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM static_data_fields) as fields_count,
        (SELECT COUNT(*) FROM static_data_values) as values_count,
        (SELECT COUNT(*) FROM questions) as questions_count,
        (SELECT COUNT(*) FROM templates) as templates_count,
        (SELECT COUNT(*) FROM template_questions) as template_questions_count;
    `);

    console.log('\n📈 Sample Data Loaded:');
    console.log(`   • Static Data Fields: ${stats.rows[0].fields_count}`);
    console.log(`   • Static Data Values: ${stats.rows[0].values_count}`);
    console.log(`   • Questions: ${stats.rows[0].questions_count}`);
    console.log(`   • Templates: ${stats.rows[0].templates_count}`);
    console.log(`   • Template Questions: ${stats.rows[0].template_questions_count}`);

    console.log('\n✨ Migration completed successfully!');
    console.log('\n📚 You can now:');
    console.log('   1. Manage static data fields and values');
    console.log('   2. Create and manage questions in the Question Bank');
    console.log('   3. Build templates from questions');
    console.log('   4. Create template-based assessments');
    console.log('   5. Auto-calculate scores based on evaluation rules\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration
migrateEvaluationEngine()
  .then(() => {
    console.log('👋 Migration script finished. Exiting...');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
