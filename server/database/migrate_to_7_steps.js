import pool from './db.js';

async function migrateTo7Steps() {
  console.log('🔄 Migrating database to support 7 steps...');

  try {
    // Drop the existing constraint
    await pool.query(`
      ALTER TABLE assessment_data 
      DROP CONSTRAINT IF EXISTS assessment_data_step_number_check;
    `);

    // Add new constraint for 7 steps
    await pool.query(`
      ALTER TABLE assessment_data 
      ADD CONSTRAINT assessment_data_step_number_check 
      CHECK (step_number BETWEEN 1 AND 7);
    `);

    console.log('✅ Database migration completed successfully');
    console.log('✅ Assessment data table now supports 7 steps');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateTo7Steps();
