/**
 * Run security_hardening.sql — adds account lockout columns to users table.
 * Safe to run multiple times (idempotent).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'security_hardening.sql'), 'utf8');
  const client = await pool.connect();
  try {
    console.log('🔐 Running security_hardening.sql ...');
    await client.query(sql);
    console.log('✅ Security hardening migration applied successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('❌ Security hardening migration failed:', err.message);
  process.exit(1);
});
