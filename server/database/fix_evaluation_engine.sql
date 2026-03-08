-- Fix/Complete Evaluation Engine Tables
-- Run this to fix partial migrations

-- ============================================
-- PART 1: STATIC DATA MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS static_data_fields (
    id SERIAL PRIMARY KEY,
    field_key VARCHAR(100) UNIQUE NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    field_name_ar VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    field_category VARCHAR(100),
    is_required BOOLEAN DEFAULT false,
    display_order INTEGER,
    options JSONB,
    validation_rules JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS static_data_values (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    field_key VARCHAR(100) NOT NULL,
    field_value TEXT,
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PART 2: TYPES (Skip if exists)
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
        CREATE TYPE question_type AS ENUM (
            'StaticDataLinked',
            'Manual', 
            'MultiChoice',
            'YesNo',
            'ParentChild'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evaluation_rule') THEN
        CREATE TYPE evaluation_rule AS ENUM (
            'greater_than',
            'less_than',
            'equals',
            'not_equals',
            'contains',
            'exists',
            'greater_or_equal',
            'less_or_equal',
            'in_range'
        );
    END IF;
END $$;

-- ============================================
-- PART 3: QUESTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    question_text_ar TEXT NOT NULL,
    question_type question_type NOT NULL,
    linked_static_data_field VARCHAR(100),
    evaluation_rule evaluation_rule,
    reference_value TEXT,
    reference_value_max TEXT,
    options JSONB,
    parent_question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    trigger_answer_value TEXT,
    weight DECIMAL(5,2) DEFAULT 10.0,
    description TEXT,
    description_ar TEXT,
    help_text TEXT,
    help_text_ar TEXT,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PART 4: TEMPLATES
-- ============================================

CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    description TEXT,
    description_ar TEXT,
    category VARCHAR(100),
    version VARCHAR(20) DEFAULT '1.0',
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS template_questions (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    section_name VARCHAR(255),
    section_name_ar VARCHAR(255),
    override_weight DECIMAL(5,2),
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, question_id)
);

-- ============================================
-- PART 5: ASSESSMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS template_assessments (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES templates(id),
    entity_id INTEGER NOT NULL REFERENCES entities(id),
    assessment_year INTEGER NOT NULL,
    assessment_quarter VARCHAR(10),
    status VARCHAR(50) DEFAULT 'draft',
    total_score DECIMAL(10,2) DEFAULT 0,
    max_possible_score DECIMAL(10,2) DEFAULT 0,
    percentage_score DECIMAL(5,2) DEFAULT 0,
    risk_level VARCHAR(50),
    notes TEXT,
    submitted_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS question_answers (
    id SERIAL PRIMARY KEY,
    template_assessment_id INTEGER NOT NULL REFERENCES template_assessments(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id),
    template_question_id INTEGER REFERENCES template_questions(id),
    answer_value TEXT,
    linked_static_data_value TEXT,
    linked_static_data_snapshot JSONB,
    evaluation_passed BOOLEAN,
    score_achieved DECIMAL(5,2) DEFAULT 0,
    evaluation_notes TEXT,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answered_by INTEGER REFERENCES users(id),
    UNIQUE(template_assessment_id, question_id)
);

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Insert sample static data fields (skip if exists)
INSERT INTO static_data_fields (field_key, field_name, field_name_ar, field_type, field_category, is_required, display_order)
SELECT * FROM (VALUES
    ('total_employees', 'Total Employees', 'إجمالي الموظفين', 'number', 'general', true, 1),
    ('it_staff', 'IT Staff Count', 'عدد موظفي تقنية المعلومات', 'number', 'general', true, 2),
    ('cybersecurity_staff', 'Cybersecurity Staff', 'موظفو الأمن السيبراني', 'number', 'security', true, 3),
    ('has_data_center', 'Has Data Center', 'يمتلك مركز بيانات', 'boolean', 'infrastructure', false, 4),
    ('website_domain', 'Website Domain', 'نطاق الموقع الإلكتروني', 'text', 'digital', false, 5),
    ('has_iso27001', 'Has ISO 27001 Certification', 'شهادة ISO 27001', 'boolean', 'security', false, 6),
    ('has_firewall', 'Has Firewall', 'يمتلك جدار حماية', 'boolean', 'security', true, 7),
    ('annual_budget', 'Annual IT Budget', 'الميزانية السنوية لتقنية المعلومات', 'number', 'general', false, 8)
) AS v(field_key, field_name, field_name_ar, field_type, field_category, is_required, display_order)
WHERE NOT EXISTS (SELECT 1 FROM static_data_fields WHERE field_key = v.field_key);

-- Insert sample questions (skip if exists)
INSERT INTO questions (question_text, question_text_ar, question_type, linked_static_data_field, evaluation_rule, reference_value, weight, category)
SELECT * FROM (VALUES
    ('Does the organization have more than 500 employees?', 'هل لدى المنظمة أكثر من 500 موظف؟', 'StaticDataLinked'::question_type, 'total_employees', 'greater_than'::evaluation_rule, '500', 10.0, 'general'),
    ('Does the organization have dedicated IT staff?', 'هل لدى المنظمة موظفو تقنية معلومات متخصصون؟', 'StaticDataLinked'::question_type, 'it_staff', 'greater_than'::evaluation_rule, '0', 15.0, 'general'),
    ('Does the organization have cybersecurity staff?', 'هل لدى المنظمة موظفو أمن سيبراني؟', 'StaticDataLinked'::question_type, 'cybersecurity_staff', 'greater_than'::evaluation_rule, '0', 20.0, 'security'),
    ('Does the organization conduct regular security audits?', 'هل تجري المنظمة تدقيقات أمنية منتظمة؟', 'YesNo'::question_type, NULL, NULL, NULL, 15.0, 'security'),
    ('Does the organization have a documented incident response plan?', 'هل لدى المنظمة خطة موثقة للاستجابة للحوادث؟', 'YesNo'::question_type, NULL, NULL, NULL, 15.0, 'security')
) AS v(question_text, question_text_ar, question_type, linked_static_data_field, evaluation_rule, reference_value, weight, category)
WHERE NOT EXISTS (SELECT 1 FROM questions WHERE question_text = v.question_text);

-- ============================================
-- جدول سجل التدقيق (Audit Log)
-- ============================================
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

-- Insert sample template (skip if exists)
INSERT INTO templates (name, name_ar, description, description_ar, category, version)
SELECT 'Basic Security Assessment', 'تقييم الأمن الأساسي', 'Basic security assessment template', 'قالب تقييم الأمن الأساسي', 'security', '1.0'
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Basic Security Assessment');

SELECT 'Migration completed successfully!' as status;
