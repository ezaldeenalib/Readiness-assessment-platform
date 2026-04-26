-- جدول إجابات قديم (مؤسسة + سؤال) للتوافق مع routes/answers.js
-- يُنشأ فقط إن لم يكن موجوداً — لا يتعارض مع question_answers (تقييم القوالب)

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
