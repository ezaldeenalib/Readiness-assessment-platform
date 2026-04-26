/**
 * Migration: Reference Dictionary Architecture
 * Creates reference_dictionary, assessment_reference_values, assessment_reference_attributes
 * Usage: node server/database/migrate_reference_architecture.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  try {
    console.log('🚀 Running Reference Architecture Migration...\n');
    const sqlPath = path.join(__dirname, 'migrate_reference_architecture.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('✅ Reference architecture migration completed.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

run();
