/**
 * Migration Script: Central Category System
 * نظام الفئات المركزي
 * 
 * This script migrates the system to use a centralized master_categories table
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateMasterCategories() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Master Categories Migration...\n');
    
    await client.query('BEGIN');
    
    // Read migration SQL file
    const migrationPath = path.join(__dirname, 'migrate_master_categories.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📊 Creating master_categories table and migrating data...');
    
    // Remove BEGIN/COMMIT from SQL since we handle transactions
    let cleanSQL = migrationSQL
      .replace(/^BEGIN\s*;?\s*$/gim, '')
      .replace(/^COMMIT\s*;?\s*$/gim, '')
      .trim();
    
    // Split by semicolon, but handle DO blocks and functions carefully
    const statements = [];
    let current = '';
    let inDollarQuote = false;
    let dollarTag = null;
    let depth = 0;
    
    for (let i = 0; i < cleanSQL.length; i++) {
      const char = cleanSQL[i];
      const remaining = cleanSQL.substring(i);
      
      // Check for dollar quote start
      if (!inDollarQuote && char === '$') {
        const match = remaining.match(/^\$([^$]*)\$/);
        if (match) {
          dollarTag = match[0];
          inDollarQuote = true;
          current += dollarTag;
          i += dollarTag.length - 1;
          continue;
        }
      }
      
      // Check for dollar quote end
      if (inDollarQuote && remaining.startsWith(dollarTag)) {
        current += dollarTag;
        i += dollarTag.length - 1;
        inDollarQuote = false;
        dollarTag = null;
        continue;
      }
      
      current += char;
      
      // If we hit a semicolon outside dollar quotes, it's a statement end
      if (!inDollarQuote && char === ';') {
        const stmt = current.trim();
        if (stmt && !stmt.startsWith('--')) {
          statements.push(stmt);
        }
        current = '';
      }
    }
    
    // Add last statement if exists
    if (current.trim() && !current.trim().startsWith('--')) {
      statements.push(current.trim());
    }
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    // Sort statements: CREATE TABLE first, then indexes, then data operations
    const createTableStmts = statements.filter(s => s.toUpperCase().includes('CREATE TABLE'));
    const createIndexStmts = statements.filter(s => s.toUpperCase().includes('CREATE INDEX'));
    const otherStmts = statements.filter(s => 
      !s.toUpperCase().includes('CREATE TABLE') && 
      !s.toUpperCase().includes('CREATE INDEX')
    );
    
    const orderedStatements = [...createTableStmts, ...createIndexStmts, ...otherStmts];
    
    // Execute each statement
    for (let i = 0; i < orderedStatements.length; i++) {
      const stmt = orderedStatements[i];
      if (!stmt || stmt.trim().length === 0) continue;
      
      try {
        await client.query(stmt);
        if (i % 5 === 0 || i === orderedStatements.length - 1) {
          process.stdout.write(`\r⏳ Progress: ${i + 1}/${orderedStatements.length} statements executed...`);
        }
      } catch (err) {
        // Ignore "already exists" errors
        if (err.code === '42P07' || err.code === '42710' || err.code === '42704' || 
            (err.message && err.message.includes('already exists'))) {
          continue;
        }
        console.error(`\n❌ Error executing statement ${i + 1}:`);
        console.error(`   ${stmt.substring(0, 100)}...`);
        console.error(`   Error: ${err.message}`);
        throw err;
      }
    }
    
    console.log('\n');
    
    // Verify migration
    console.log('🔍 Verifying migration...\n');
    const categoriesCount = await client.query('SELECT COUNT(*) as count FROM master_categories');
    const questionsWithCategory = await client.query(`
      SELECT COUNT(*) as count FROM Questions WHERE category_id IS NOT NULL
    `);
    const templatesWithCategory = await client.query(`
      SELECT COUNT(*) as count FROM templates WHERE category_id IS NOT NULL
    `);
    const sectionsWithCategory = await client.query(`
      SELECT COUNT(*) as count FROM template_questions WHERE section_id IS NOT NULL
    `);
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📈 Statistics:');
    console.log(`   • Master Categories: ${categoriesCount.rows[0].count}`);
    console.log(`   • Questions with category_id: ${questionsWithCategory.rows[0].count}`);
    console.log(`   • Templates with category_id: ${templatesWithCategory.rows[0].count}`);
    console.log(`   • Template Questions with section_id: ${sectionsWithCategory.rows[0].count}\n`);
    
    await client.query('COMMIT');
    
    console.log('✨ Next steps:');
    console.log('   1. Verify data migration');
    console.log('   2. Update application code to use category_id/section_id');
    console.log('   3. After verification, run: migrate_drop_old_category_columns.sql\n');
    
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n❌ Migration failed:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    if (error.position) {
      console.error('   Error position:', error.position);
    }
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrateMasterCategories()
  .then(() => {
    console.log('✅ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed');
    process.exit(1);
  });

export default migrateMasterCategories;
