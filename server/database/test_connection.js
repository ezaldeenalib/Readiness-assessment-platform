/**
 * Test Database Connection
 * اختبار الاتصال بقاعدة البيانات
 */

import pool from './db.js';

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...\n');
    
    const result = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
    
    console.log('✅ Database connection successful!');
    console.log(`   Database: ${result.rows[0].db_name}`);
    console.log(`   Current time: ${result.rows[0].current_time}\n`);
    
    // Check if tables exist
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('Questions', 'templates', 'template_questions')
      ORDER BY table_name
    `);
    
    console.log('📊 Existing tables:');
    tablesCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    if (tablesCheck.rows.length === 0) {
      console.log('   ⚠️  No tables found. Make sure you have run the initial migration.');
    }
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('\nPlease check:');
    console.error('   1. PostgreSQL is running');
    console.error('   2. Database credentials in .env file');
    console.error('   3. Database exists');
    await pool.end();
    process.exit(1);
  }
}

testConnection();
