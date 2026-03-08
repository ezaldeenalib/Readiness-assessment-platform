 /**
 * Migration: Drop code column from questions, reference_dictionary, master_categories
 * Usage: node server/database/migrate_drop_code_column.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  try {
    console.log('🚀 Dropping code column from tables...\n');
    const sqlPath = path.join(__dirname, 'migrate_drop_code_column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('✅ Code column dropped from Questions, reference_dictionary, master_categories.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

run();
