-- Migration: حذف عمود code من الجداول
-- Drop code column from questions, reference_dictionary, master_categories
-- يدعم: questions, "Questions", ويمرّر إذا الجدول غير موجود

DO $$
DECLARE
  tbl regclass;
BEGIN
  -- 1. Questions: ابحث عن الجدول (questions أو "Questions")
  SELECT c.oid::regclass INTO tbl FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('questions', 'Questions') AND c.relkind = 'r' LIMIT 1;
  IF tbl IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS questions_code_key', tbl);
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS "Questions_code_key"', tbl);
    DROP INDEX IF EXISTS idx_questions_code;
    EXECUTE format('ALTER TABLE %s DROP COLUMN IF EXISTS code', tbl);
  END IF;

  -- 2. reference_dictionary
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reference_dictionary') THEN
    ALTER TABLE reference_dictionary DROP CONSTRAINT IF EXISTS reference_dictionary_type_code_key;
    ALTER TABLE reference_dictionary DROP COLUMN IF EXISTS code;
  END IF;

  -- 3. master_categories
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'master_categories') THEN
    ALTER TABLE master_categories DROP CONSTRAINT IF EXISTS master_categories_code_key;
    DROP INDEX IF EXISTS idx_master_categories_code;
    ALTER TABLE master_categories DROP COLUMN IF EXISTS code;
  END IF;
END $$;
