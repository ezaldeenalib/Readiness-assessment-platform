-- إصلاح فوري لخطأ: violates check constraint "questions_question_type_check"
-- يشغّل مرة واحدة فقط. الجدول: questions (حروف صغيرة)

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;

ALTER TABLE questions ADD CONSTRAINT questions_question_type_check
  CHECK (question_type IN (
    'Manual',
    'YesNo',
    'MultiChoice',
    'MultiSelect',
    'StaticData',
    'Composite'
  ));
