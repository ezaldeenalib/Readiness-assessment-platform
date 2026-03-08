-- Migration: ربط reference_dictionary بجدول master_categories
-- ربط نوع المرجع بالفئات بدلاً من العمود type النصي
-- يعمل بشكل آمن مع الجداول الموجودة

DO $$
BEGIN
  -- 1. إضافة عمود category_id إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reference_dictionary' 
    AND column_name = 'category_id'
  ) THEN
    ALTER TABLE reference_dictionary 
    ADD COLUMN category_id INTEGER REFERENCES master_categories(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_reference_dictionary_category_id 
    ON reference_dictionary(category_id);
  END IF;

  -- 2. إنشاء فئات من القيم المميزة في type وربطها (فقط للأنواع غير الموجودة)
  INSERT INTO master_categories (name_en, name_ar, description_en, description_ar, is_active)
  SELECT DISTINCT
    rd.type,
    rd.type,
    'Reference type from migration'::text,
    'نوع مرجع من الترحيل'::text,
    TRUE
  FROM reference_dictionary rd
  WHERE rd.type IS NOT NULL AND TRIM(rd.type) != ''
  AND NOT EXISTS (
    SELECT 1 FROM master_categories mc 
    WHERE LOWER(TRIM(mc.name_en)) = LOWER(TRIM(rd.type))
  );

  -- 3. تحديث category_id للمراجع بناءً على type المطابق لـ name_en
  UPDATE reference_dictionary rd
  SET category_id = mc.id
  FROM master_categories mc
  WHERE rd.type IS NOT NULL 
  AND TRIM(rd.type) != ''
  AND LOWER(TRIM(rd.type)) = LOWER(TRIM(mc.name_en))
  AND rd.category_id IS NULL;

END $$;
