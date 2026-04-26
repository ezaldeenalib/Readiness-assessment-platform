import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// تحميل .env من جذر المشروع (أعلى بمستويين من server/database)
dotenv.config({ path: path.resolve(__dirname, '../..', '.env') });

// V-08: fail fast if any required env var is missing
const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
for (const v of requiredEnvVars) {
  if (!process.env[v]) throw new Error(`Required environment variable ${v} is not set. Set it before starting the server.`);
}

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

const isProd = process.env.NODE_ENV === 'production';

// V-16: suppress full SQL text in production logs
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    if (!isProd) {
      const duration = Date.now() - start;
      console.log('Executed query', { duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    // V-16: never log query text (may contain sensitive data) in production
    if (!isProd) console.error('Database query error:', error.message);
    throw error;
  }
};

// Helper function for transactions
export const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
