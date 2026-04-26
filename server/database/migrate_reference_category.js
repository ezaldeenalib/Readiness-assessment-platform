/**
 * Migration: ربط reference_dictionary بجدول master_categories
 * Usage: node server/database/migrate_reference_category.js
 * يستخدم إعدادات db.js من ملف .env (DB_NAME = maturity_assessment)
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrate_reference_category.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('✅ Migration complete: reference_dictionary now linked to master_categories via category_id.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

run();
