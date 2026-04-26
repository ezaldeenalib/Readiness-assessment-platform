-- =============================================================================
-- ترحيل موحد - قاعدة بيانات نظام التقييم الرقمي والأمن السيبراني
-- UNIFIED MIGRATION - Digital Maturity & Cybersecurity Assessment System
-- =============================================================================
-- يجمع جميع عمليات الترحيل في ملف واحد
-- آمن للتشغيل على قاعدة جديدة أو موجودة (idempotent)
--
-- الاستخدام:
--   ترحيل من الصفر:  node server/database/run_unified_migrate.js --fresh
--   ترحيل تزايدي:    node server/database/run_unified_migrate.js
-- =============================================================================

-- =============================================================================
-- القسم 1: الجداول الأساسية (schema.sql)
-- =============================================================================

-- Drop existing tables (للتشغيل مع --fresh فقط - يتم تخطيه في الوضع التزايدي)
-- في الوضع التزايدي، لا ننفذ DROP

-- Create ENUM types (إن لم تكن موجودة)
DO $$ BEGIN
  CREATE TYPE entity_activity_type AS ENUM ('government', 'mixed', 'private');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'ministry_admin', 'entity_user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE assessment_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'entity_user',
    entity_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entities table
CREATE TABLE IF NOT EXISTS entities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    activity_type entity_activity_type NOT NULL,
    parent_entity_id INTEGER REFERENCES entities(id) ON DELETE SET NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assessments table
CREATE TABLE IF NOT EXISTS assessments (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status assessment_status NOT NULL DEFAULT 'draft',
    maturity_score DECIMAL(5,2),
    risk_level VARCHAR(20),
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    year INTEGER NOT NULL,
    quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assessment Data table (7 خطوات)
CREATE TABLE IF NOT EXISTS assessment_data (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL CHECK (step_number BETWEEN 1 AND 7),
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_id, step_number)
);

-- Add foreign key for users.entity_id
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT fk_users_entity 
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_entity_id ON users(entity_id);
CREATE INDEX IF NOT EXISTS idx_entities_parent ON entities(parent_entity_id);
CREATE INDEX IF NOT EXISTS idx_assessments_entity ON assessments(entity_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_year ON assessments(year);
CREATE INDEX IF NOT EXISTS idx_assessment_data_assessment ON assessment_data(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_data_step ON assessment_data(step_number);
CREATE INDEX IF NOT EXISTS idx_assessment_data_jsonb ON assessment_data USING GIN (data);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_entities_updated_at ON entities;
CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assessments_updated_at ON assessments;
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assessment_data_updated_at ON assessment_data;
CREATE TRIGGER update_assessment_data_updated_at BEFORE UPDATE ON assessment_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample entities (فقط إذا كانت الجداول فارغة)
INSERT INTO entities (name, name_ar, activity_type, parent_entity_id, contact_email)
SELECT name, name_ar, activity_type, parent_entity_id, contact_email FROM (VALUES 
    ('Ministry of Digital Transformation', 'وزارة التحول الرقمي', 'government'::entity_activity_type, NULL::integer, 'info@modt.gov.iq'),
    ('Ministry of Interior', 'وزارة الداخلية', 'government'::entity_activity_type, NULL::integer, 'contact@moi.gov.iq')
) AS v(name, name_ar, activity_type, parent_entity_id, contact_email)
WHERE NOT EXISTS (SELECT 1 FROM entities LIMIT 1);

INSERT INTO entities (name, name_ar, activity_type, parent_entity_id, contact_email)
SELECT name, name_ar, activity_type, parent_entity_id, contact_email FROM (VALUES 
    ('National Cybersecurity Center', 'المركز الوطني للأمن السيبراني', 'government'::entity_activity_type, 1::integer, 'ncc@modt.gov.iq'),
    ('Government IT Services', 'خدمات تقنية المعلومات الحكومية', 'government'::entity_activity_type, 1::integer, 'gits@modt.gov.iq'),
    ('Public Safety Department', 'دائرة السلامة العامة', 'government'::entity_activity_type, 2::integer, 'psd@moi.gov.iq')
) AS v(name, name_ar, activity_type, parent_entity_id, contact_email)
WHERE EXISTS (SELECT 1 FROM entities WHERE id = 1) AND NOT EXISTS (SELECT 1 FROM entities WHERE id = 3);

-- Sample users (يتم استبدال كلمة المرور في السكربت)
INSERT INTO users (email, password_hash, full_name, role, entity_id)
SELECT * FROM (VALUES 
    ('admin@system.gov', '$2a$10$YourHashedPasswordHere', 'System Administrator', 'super_admin'::user_role, NULL),
    ('admin@modt.gov', '$2a$10$YourHashedPasswordHere', 'Ministry Admin', 'ministry_admin'::user_role, 1),
    ('user@ncc.gov', '$2a$10$YourHashedPasswordHere', 'NCC Manager', 'entity_user'::user_role, 3)
) AS v(email, password_hash, full_name, role, entity_id)
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = v.email);

-- Views
CREATE OR REPLACE VIEW assessment_summary AS
SELECT a.id, a.status, a.maturity_score, a.risk_level, a.year, a.quarter,
    e.name as entity_name, e.name_ar as entity_name_ar, e.activity_type,
    u.full_name as created_by_name, a.created_at, a.submitted_at,
    (SELECT COUNT(*) FROM assessment_data ad WHERE ad.assessment_id = a.id) as completed_steps
FROM assessments a
JOIN entities e ON a.entity_id = e.id
JOIN users u ON a.created_by = u.id;

CREATE OR REPLACE VIEW entity_hierarchy AS
WITH RECURSIVE entity_tree AS (
    SELECT id, name, name_ar, parent_entity_id, 0 as level, ARRAY[id] as path
    FROM entities WHERE parent_entity_id IS NULL
    UNION ALL
    SELECT e.id, e.name, e.name_ar, e.parent_entity_id, et.level + 1, et.path || e.id
    FROM entities e JOIN entity_tree et ON e.parent_entity_id = et.id
)
SELECT * FROM entity_tree;


-- =============================================================================
-- القسم 2: محرك التقييم - Static Data & Question Bank
-- =============================================================================

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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema='public' AND table_name='static_data_values' AND constraint_name LIKE '%field_key%') THEN
    ALTER TABLE static_data_values ADD CONSTRAINT static_data_values_field_key_fkey 
      FOREIGN KEY (field_key) REFERENCES static_data_fields(field_key) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- evaluation_rule ENUM
DO $$ BEGIN
  CREATE TYPE evaluation_rule AS ENUM (
    'greater_than', 'less_than', 'equals', 'not_equals', 'contains', 'exists',
    'greater_or_equal', 'less_or_equal', 'in_range'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- questions table - استخدام VARCHAR + CHECK بدلاً من ENUM للتوافق مع questionTypes.js
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    question_text_ar TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    linked_static_data_field VARCHAR(100),
    evaluation_rule evaluation_rule,
    reference_value TEXT,
    reference_value_max TEXT,
    options JSONB,
    parent_question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    trigger_answer_value TEXT,
    composite_columns JSONB,
    weight DECIMAL(5,2) DEFAULT 10.0,
    description TEXT,
    description_ar TEXT,
    help_text TEXT,
    help_text_ar TEXT,
    category VARCHAR(100),
    category_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- تحويل question_type من ENUM إلى VARCHAR إن وُجد (للقواعد الموجودة مسبقاً)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_type t ON a.atttypid = t.oid
    WHERE n.nspname = 'public' AND c.relname = 'questions' AND a.attname = 'question_type'
    AND a.attnum > 0 AND NOT a.attisdropped AND t.typname = 'question_type') THEN
    ALTER TABLE questions ALTER COLUMN question_type TYPE VARCHAR(50) USING question_type::text;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- إصلاح question_type: إضافة CHECK للقيم المسموحة
DO $$
BEGIN
  ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
  ALTER TABLE questions ADD CONSTRAINT questions_question_type_check
    CHECK (question_type IN (
      'Manual', 'YesNo', 'MultiChoice', 'MultiSelect', 'StaticData', 'Composite',
      'StaticDataLinked', 'ParentChild'
    ));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- إضافة composite_columns و category_id إن لم يكونا موجودين
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='questions' AND column_name='composite_columns') THEN
    ALTER TABLE questions ADD COLUMN composite_columns JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='questions' AND column_name='category_id') THEN
    ALTER TABLE questions ADD COLUMN category_id INTEGER;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- =============================================================================
-- القسم 3: القوالب والتقييمات
-- =============================================================================

CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    description TEXT,
    description_ar TEXT,
    version VARCHAR(20) DEFAULT '1.0',
    category VARCHAR(100),
    category_id INTEGER,
    axis_weights JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='templates' AND column_name='axis_weights') THEN
    ALTER TABLE templates ADD COLUMN axis_weights JSONB DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='templates' AND column_name='category_id') THEN
    ALTER TABLE templates ADD COLUMN category_id INTEGER;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS template_questions (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL,
    override_weight DECIMAL(8,4),
    is_required BOOLEAN DEFAULT true,
    section_name VARCHAR(255),
    section_name_ar VARCHAR(255),
    section_id INTEGER,
    include_in_evaluation BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, question_id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='template_questions' AND column_name='include_in_evaluation') THEN
    ALTER TABLE template_questions ADD COLUMN include_in_evaluation BOOLEAN DEFAULT true NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='template_questions' AND column_name='section_id') THEN
    ALTER TABLE template_questions ADD COLUMN section_id INTEGER;
  END IF;
  ALTER TABLE template_questions ALTER COLUMN override_weight TYPE DECIMAL(8,4);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

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

CREATE TABLE IF NOT EXISTS question_answers (
    id SERIAL PRIMARY KEY,
    template_assessment_id INTEGER NOT NULL REFERENCES template_assessments(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id),
    answer_value TEXT,
    score_achieved DECIMAL(10,2) DEFAULT 0,
    max_possible_score DECIMAL(10,2) NOT NULL,
    evaluation_passed BOOLEAN,
    evaluation_notes TEXT,
    answered_by INTEGER REFERENCES users(id),
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_assessment_id, question_id)
);

-- حذف أعمدة قديمة من question_answers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='question_answers' AND column_name='linked_static_data_value') THEN
    ALTER TABLE question_answers DROP COLUMN linked_static_data_value;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='question_answers' AND column_name='linked_static_data_field') THEN
    ALTER TABLE question_answers DROP COLUMN linked_static_data_field;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='question_answers' AND column_name='inherited_from_template_assessment_id') THEN
    ALTER TABLE question_answers DROP CONSTRAINT IF EXISTS question_answers_inherited_fk;
    ALTER TABLE question_answers DROP COLUMN inherited_from_template_assessment_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='question_answers' AND column_name='linked_static_data_snapshot') THEN
    ALTER TABLE question_answers DROP COLUMN linked_static_data_snapshot;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- =============================================================================
-- القسم 4: سجل التدقيق (Audit Log)
-- =============================================================================

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
CREATE INDEX IF NOT EXISTS idx_auditlog_performed_by ON auditlog(performed_by);


-- =============================================================================
-- القسم 4ب: جداول الصلاحيات والأدوار (RBAC)
-- =============================================================================

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    label_ar VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    scope VARCHAR(50) DEFAULT 'own' CHECK (scope IN ('all', 'assigned', 'own')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_institutions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, institution_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_institutions_user ON user_institutions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_institutions_institution ON user_institutions(institution_id);

-- إدراج الصلاحيات الافتراضية
INSERT INTO permissions (name, description) VALUES
    ('view_questions', 'عرض الأسئلة'),
    ('create_question', 'إنشاء سؤال'),
    ('edit_question', 'تعديل سؤال'),
    ('delete_question', 'حذف سؤال'),
    ('view_templates', 'عرض القوالب'),
    ('create_template', 'إنشاء قالب'),
    ('edit_template', 'تعديل قالب'),
    ('delete_template', 'حذف قالب'),
    ('view_assessments', 'عرض التقييمات'),
    ('fill_assessment', 'تعبئة تقييم'),
    ('submit_assessment', 'تقديم تقييم'),
    ('evaluate_assessment', 'مراجعة وتقييم'),
    ('view_reports', 'عرض التقارير'),
    ('export_reports', 'تصدير التقارير'),
    ('manage_users', 'إدارة المستخدمين'),
    ('view_entities', 'عرض الجهات'),
    ('manage_entities', 'إدارة الجهات'),
    ('manage_categories', 'إدارة الفئات'),
    ('manage_references', 'قاموس المراجع')
ON CONFLICT (name) DO NOTHING;

-- إدراج الأدوار الافتراضية
INSERT INTO roles (name, label_ar, description, is_active) VALUES
    ('super_admin', 'مدير النظام', 'صلاحيات كاملة', TRUE),
    ('ministry_admin', 'مدير الوزارة', 'إدارة الوزارة والجهات التابعة', TRUE),
    ('entity_user', 'مستخدم الجهة', 'مستخدم جهة واحدة', TRUE),
    ('QuestionManager', 'مدير الأسئلة', 'إدارة بنك الأسئلة', TRUE),
    ('Evaluator', 'مقيّم', 'مراجعة وتقييم التقييمات', TRUE),
    ('InstitutionUser', 'مستخدم مؤسسة', 'تعبئة وتقديم التقييمات', TRUE),
    ('Viewer', 'عارض', 'عرض فقط', TRUE)
ON CONFLICT (name) DO NOTHING;


-- =============================================================================
-- القسم 5: قاموس المراجع (Reference Dictionary)
-- =============================================================================

CREATE TABLE IF NOT EXISTS reference_dictionary (
    id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    name_en VARCHAR(255),
    name_ar VARCHAR(255) NOT NULL,
    category_id INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reference_dictionary_type ON reference_dictionary(type);
CREATE INDEX IF NOT EXISTS idx_reference_dictionary_active ON reference_dictionary(is_active);


-- =============================================================================
-- القسم 6: الفئات الرئيسية (Master Categories)
-- =============================================================================

CREATE TABLE IF NOT EXISTS master_categories (
    id SERIAL PRIMARY KEY,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_master_categories_active ON master_categories(is_active);

-- ربط questions و templates و template_questions بـ master_categories
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='questions' AND column_name='category_id') THEN
    ALTER TABLE questions ADD COLUMN category_id INTEGER REFERENCES master_categories(id) ON DELETE SET NULL;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'questions_category_id_fkey') THEN
    ALTER TABLE questions ADD CONSTRAINT questions_category_id_fkey FOREIGN KEY (category_id) REFERENCES master_categories(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='templates' AND column_name='category_id') THEN
    ALTER TABLE templates ADD COLUMN category_id INTEGER REFERENCES master_categories(id) ON DELETE SET NULL;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'templates_category_id_fkey') THEN
    ALTER TABLE templates ADD CONSTRAINT templates_category_id_fkey FOREIGN KEY (category_id) REFERENCES master_categories(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='template_questions' AND column_name='section_id') THEN
    ALTER TABLE template_questions ADD COLUMN section_id INTEGER REFERENCES master_categories(id) ON DELETE SET NULL;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'template_questions_section_id_fkey') THEN
    ALTER TABLE template_questions ADD CONSTRAINT template_questions_section_id_fkey FOREIGN KEY (section_id) REFERENCES master_categories(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reference_dictionary' AND column_name='category_id') THEN
    ALTER TABLE reference_dictionary ADD COLUMN category_id INTEGER REFERENCES master_categories(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_reference_dictionary_category_id ON reference_dictionary(category_id);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- =============================================================================
-- القسم 7: قيم المراجع للتقييم (Assessment Reference Values)
-- =============================================================================

CREATE TABLE IF NOT EXISTS assessment_reference_values (
    id SERIAL PRIMARY KEY,
    assessment_answer_id INTEGER NOT NULL REFERENCES question_answers(id) ON DELETE CASCADE,
    reference_id INTEGER NOT NULL REFERENCES reference_dictionary(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    extra_json JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment_reference_attributes (
    id SERIAL PRIMARY KEY,
    assessment_reference_value_id INTEGER NOT NULL REFERENCES assessment_reference_values(id) ON DELETE CASCADE,
    attribute_type VARCHAR(100) NOT NULL,
    reference_id INTEGER NOT NULL REFERENCES reference_dictionary(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_reference_value_id, attribute_type)
);


-- =============================================================================
-- القسم 8: الفهارس والـ Triggers
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_static_data_values_institution ON static_data_values(institution_id);
CREATE INDEX IF NOT EXISTS idx_static_data_values_field ON static_data_values(field_key);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_parent ON questions(parent_question_id);
CREATE INDEX IF NOT EXISTS idx_questions_active ON questions(is_active);
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_templates_active ON templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_category_id ON templates(category_id);
CREATE INDEX IF NOT EXISTS idx_template_questions_template ON template_questions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_questions_question ON template_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_template_questions_order ON template_questions(template_id, display_order);
CREATE INDEX IF NOT EXISTS idx_template_questions_section_id ON template_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_template_assessments_assessment ON template_assessments(assessment_id);
CREATE INDEX IF NOT EXISTS idx_template_assessments_template ON template_assessments(template_id);
CREATE INDEX IF NOT EXISTS idx_question_answers_template_assessment ON question_answers(template_assessment_id);
CREATE INDEX IF NOT EXISTS idx_question_answers_question ON question_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_arv_assessment_answer ON assessment_reference_values(assessment_answer_id);
CREATE INDEX IF NOT EXISTS idx_arv_reference ON assessment_reference_values(reference_id);
CREATE INDEX IF NOT EXISTS idx_ara_reference_value ON assessment_reference_attributes(assessment_reference_value_id);

-- Triggers
DROP TRIGGER IF EXISTS update_static_data_values_updated_at ON static_data_values;
CREATE TRIGGER update_static_data_values_updated_at 
    BEFORE UPDATE ON static_data_values FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
CREATE TRIGGER update_questions_updated_at 
    BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_template_assessments_updated_at ON template_assessments;
CREATE TRIGGER update_template_assessments_updated_at 
    BEFORE UPDATE ON template_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- deactivate_old_static_data function
CREATE OR REPLACE FUNCTION deactivate_old_static_data()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE static_data_values SET is_active = false, valid_to = NEW.valid_from
    WHERE institution_id = NEW.institution_id AND field_key = NEW.field_key AND is_active = true AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deactivate_old_static_data ON static_data_values;
CREATE TRIGGER trigger_deactivate_old_static_data
    BEFORE INSERT OR UPDATE ON static_data_values FOR EACH ROW EXECUTE FUNCTION deactivate_old_static_data();


-- =============================================================================
-- القسم 9: بيانات تجريبية لمحرك التقييم (فقط إذا كانت الجداول فارغة)
-- =============================================================================

INSERT INTO static_data_fields (field_key, field_name, field_name_ar, field_type, field_category, is_required, display_order)
SELECT * FROM (VALUES
    ('total_employees', 'Total Employees', 'إجمالي الموظفين', 'number', 'general', true, 1),
    ('it_staff', 'IT Staff Count', 'عدد موظفي تقنية المعلومات', 'number', 'general', true, 2),
    ('cybersecurity_staff', 'Cybersecurity Staff', 'موظفي الأمن السيبراني', 'number', 'general', true, 3),
    ('has_data_center', 'Has Data Center', 'يمتلك مركز بيانات', 'boolean', 'infrastructure', true, 4),
    ('website_domain', 'Website Domain', 'نطاق الموقع الإلكتروني', 'text', 'digital_services', false, 5),
    ('has_iso27001', 'ISO 27001 Certified', 'حاصل على شهادة ISO 27001', 'boolean', 'security', false, 6),
    ('has_firewall', 'Has Firewall', 'يمتلك جدار حماية', 'boolean', 'security', true, 7),
    ('annual_budget', 'Annual IT Budget', 'الميزانية السنوية لتقنية المعلومات', 'number', 'general', false, 8)
) AS v(field_key, field_name, field_name_ar, field_type, field_category, is_required, display_order)
WHERE NOT EXISTS (SELECT 1 FROM static_data_fields WHERE field_key = v.field_key);

-- بيانات مرجعية تجريبية
INSERT INTO reference_dictionary (type, name_en, name_ar, display_order)
SELECT * FROM (VALUES
    ('asset_type', 'Server', 'خادم', 1),
    ('asset_type', 'Workstation', 'محطة عمل', 2),
    ('asset_type', 'Network Device', 'جهاز شبكة', 3),
    ('vendor', 'Vendor A', 'الموزع أ', 1),
    ('vendor', 'Vendor B', 'الموزع ب', 2)
) AS v(type, name_en, name_ar, display_order)
WHERE NOT EXISTS (SELECT 1 FROM reference_dictionary LIMIT 1);


-- =============================================================================
-- القسم 10: جدول answers التوافقي (إجابات مؤسسة — routes/answers.js)
-- =============================================================================
CREATE TABLE IF NOT EXISTS answers (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  template_id INTEGER NULL REFERENCES templates(id) ON DELETE SET NULL,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_value JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_to TIMESTAMP NULL,
  assessment_id INTEGER NULL REFERENCES assessments(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_answers_institution ON answers(institution_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_assessment ON answers(assessment_id);
CREATE INDEX IF NOT EXISTS idx_answers_active ON answers(is_active);


-- =============================================================================
-- انتهى الترحيل الموحد
-- =============================================================================
SELECT '✅ Unified migration completed successfully' AS status;
