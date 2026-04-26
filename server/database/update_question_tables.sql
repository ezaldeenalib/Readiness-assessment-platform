-- Migration: Update question_answers and template_questions tables
-- تاريخ: 2026-02-01
-- 
-- التعديلات:
-- 1. حذف حقول من question_answers: linked_static_data_value, linked_static_data_field, inherited_from_template_assessment_id
-- 2. إضافة حقل إلى template_questions: include_in_evaluation (Boolean)

-- ============================================
-- PART 1: حذف الأعمدة من جدول question_answers
-- ============================================

-- حذف الـ Foreign Key constraint أولاً (إن وُجد)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' 
    AND table_name = 'question_answers' 
    AND constraint_name = 'question_answers_inherited_fk'
  ) THEN
    ALTER TABLE question_answers DROP CONSTRAINT question_answers_inherited_fk;
    RAISE NOTICE 'Dropped FK constraint: question_answers_inherited_fk';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'FK constraint drop skipped: %', SQLERRM;
END $$;

-- حذف عمود linked_static_data_value
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'question_answers' 
    AND column_name = 'linked_static_data_value'
  ) THEN
    ALTER TABLE question_answers DROP COLUMN linked_static_data_value;
    RAISE NOTICE 'Dropped column: linked_static_data_value';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Column drop skipped (linked_static_data_value): %', SQLERRM;
END $$;

-- حذف عمود linked_static_data_field
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'question_answers' 
    AND column_name = 'linked_static_data_field'
  ) THEN
    ALTER TABLE question_answers DROP COLUMN linked_static_data_field;
    RAISE NOTICE 'Dropped column: linked_static_data_field';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Column drop skipped (linked_static_data_field): %', SQLERRM;
END $$;

-- حذف عمود inherited_from_template_assessment_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'question_answers' 
    AND column_name = 'inherited_from_template_assessment_id'
  ) THEN
    ALTER TABLE question_answers DROP COLUMN inherited_from_template_assessment_id;
    RAISE NOTICE 'Dropped column: inherited_from_template_assessment_id';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Column drop skipped (inherited_from_template_assessment_id): %', SQLERRM;
END $$;

-- حذف عمود linked_static_data_snapshot (إن وُجد - في بعض إصدارات schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'question_answers' 
    AND column_name = 'linked_static_data_snapshot'
  ) THEN
    ALTER TABLE question_answers DROP COLUMN linked_static_data_snapshot;
    RAISE NOTICE 'Dropped column: linked_static_data_snapshot';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Column drop skipped (linked_static_data_snapshot): %', SQLERRM;
END $$;

-- ============================================
-- PART 2: إضافة حقل إلى جدول template_questions
-- ============================================

-- إضافة عمود include_in_evaluation (هل يدخل السؤال في التقييم)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'template_questions' 
    AND column_name = 'include_in_evaluation'
  ) THEN
    ALTER TABLE template_questions 
    ADD COLUMN include_in_evaluation BOOLEAN DEFAULT true NOT NULL;
    
    RAISE NOTICE 'Added column: include_in_evaluation (default: true)';
    
    -- تحديث السجلات الموجودة لتكون مُضمّنة في التقييم افتراضياً
    UPDATE template_questions SET include_in_evaluation = true WHERE include_in_evaluation IS NULL;
    
    RAISE NOTICE 'Updated existing records: include_in_evaluation = true';
  ELSE
    RAISE NOTICE 'Column already exists: include_in_evaluation';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Column add failed (include_in_evaluation): %', SQLERRM;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- عرض أعمدة جدول question_answers بعد التعديل
DO $$
DECLARE
  col_record RECORD;
BEGIN
  RAISE NOTICE '--- question_answers columns ---';
  FOR col_record IN 
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'question_answers'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '  - % (%) NULL: %', col_record.column_name, col_record.data_type, col_record.is_nullable;
  END LOOP;
END $$;

-- عرض أعمدة جدول template_questions بعد التعديل
DO $$
DECLARE
  col_record RECORD;
BEGIN
  RAISE NOTICE '--- template_questions columns ---';
  FOR col_record IN 
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'template_questions'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '  - % (%) NULL: % DEFAULT: %', 
      col_record.column_name, 
      col_record.data_type, 
      col_record.is_nullable,
      col_record.column_default;
  END LOOP;
END $$;

SELECT '✅ Migration completed successfully!' as status;
