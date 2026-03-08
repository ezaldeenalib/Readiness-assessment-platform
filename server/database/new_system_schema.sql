-- ============================================
-- نظام التقييم الجديد - الهيكل الكامل
-- New Assessment System - Complete Structure
-- ============================================

-- ============================================
-- 1️⃣ جدول الأسئلة (Questions)
-- ============================================
CREATE TABLE Questions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    text_en TEXT NOT NULL,
    text_ar TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('Manual', 'YesNo', 'MultiChoice', 'StaticData', 'Composite')),
    parent_question_id INT NULL,
    trigger_answer_value TEXT NULL,
    composite_columns JSONB NULL,
    weight INT DEFAULT 1,
    category VARCHAR(100) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_parent_question FOREIGN KEY (parent_question_id)
        REFERENCES Questions(id)
        ON DELETE SET NULL
);

-- ============================================
-- 2️⃣ جدول الإجابات (Answers)
-- ============================================
CREATE TABLE Answers (
    id SERIAL PRIMARY KEY,
    institution_id INT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    template_id INT NULL,
    question_id INT NOT NULL REFERENCES Questions(id) ON DELETE CASCADE,
    answer_value JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP DEFAULT NOW(),
    valid_to TIMESTAMP NULL,
    assessment_id INT NULL REFERENCES assessments(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3️⃣ جدول سجل العمليات (AuditLog)
-- ============================================
CREATE TABLE AuditLog (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INT NOT NULL,
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
    old_value JSONB NULL,
    new_value JSONB NULL,
    performed_by VARCHAR(100) NOT NULL,
    performed_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Indexes للأداء
-- ============================================
CREATE INDEX idx_questions_code ON Questions(code);
CREATE INDEX idx_questions_type ON Questions(question_type);
CREATE INDEX idx_questions_parent ON Questions(parent_question_id);
CREATE INDEX idx_questions_category ON Questions(category);
CREATE INDEX idx_questions_active ON Questions(is_active);

CREATE INDEX idx_answers_institution ON Answers(institution_id);
CREATE INDEX idx_answers_question ON Answers(question_id);
CREATE INDEX idx_answers_assessment ON Answers(assessment_id);
CREATE INDEX idx_answers_active ON Answers(is_active);
CREATE INDEX idx_answers_valid_from ON Answers(valid_from);
CREATE INDEX idx_answers_composite ON Answers USING GIN (answer_value);

CREATE INDEX idx_auditlog_table_record ON AuditLog(table_name, record_id);
CREATE INDEX idx_auditlog_operation ON AuditLog(operation_type);
CREATE INDEX idx_auditlog_performed_at ON AuditLog(performed_at);
CREATE INDEX idx_auditlog_performed_by ON AuditLog(performed_by);

-- ============================================
-- Trigger لتحديث updated_at في Questions
-- ============================================
CREATE OR REPLACE FUNCTION update_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_questions_updated_at ON Questions;
CREATE TRIGGER trigger_update_questions_updated_at
    BEFORE UPDATE ON Questions
    FOR EACH ROW
    EXECUTE FUNCTION update_questions_updated_at();

-- ============================================
-- Function لإنشاء Snapshot للتقييم
-- ============================================
CREATE OR REPLACE FUNCTION create_assessment_snapshot(p_assessment_id INT, p_performed_by VARCHAR(100))
RETURNS VOID AS $$
DECLARE
    v_institution_id INT;
    v_answer_record RECORD;
BEGIN
    -- الحصول على institution_id من التقييم
    SELECT entity_id INTO v_institution_id
    FROM assessments
    WHERE id = p_assessment_id;
    
    IF v_institution_id IS NULL THEN
        RAISE EXCEPTION 'Assessment not found: %', p_assessment_id;
    END IF;
    
    -- نسخ كل الإجابات النشطة الحالية مع assessment_id
    FOR v_answer_record IN
        SELECT *
        FROM Answers
        WHERE institution_id = v_institution_id
          AND is_active = TRUE
          AND assessment_id IS NULL
    LOOP
        -- إنشاء نسخة من الإجابة مع assessment_id
        INSERT INTO Answers (
            institution_id,
            template_id,
            question_id,
            answer_value,
            is_active,
            valid_from,
            assessment_id,
            created_at
        )
        VALUES (
            v_answer_record.institution_id,
            v_answer_record.template_id,
            v_answer_record.question_id,
            v_answer_record.answer_value,
            TRUE,
            NOW(),
            p_assessment_id,
            NOW()
        );
        
        -- تسجيل العملية في AuditLog
        INSERT INTO AuditLog (
            table_name,
            record_id,
            operation_type,
            new_value,
            performed_by
        )
        VALUES (
            'Answers',
            (SELECT id FROM Answers WHERE assessment_id = p_assessment_id 
             AND question_id = v_answer_record.question_id 
             ORDER BY created_at DESC LIMIT 1),
            'INSERT',
            jsonb_build_object(
                'institution_id', v_answer_record.institution_id,
                'question_id', v_answer_record.question_id,
                'answer_value', v_answer_record.answer_value,
                'assessment_id', p_assessment_id
            ),
            p_performed_by
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Comments للتوثيق
-- ============================================
COMMENT ON TABLE Questions IS 'جدول موحد للأسئلة - يدعم الأسئلة العادية، الفرعية، والمركبة';
COMMENT ON TABLE Answers IS 'جدول موحد للإجابات - يدعم كل أنواع الإجابات مع نظام Versioning';
COMMENT ON TABLE AuditLog IS 'سجل كامل لجميع العمليات في النظام';

COMMENT ON COLUMN Questions.composite_columns IS 'رؤوس الأعمدة للأسئلة المركبة - JSONB array';
COMMENT ON COLUMN Questions.parent_question_id IS 'رابط للسؤال الأب في حالة الأسئلة الفرعية';
COMMENT ON COLUMN Questions.trigger_answer_value IS 'قيمة الإجابة المطلوبة لإظهار السؤال الفرعي';

COMMENT ON COLUMN Answers.answer_value IS 'قيمة الإجابة - نص/رقم/JSON حسب نوع السؤال';
COMMENT ON COLUMN Answers.is_active IS 'هل الإجابة نشطة (false = تم تعطيلها)';
COMMENT ON COLUMN Answers.assessment_id IS 'Snapshot للتقييم - إذا كان موجوداً، الإجابة مجمدة';

COMMENT ON COLUMN AuditLog.old_value IS 'القيمة القديمة قبل التعديل';
COMMENT ON COLUMN AuditLog.new_value IS 'القيمة الجديدة بعد التعديل';
