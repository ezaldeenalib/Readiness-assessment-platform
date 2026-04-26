-- إضافة أنواع الأسئلة الجديدة إلى question_type ENUM
-- Add new question types to question_type ENUM (MultiSelect, StaticData, Composite)
-- تشغّل مرة واحدة - إذا كانت القيمة موجودة سيظهر خطأ يمكن تجاهله

ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'MultiSelect';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'StaticData';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'Composite';
