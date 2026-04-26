/**
 * Migration Script: Central Category System (Simplified)
 * نظام الفئات المركزي (مبسط)
 */

import pool from './db.js';

async function migrateMasterCategories() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Master Categories Migration...\n');
    
    await client.query('BEGIN');
    
    // Step 1: Create master_categories table
    console.log('📊 Step 1: Creating master_categories table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS master_categories (
        id SERIAL PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        name_ar VARCHAR(255) NOT NULL,
        description_en TEXT,
        description_ar TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `).catch(err => {
      if (err.code !== '42P07') throw err;
      console.log('   ⚠️  Table already exists, skipping...');
    });
    
    // Step 2: Create indexes
    console.log('📊 Step 2: Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_master_categories_code ON master_categories(code)
    `).catch(() => {});
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_master_categories_active ON master_categories(is_active)
    `).catch(() => {});
    
    // Step 3: Insert categories from Questions
    console.log('📊 Step 3: Extracting categories from Questions table...');
    await client.query(`
      INSERT INTO master_categories (code, name_en, name_ar, description_en, description_ar, is_active)
      SELECT DISTINCT
        UPPER(REPLACE(TRIM(category), ' ', '_')) as code,
        TRIM(category) as name_en,
        TRIM(category) as name_ar,
        'Category from Questions table' as description_en,
        'فئة من جدول الأسئلة' as description_ar,
        TRUE as is_active
      FROM Questions
      WHERE category IS NOT NULL 
        AND TRIM(category) != ''
        AND UPPER(REPLACE(TRIM(category), ' ', '_')) NOT IN (
          SELECT code FROM master_categories
        )
      ON CONFLICT (code) DO NOTHING
    `).catch(err => {
      console.log(`   ⚠️  Warning: ${err.message}`);
    });
    
    // Step 4: Insert categories from Templates
    console.log('📊 Step 4: Extracting categories from Templates table...');
    await client.query(`
      INSERT INTO master_categories (code, name_en, name_ar, description_en, description_ar, is_active)
      SELECT DISTINCT
        UPPER(REPLACE(TRIM(category), ' ', '_')) as code,
        TRIM(category) as name_en,
        TRIM(category) as name_ar,
        'Category from Templates table' as description_en,
        'فئة من جدول القوالب' as description_ar,
        TRUE as is_active
      FROM templates
      WHERE category IS NOT NULL 
        AND TRIM(category) != ''
        AND UPPER(REPLACE(TRIM(category), ' ', '_')) NOT IN (
          SELECT code FROM master_categories
        )
      ON CONFLICT (code) DO NOTHING
    `).catch(err => {
      console.log(`   ⚠️  Warning: ${err.message}`);
    });
    
    // Step 5: Insert sections from template_questions
    console.log('📊 Step 5: Extracting sections from Template Questions...');
    await client.query(`
      INSERT INTO master_categories (code, name_en, name_ar, description_en, description_ar, is_active)
      SELECT DISTINCT
        UPPER(REPLACE(TRIM(COALESCE(section_name, section_name_ar)), ' ', '_')) as code,
        COALESCE(TRIM(section_name), TRIM(section_name_ar)) as name_en,
        COALESCE(TRIM(section_name_ar), TRIM(section_name)) as name_ar,
        'Section from Template Questions' as description_en,
        'قسم من أسئلة القالب' as description_ar,
        TRUE as is_active
      FROM template_questions
      WHERE (section_name IS NOT NULL AND TRIM(section_name) != '')
         OR (section_name_ar IS NOT NULL AND TRIM(section_name_ar) != '')
      ON CONFLICT (code) DO NOTHING
    `).catch(err => {
      console.log(`   ⚠️  Warning: ${err.message}`);
    });
    
    // Step 6: Add category_id column to Questions
    console.log('📊 Step 6: Adding category_id to Questions table...');
    await client.query(`
      ALTER TABLE Questions 
      ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES master_categories(id) ON DELETE SET NULL
    `).catch(err => {
      if (err.code !== '42701') throw err;
      console.log('   ⚠️  Column already exists, skipping...');
    });
    
    // Step 7: Add category_id column to Templates
    console.log('📊 Step 7: Adding category_id to Templates table...');
    await client.query(`
      ALTER TABLE templates 
      ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES master_categories(id) ON DELETE SET NULL
    `).catch(err => {
      if (err.code !== '42701') throw err;
      console.log('   ⚠️  Column already exists, skipping...');
    });
    
    // Step 8: Add section_id column to template_questions
    console.log('📊 Step 8: Adding section_id to Template Questions table...');
    await client.query(`
      ALTER TABLE template_questions 
      ADD COLUMN IF NOT EXISTS section_id INTEGER REFERENCES master_categories(id) ON DELETE SET NULL
    `).catch(err => {
      if (err.code !== '42701') throw err;
      console.log('   ⚠️  Column already exists, skipping...');
    });
    
    // Step 9: Migrate Questions.category → Questions.category_id
    console.log('📊 Step 9: Migrating Questions categories...');
    await client.query(`
      UPDATE Questions q
      SET category_id = mc.id
      FROM master_categories mc
      WHERE q.category IS NOT NULL 
        AND TRIM(q.category) != ''
        AND q.category_id IS NULL
        AND UPPER(REPLACE(TRIM(q.category), ' ', '_')) = mc.code
    `);
    
    // Step 10: Migrate Templates.category → Templates.category_id
    console.log('📊 Step 10: Migrating Templates categories...');
    await client.query(`
      UPDATE templates t
      SET category_id = mc.id
      FROM master_categories mc
      WHERE t.category IS NOT NULL 
        AND TRIM(t.category) != ''
        AND t.category_id IS NULL
        AND UPPER(REPLACE(TRIM(t.category), ' ', '_')) = mc.code
    `);
    
    // Step 11: Migrate template_questions.section_name → template_questions.section_id
    console.log('📊 Step 11: Migrating Template Questions sections...');
    await client.query(`
      UPDATE template_questions tq
      SET section_id = mc.id
      FROM master_categories mc
      WHERE (tq.section_name IS NOT NULL AND TRIM(tq.section_name) != '')
        AND tq.section_id IS NULL
        AND UPPER(REPLACE(TRIM(tq.section_name), ' ', '_')) = mc.code
    `);
    
    // Step 12: Migrate section_name_ar if section_name is NULL
    await client.query(`
      UPDATE template_questions tq
      SET section_id = mc.id
      FROM master_categories mc
      WHERE tq.section_id IS NULL
        AND tq.section_name_ar IS NOT NULL 
        AND TRIM(tq.section_name_ar) != ''
        AND UPPER(REPLACE(TRIM(tq.section_name_ar), ' ', '_')) = mc.code
    `);
    
    // Step 13: Create indexes
    console.log('📊 Step 13: Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_questions_category_id ON Questions(category_id)
    `).catch(() => {});
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_templates_category_id ON templates(category_id)
    `).catch(() => {});
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_template_questions_section_id ON template_questions(section_id)
    `).catch(() => {});
    
    // Step 14: Create trigger
    console.log('📊 Step 14: Creating trigger...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_master_categories_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_master_categories_updated_at ON master_categories
    `).catch(() => {});
    
    await client.query(`
      CREATE TRIGGER trigger_update_master_categories_updated_at
        BEFORE UPDATE ON master_categories
        FOR EACH ROW
        EXECUTE FUNCTION update_master_categories_updated_at()
    `);
    
    // Verify migration
    console.log('\n🔍 Verifying migration...\n');
    const categoriesCount = await client.query('SELECT COUNT(*) as count FROM master_categories');
    const questionsWithCategory = await client.query(`
      SELECT COUNT(*) as count FROM Questions WHERE category_id IS NOT NULL
    `).catch(() => ({ rows: [{ count: 0 }] }));
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
