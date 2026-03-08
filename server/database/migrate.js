import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log('🚀 Starting database migration...');

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    let schema = fs.readFileSync(schemaPath, 'utf-8');

    // Generate proper password hashes
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // Replace placeholder password hashes with real ones
    schema = schema.replace(/\$2a\$10\$YourHashedPasswordHere/g, hashedPassword);

    // Execute schema
    await pool.query(schema);

    console.log('✅ Database schema created successfully');
    console.log('✅ Sample data inserted');
    console.log('\n📝 Default credentials:');
    console.log('   Super Admin: admin@system.gov / password123');
    console.log('   Ministry Admin: admin@modt.gov / password123');
    console.log('   Entity User: user@ncc.gov / password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
