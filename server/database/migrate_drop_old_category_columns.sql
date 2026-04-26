-- ============================================
-- Migration: Drop Old Category Columns
-- حذف أعمدة الفئات القديمة
-- ============================================
-- WARNING: Run this ONLY after verifying that all data has been migrated
-- and the application code has been updated to use category_id/section_id

BEGIN;

-- ============================================
-- 1. Drop old category columns
-- ============================================

-- Drop Questions.category (after migration to category_id)
ALTER TABLE Questions DROP COLUMN IF EXISTS category;

-- Drop Templates.category (after migration to category_id)
ALTER TABLE templates DROP COLUMN IF EXISTS category;

-- Drop template_questions.section_name and section_name_ar (after migration to section_id)
-- Note: We keep section_name_ar for display purposes, but it should reference master_categories.name_ar
ALTER TABLE template_questions DROP COLUMN IF EXISTS section_name;

-- Note: section_name_ar is kept for backward compatibility but should be populated from master_categories.name_ar

COMMIT;

-- ============================================
-- Migration Complete
-- ============================================
-- Old text columns have been removed
-- All category references now use master_categories.id
