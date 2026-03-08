-- ============================================
-- Migration: Central Category System
-- نظام الفئات المركزي
-- ============================================
-- This migration creates a centralized master_categories table
-- and refactors questions, templates, and template_questions to use it

BEGIN;

-- ============================================
-- 1. Create master_categories table
-- ============================================
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
);

-- Create index for code
CREATE INDEX IF NOT EXISTS idx_master_categories_code ON master_categories(code);
CREATE INDEX IF NOT EXISTS idx_master_categories_active ON master_categories(is_active);

-- ============================================
-- 2. Extract and insert unique categories from existing data
-- ============================================

-- Insert categories from Questions table
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
ON CONFLICT (code) DO NOTHING;

-- Insert categories from Templates table
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
ON CONFLICT (code) DO NOTHING;

-- Insert section names from template_questions as categories
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
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 3. Add new foreign key columns
-- ============================================

-- Add category_id to Questions table
ALTER TABLE Questions 
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES master_categories(id) ON DELETE SET NULL;

-- Add category_id to Templates table
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES master_categories(id) ON DELETE SET NULL;

-- Add section_id to template_questions table
ALTER TABLE template_questions 
ADD COLUMN IF NOT EXISTS section_id INTEGER REFERENCES master_categories(id) ON DELETE SET NULL;

-- ============================================
-- 4. Migrate existing data to new columns
-- ============================================

-- Migrate Questions.category → Questions.category_id
UPDATE Questions q
SET category_id = mc.id
FROM master_categories mc
WHERE q.category IS NOT NULL 
  AND TRIM(q.category) != ''
  AND UPPER(REPLACE(TRIM(q.category), ' ', '_')) = mc.code;

-- Migrate Templates.category → Templates.category_id
UPDATE templates t
SET category_id = mc.id
FROM master_categories mc
WHERE t.category IS NOT NULL 
  AND TRIM(t.category) != ''
  AND UPPER(REPLACE(TRIM(t.category), ' ', '_')) = mc.code;

-- Migrate template_questions.section_name → template_questions.section_id
UPDATE template_questions tq
SET section_id = mc.id
FROM master_categories mc
WHERE (tq.section_name IS NOT NULL AND TRIM(tq.section_name) != '')
  AND UPPER(REPLACE(TRIM(tq.section_name), ' ', '_')) = mc.code;

-- If section_name is NULL but section_name_ar exists, use that
UPDATE template_questions tq
SET section_id = mc.id
FROM master_categories mc
WHERE tq.section_id IS NULL
  AND tq.section_name_ar IS NOT NULL 
  AND TRIM(tq.section_name_ar) != ''
  AND UPPER(REPLACE(TRIM(tq.section_name_ar), ' ', '_')) = mc.code;

-- ============================================
-- 5. Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON Questions(category_id);
CREATE INDEX IF NOT EXISTS idx_templates_category_id ON templates(category_id);
CREATE INDEX IF NOT EXISTS idx_template_questions_section_id ON template_questions(section_id);

-- ============================================
-- 6. Create trigger for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_master_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_master_categories_updated_at ON master_categories;
CREATE TRIGGER trigger_update_master_categories_updated_at
    BEFORE UPDATE ON master_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_master_categories_updated_at();

-- ============================================
-- 7. Add comments
-- ============================================
COMMENT ON TABLE master_categories IS 'Centralized master table for all categories used across Questions, Templates, and Template Sections';
COMMENT ON COLUMN master_categories.code IS 'Unique code identifier (e.g., SECURITY, GENERAL)';
COMMENT ON COLUMN master_categories.name_en IS 'English name for the category';
COMMENT ON COLUMN master_categories.name_ar IS 'Arabic name for the category';

COMMENT ON COLUMN Questions.category_id IS 'Reference to master_categories.id - replaces old category text field';
COMMENT ON COLUMN templates.category_id IS 'Reference to master_categories.id - replaces old category text field';
COMMENT ON COLUMN template_questions.section_id IS 'Reference to master_categories.id - replaces old section_name text field';

-- ============================================
-- 8. Validation: Check for unmapped categories
-- ============================================
DO $$
DECLARE
    unmapped_questions INTEGER;
    unmapped_templates INTEGER;
    unmapped_sections INTEGER;
BEGIN
    -- Check for unmapped questions
    SELECT COUNT(*) INTO unmapped_questions
    FROM Questions
    WHERE category IS NOT NULL 
      AND TRIM(category) != ''
      AND category_id IS NULL;
    
    -- Check for unmapped templates
    SELECT COUNT(*) INTO unmapped_templates
    FROM templates
    WHERE category IS NOT NULL 
      AND TRIM(category) != ''
      AND category_id IS NULL;
    
    -- Check for unmapped sections
    SELECT COUNT(*) INTO unmapped_sections
    FROM template_questions
    WHERE ((section_name IS NOT NULL AND TRIM(section_name) != '')
       OR (section_name_ar IS NOT NULL AND TRIM(section_name_ar) != ''))
      AND section_id IS NULL;
    
    IF unmapped_questions > 0 OR unmapped_templates > 0 OR unmapped_sections > 0 THEN
        RAISE NOTICE 'Warning: Found unmapped categories - Questions: %, Templates: %, Sections: %', 
            unmapped_questions, unmapped_templates, unmapped_sections;
        RAISE NOTICE 'These will need manual mapping before dropping old columns';
    ELSE
        RAISE NOTICE 'All categories successfully migrated!';
    END IF;
END $$;

COMMIT;

-- ============================================
-- Migration Complete
-- ============================================
-- Next steps:
-- 1. Verify data migration
-- 2. Update application code to use category_id/section_id
-- 3. After verification, run: migrate_drop_old_category_columns.sql
