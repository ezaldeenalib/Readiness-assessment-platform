-- Reference Dictionary Architecture
-- قاموس المراجع للأسئلة المركبة واختيار من متعدد

-- 1. reference_dictionary (الجدول الرئيسي)
CREATE TABLE IF NOT EXISTS reference_dictionary (
  id SERIAL PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  name_en VARCHAR(255),
  name_ar VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reference_dictionary_type ON reference_dictionary(type);
CREATE INDEX IF NOT EXISTS idx_reference_dictionary_active ON reference_dictionary(is_active);

-- 2. assessment_reference_values (ربط الإجابات بالمراجع)
CREATE TABLE IF NOT EXISTS assessment_reference_values (
  id SERIAL PRIMARY KEY,
  assessment_answer_id INTEGER NOT NULL REFERENCES question_answers(id) ON DELETE CASCADE,
  reference_id INTEGER NOT NULL REFERENCES reference_dictionary(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  extra_json JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_arv_assessment_answer ON assessment_reference_values(assessment_answer_id);
CREATE INDEX IF NOT EXISTS idx_arv_reference ON assessment_reference_values(reference_id);

-- 3. assessment_reference_attributes (سمات مثل vendor, model)
CREATE TABLE IF NOT EXISTS assessment_reference_attributes (
  id SERIAL PRIMARY KEY,
  assessment_reference_value_id INTEGER NOT NULL REFERENCES assessment_reference_values(id) ON DELETE CASCADE,
  attribute_type VARCHAR(100) NOT NULL,
  reference_id INTEGER NOT NULL REFERENCES reference_dictionary(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(assessment_reference_value_id, attribute_type)
);

CREATE INDEX IF NOT EXISTS idx_ara_reference_value ON assessment_reference_attributes(assessment_reference_value_id);

-- Sample data (insert only if table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM reference_dictionary LIMIT 1) THEN
    INSERT INTO reference_dictionary (type, name_en, name_ar, display_order) VALUES
      ('asset_type', 'Server', 'خادم', 1),
      ('asset_type', 'Workstation', 'محطة عمل', 2),
      ('asset_type', 'Network Device', 'جهاز شبكة', 3),
      ('vendor', 'Vendor A', 'الموزع أ', 1),
      ('vendor', 'Vendor B', 'الموزع ب', 2),
      ('server_model', 'Model X', 'الموديل X', 1),
      ('server_model', 'Model Y', 'الموديل Y', 2);
  END IF;
END $$;
