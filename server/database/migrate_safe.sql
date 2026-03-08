-- تهجيرة آمنة: جدول سجل التدقيق + عمود وراثة الإجابة من تقييم سابق
-- Safe migration: Audit log table + inherited answer column

CREATE TABLE IF NOT EXISTS auditlog (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INT NOT NULL,
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
    old_value JSONB NULL,
    new_value JSONB NULL,
    performed_by VARCHAR(100) NOT NULL,
    performed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auditlog_table_record ON auditlog(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_auditlog_operation ON auditlog(operation_type);
CREATE INDEX IF NOT EXISTS idx_auditlog_performed_at ON auditlog(performed_at);

-- عمود: إجابة محمّلة من تقييم سابق للمؤسسة (لنفس السؤال) — عند التعديل يُزال
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'question_answers' AND column_name = 'inherited_from_template_assessment_id'
  ) THEN
    ALTER TABLE question_answers ADD COLUMN inherited_from_template_assessment_id INTEGER NULL;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'question_answers' AND constraint_name = 'question_answers_inherited_fk'
  ) THEN
    ALTER TABLE question_answers
      ADD CONSTRAINT question_answers_inherited_fk
      FOREIGN KEY (inherited_from_template_assessment_id) REFERENCES template_assessments(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'FK question_answers_inherited_fk skipped: %', SQLERRM;
END $$;

SELECT 'Audit log + inherited answer column migration completed' AS status;
