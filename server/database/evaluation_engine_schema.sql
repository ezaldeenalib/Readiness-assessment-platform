-- Template-based Evaluation & Scoring Engine Schema
-- Integrates with existing Digital Maturity Assessment System
-- Author: System
-- Date: January 2026

-- ============================================
-- PART 1: STATIC DATA MANAGEMENT
-- ============================================

-- Static Data Fields Definition (National Form Fields)
CREATE TABLE IF NOT EXISTS static_data_fields (
    id SERIAL PRIMARY KEY,
    field_key VARCHAR(100) UNIQUE NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    field_name_ar VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL, -- text, number, date, boolean, select
    field_category VARCHAR(100), -- general, infrastructure, digital_services, etc.
    is_required BOOLEAN DEFAULT false,
    display_order INTEGER,
    options JSONB, -- For select/multi-select fields
    validation_rules JSONB, -- min, max, pattern, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Static Data Values (Versioned - Historical Tracking)
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_static_field FOREIGN KEY (field_key) REFERENCES static_data_fields(field_key) ON DELETE CASCADE
);

-- ============================================
-- PART 2: GLOBAL QUESTION BANK
-- ============================================

-- Question Types ENUM
CREATE TYPE question_type AS ENUM (
    'StaticDataLinked',
    'Manual', 
    'MultiChoice',
    'YesNo',
    'ParentChild'
);

-- Evaluation Rules ENUM
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

-- Global Question Bank (Reusable across all templates)
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    question_text_ar TEXT NOT NULL,
    question_type question_type NOT NULL,
    
    -- For StaticDataLinked questions
    linked_static_data_field VARCHAR(100),
    evaluation_rule evaluation_rule,
    reference_value TEXT,
    reference_value_max TEXT, -- For range evaluations
    
    -- For MultiChoice questions
    options JSONB, -- {"None": 0, "Basic": 5, "Advanced": 10}
    
    -- For ParentChild questions
    parent_question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    trigger_answer_value TEXT, -- Value that triggers this child question
    
    -- Metadata
    weight DECIMAL(5,2) DEFAULT 10.0,
    description TEXT,
    description_ar TEXT,
    help_text TEXT,
    help_text_ar TEXT,
    category VARCHAR(100),
    
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_linked_field FOREIGN KEY (linked_static_data_field) 
        REFERENCES static_data_fields(field_key) ON DELETE SET NULL
);

-- ============================================
-- PART 3: TEMPLATES (EVALUATION SCENARIOS)
-- ============================================

-- Templates Table
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    description TEXT,
    description_ar TEXT,
    version VARCHAR(20) DEFAULT '1.0',
    category VARCHAR(100), -- maturity, security, compliance, etc.
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template-Question Linking (Many-to-Many)
CREATE TABLE IF NOT EXISTS template_questions (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL,
    override_weight DECIMAL(5,2), -- Optional: Override question's default weight
    is_required BOOLEAN DEFAULT true,
    section_name VARCHAR(255),
    section_name_ar VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, question_id)
);

-- ============================================
-- PART 4: TEMPLATE-BASED ASSESSMENTS
-- ============================================

-- Link assessments to templates
CREATE TABLE IF NOT EXISTS template_assessments (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    template_id INTEGER NOT NULL REFERENCES templates(id),
    template_version VARCHAR(20),
    total_possible_score DECIMAL(10,2) NOT NULL,
    total_achieved_score DECIMAL(10,2) DEFAULT 0,
    percentage_score DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_id)
);

-- Answers with Frozen Snapshots
CREATE TABLE IF NOT EXISTS question_answers (
    id SERIAL PRIMARY KEY,
    template_assessment_id INTEGER NOT NULL REFERENCES template_assessments(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id),
    
    -- The actual answer
    answer_value TEXT,
    
    -- Frozen snapshot from static data (if applicable)
    linked_static_data_value TEXT,
    linked_static_data_field VARCHAR(100),
    static_data_snapshot_date TIMESTAMP,
    
    -- Scoring
    score_achieved DECIMAL(10,2) DEFAULT 0,
    max_possible_score DECIMAL(10,2) NOT NULL,
    evaluation_passed BOOLEAN,
    evaluation_notes TEXT,
    
    -- Metadata
    answered_by INTEGER REFERENCES users(id),
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(template_assessment_id, question_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Static Data Indexes
CREATE INDEX idx_static_data_values_institution ON static_data_values(institution_id);
CREATE INDEX idx_static_data_values_field ON static_data_values(field_key);
CREATE INDEX idx_static_data_values_active ON static_data_values(is_active);
CREATE INDEX idx_static_data_values_dates ON static_data_values(valid_from, valid_to);

-- Question Indexes
CREATE INDEX idx_questions_type ON questions(question_type);
CREATE INDEX idx_questions_category ON questions(category);
CREATE INDEX idx_questions_parent ON questions(parent_question_id);
CREATE INDEX idx_questions_active ON questions(is_active);

-- Template Indexes
CREATE INDEX idx_templates_active ON templates(is_active);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_template_questions_template ON template_questions(template_id);
CREATE INDEX idx_template_questions_question ON template_questions(question_id);
CREATE INDEX idx_template_questions_order ON template_questions(template_id, display_order);

-- Assessment Indexes
CREATE INDEX idx_template_assessments_assessment ON template_assessments(assessment_id);
CREATE INDEX idx_template_assessments_template ON template_assessments(template_id);
CREATE INDEX idx_question_answers_template_assessment ON question_answers(template_assessment_id);
CREATE INDEX idx_question_answers_question ON question_answers(question_id);

-- ============================================
-- TRIGGERS FOR AUTO-UPDATES
-- ============================================

-- Trigger for static_data_values updated_at
CREATE TRIGGER update_static_data_values_updated_at 
    BEFORE UPDATE ON static_data_values
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for questions updated_at
CREATE TRIGGER update_questions_updated_at 
    BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for templates updated_at
CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for template_assessments updated_at
CREATE TRIGGER update_template_assessments_updated_at 
    BEFORE UPDATE ON template_assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for question_answers updated_at
CREATE TRIGGER update_question_answers_updated_at 
    BEFORE UPDATE ON question_answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUTO-DEACTIVATE OLD STATIC DATA VALUES
-- ============================================

-- Function to deactivate old static data value when new one is inserted
CREATE OR REPLACE FUNCTION deactivate_old_static_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if new record is being set as active
    IF NEW.is_active = true THEN
        -- Deactivate all previous active records for same institution and field
        UPDATE static_data_values
        SET is_active = false,
            valid_to = NEW.valid_from
        WHERE institution_id = NEW.institution_id
          AND field_key = NEW.field_key
          AND is_active = true
          AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deactivate_old_static_data
    BEFORE INSERT OR UPDATE ON static_data_values
    FOR EACH ROW
    EXECUTE FUNCTION deactivate_old_static_data();

-- ============================================
-- VIEWS FOR EASY QUERIES
-- ============================================

-- View: Current Active Static Data (No History)
CREATE OR REPLACE VIEW current_static_data AS
SELECT 
    sdv.id,
    sdv.institution_id,
    e.name as institution_name,
    e.name_ar as institution_name_ar,
    sdv.field_key,
    sdf.field_name,
    sdf.field_name_ar,
    sdf.field_type,
    sdv.field_value,
    sdv.valid_from,
    sdv.created_at
FROM static_data_values sdv
JOIN entities e ON sdv.institution_id = e.id
JOIN static_data_fields sdf ON sdv.field_key = sdf.field_key
WHERE sdv.is_active = true;

-- View: Template Summary with Question Count
CREATE OR REPLACE VIEW template_summary AS
SELECT 
    t.id,
    t.name,
    t.name_ar,
    t.description,
    t.category,
    t.version,
    t.is_active,
    COUNT(tq.id) as question_count,
    SUM(COALESCE(tq.override_weight, q.weight)) as total_weight,
    t.created_at,
    u.full_name as created_by_name
FROM templates t
LEFT JOIN template_questions tq ON t.id = tq.template_id
LEFT JOIN questions q ON tq.question_id = q.id
LEFT JOIN users u ON t.created_by = u.id
GROUP BY t.id, u.full_name;

-- View: Assessment with Template Info
CREATE OR REPLACE VIEW assessment_with_template AS
SELECT 
    a.id as assessment_id,
    a.entity_id,
    e.name as entity_name,
    e.name_ar as entity_name_ar,
    a.status,
    a.year,
    a.quarter,
    ta.id as template_assessment_id,
    ta.template_id,
    t.name as template_name,
    t.name_ar as template_name_ar,
    ta.total_possible_score,
    ta.total_achieved_score,
    ta.percentage_score,
    a.created_at,
    a.submitted_at
FROM assessments a
LEFT JOIN template_assessments ta ON a.id = ta.assessment_id
LEFT JOIN templates t ON ta.template_id = t.id
LEFT JOIN entities e ON a.entity_id = e.id;

-- ============================================
-- SAMPLE DATA FOR TESTING
-- ============================================

-- Sample Static Data Fields
INSERT INTO static_data_fields (field_key, field_name, field_name_ar, field_type, field_category, is_required, display_order) VALUES
('total_employees', 'Total Employees', 'إجمالي الموظفين', 'number', 'general', true, 1),
('it_staff', 'IT Staff Count', 'عدد موظفي تقنية المعلومات', 'number', 'general', true, 2),
('cybersecurity_staff', 'Cybersecurity Staff', 'موظفي الأمن السيبراني', 'number', 'general', true, 3),
('has_data_center', 'Has Data Center', 'يمتلك مركز بيانات', 'boolean', 'infrastructure', true, 4),
('website_domain', 'Website Domain', 'نطاق الموقع الإلكتروني', 'text', 'digital_services', false, 5),
('has_iso27001', 'ISO 27001 Certified', 'حاصل على شهادة ISO 27001', 'boolean', 'security', false, 6),
('has_firewall', 'Has Firewall', 'يمتلك جدار حماية', 'boolean', 'security', true, 7),
('annual_budget', 'Annual IT Budget', 'الميزانية السنوية لتقنية المعلومات', 'number', 'general', false, 8);

-- Sample Static Data Values for existing entities
INSERT INTO static_data_values (institution_id, field_key, field_value, is_active, created_by) VALUES
-- National Cybersecurity Center (entity_id = 3)
(3, 'total_employees', '610', true, 2),
(3, 'it_staff', '45', true, 2),
(3, 'cybersecurity_staff', '28', true, 2),
(3, 'has_data_center', 'true', true, 2),
(3, 'website_domain', 'ncc.gov.iq', true, 2),
(3, 'has_iso27001', 'true', true, 2),
(3, 'has_firewall', 'true', true, 2),
(3, 'annual_budget', '5000000', true, 2),

-- Government IT Services (entity_id = 4)
(4, 'total_employees', '420', true, 2),
(4, 'it_staff', '32', true, 2),
(4, 'cybersecurity_staff', '8', true, 2),
(4, 'has_data_center', 'true', true, 2),
(4, 'website_domain', 'gits.modt.gov.iq', true, 2),
(4, 'has_iso27001', 'false', true, 2),
(4, 'has_firewall', 'true', true, 2),
(4, 'annual_budget', '3000000', true, 2),

-- Public Safety Department (entity_id = 5)
(5, 'total_employees', '280', true, 2),
(5, 'it_staff', '12', true, 2),
(5, 'cybersecurity_staff', '3', true, 2),
(5, 'has_data_center', 'false', true, 2),
(5, 'website_domain', 'psd.moi.gov.iq', true, 2),
(5, 'has_iso27001', 'false', true, 2),
(5, 'has_firewall', 'true', true, 2),
(5, 'annual_budget', '1500000', true, 2);

-- Sample Questions for Question Bank
INSERT INTO questions (question_text, question_text_ar, question_type, linked_static_data_field, evaluation_rule, reference_value, weight, category, created_by) VALUES
-- Static Data Linked Questions
('Does the organization have more than 500 employees?', 'هل لدى المنظمة أكثر من 500 موظف؟', 'StaticDataLinked', 'total_employees', 'greater_than', '500', 10.0, 'general', 2),
('Does the organization have adequate IT staff (≥5% of total)?', 'هل لدى المنظمة موظفي تقنية معلومات كافيين (≥5% من الإجمالي)?', 'StaticDataLinked', 'it_staff', 'greater_or_equal', '5', 15.0, 'general', 2),
('Does the organization have dedicated cybersecurity staff?', 'هل لدى المنظمة موظفين مخصصين للأمن السيبراني؟', 'StaticDataLinked', 'cybersecurity_staff', 'greater_than', '0', 20.0, 'security', 2),
('Does the organization own a data center?', 'هل تمتلك المنظمة مركز بيانات؟', 'StaticDataLinked', 'has_data_center', 'equals', 'true', 15.0, 'infrastructure', 2),
('Is the organization ISO 27001 certified?', 'هل المنظمة حاصلة على شهادة ISO 27001؟', 'StaticDataLinked', 'has_iso27001', 'equals', 'true', 20.0, 'security', 2),

-- Yes/No Questions
('Does the organization conduct regular security audits?', 'هل تجري المنظمة تدقيقات أمنية منتظمة؟', 'YesNo', NULL, NULL, NULL, 10.0, 'security', 2),
('Is there a documented incident response plan?', 'هل يوجد خطة موثقة للاستجابة للحوادث؟', 'YesNo', NULL, NULL, NULL, 15.0, 'security', 2),

-- Multi-Choice Questions
('What is the maturity level of your backup strategy?', 'ما مستوى نضج استراتيجية النسخ الاحتياطي لديك؟', 'MultiChoice', NULL, NULL, NULL, 15.0, 'security', 2),
('What is the level of security awareness training?', 'ما مستوى التدريب على الوعي الأمني؟', 'MultiChoice', NULL, NULL, NULL, 10.0, 'security', 2),

-- Manual Input Questions
('How many security incidents were reported in the last year?', 'كم عدد الحوادث الأمنية المبلغ عنها في العام الماضي؟', 'Manual', NULL, 'less_or_equal', '5', 10.0, 'security', 2);

-- Set options for multi-choice questions
UPDATE questions SET options = '{"None": 0, "Basic": 5, "Intermediate": 10, "Advanced": 15}'::jsonb 
WHERE question_text LIKE '%backup strategy%';

UPDATE questions SET options = '{"None": 0, "Annual": 3, "Quarterly": 7, "Monthly": 10}'::jsonb 
WHERE question_text LIKE '%awareness training%';

-- Sample Templates
INSERT INTO templates (name, name_ar, description, description_ar, category, created_by) VALUES
('Basic Security Assessment', 'تقييم الأمن الأساسي', 'Basic cybersecurity maturity assessment focusing on fundamental controls', 'تقييم نضج الأمن السيبراني الأساسي مع التركيز على الضوابط الأساسية', 'security', 2),
('Comprehensive Maturity Assessment', 'تقييم النضج الشامل', 'Complete organizational maturity assessment covering all aspects', 'تقييم شامل لنضج المنظمة يغطي جميع الجوانب', 'maturity', 2),
('Infrastructure Readiness Check', 'فحص جاهزية البنية التحتية', 'Evaluation of infrastructure capabilities and readiness', 'تقييم قدرات وجاهزية البنية التحتية', 'infrastructure', 2);

-- Link Questions to Templates
-- Basic Security Assessment (Template 1)
INSERT INTO template_questions (template_id, question_id, display_order, section_name, section_name_ar) VALUES
(1, 3, 1, 'Personnel', 'الموظفون'),
(1, 5, 2, 'Compliance', 'الامتثال'),
(1, 6, 3, 'Security Operations', 'العمليات الأمنية'),
(1, 7, 4, 'Security Operations', 'العمليات الأمنية'),
(1, 8, 5, 'Data Protection', 'حماية البيانات');

-- Comprehensive Maturity Assessment (Template 2)
INSERT INTO template_questions (template_id, question_id, display_order, section_name, section_name_ar) VALUES
(2, 1, 1, 'General Information', 'المعلومات العامة'),
(2, 2, 2, 'General Information', 'المعلومات العامة'),
(2, 3, 3, 'Personnel', 'الموظفون'),
(2, 4, 4, 'Infrastructure', 'البنية التحتية'),
(2, 5, 5, 'Compliance', 'الامتثال'),
(2, 6, 6, 'Security Operations', 'العمليات الأمنية'),
(2, 7, 7, 'Security Operations', 'العمليات الأمنية'),
(2, 8, 8, 'Data Protection', 'حماية البيانات'),
(2, 9, 9, 'Training', 'التدريب'),
(2, 10, 10, 'Incident Management', 'إدارة الحوادث');

-- Infrastructure Readiness Check (Template 3)
INSERT INTO template_questions (template_id, question_id, display_order, section_name, section_name_ar) VALUES
(3, 1, 1, 'Scale', 'الحجم'),
(3, 2, 2, 'Staffing', 'التوظيف'),
(3, 4, 3, 'Facilities', 'المرافق'),
(3, 8, 4, 'Data Protection', 'حماية البيانات');

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE static_data_fields IS 'Defines the structure of national static data fields';
COMMENT ON TABLE static_data_values IS 'Versioned storage of static data - maintains historical snapshots';
COMMENT ON TABLE questions IS 'Global reusable question bank - not tied to any institution';
COMMENT ON TABLE templates IS 'Evaluation scenarios/strategies that group questions';
COMMENT ON TABLE template_questions IS 'Links questions to templates with ordering and weights';
COMMENT ON TABLE template_assessments IS 'Links regular assessments to templates with scores';
COMMENT ON TABLE question_answers IS 'Stores answers with frozen snapshots from static data';

COMMENT ON COLUMN static_data_values.is_active IS 'Only one active record per institution+field at a time';
COMMENT ON COLUMN static_data_values.valid_from IS 'When this value became active';
COMMENT ON COLUMN static_data_values.valid_to IS 'When this value was replaced (NULL if still active)';

COMMENT ON COLUMN questions.question_type IS 'Determines how the question is answered and evaluated';
COMMENT ON COLUMN questions.linked_static_data_field IS 'For StaticDataLinked - which field to read';
COMMENT ON COLUMN questions.evaluation_rule IS 'How to evaluate the answer (>, <, =, etc.)';
COMMENT ON COLUMN questions.reference_value IS 'The value to compare against';
COMMENT ON COLUMN questions.options IS 'For MultiChoice - JSON map of options to scores';

COMMENT ON COLUMN question_answers.linked_static_data_value IS 'Frozen snapshot of static data value at assessment time';
COMMENT ON COLUMN question_answers.evaluation_passed IS 'Whether the answer met the evaluation criteria';
