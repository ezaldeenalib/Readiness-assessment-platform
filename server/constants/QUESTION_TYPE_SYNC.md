# Question Type — Frontend, Backend, DB Sync

## مصدر واحد للحقيقة

- **Backend:** `server/constants/questionTypes.js` → `VALID_QUESTION_TYPES`
- **DB:** قيد CHECK يجب أن يطابق نفس القيم (تشغيل migration عند إضافة نوع جديد)
- **Frontend:** استخدام نفس القيم في `question_type` و `questionTypesList`

## القيم المسموحة حالياً

```text
Manual, YesNo, MultiChoice, MultiSelect, StaticData, Composite
```

## 1) JavaScript — التحقق والدوال

```js
import { VALID_QUESTION_TYPES, validateQuestionType, validateQuestionTypeMiddleware } from './constants/questionTypes.js';

// التحقق قبل الإدراج/التحديث
const result = validateQuestionType(req.body.question_type);
if (!result.valid) return res.status(400).json({ message: result.error });

// اختياري: middleware على routes الأسئلة
router.post('/', validateQuestionTypeMiddleware, createQuestion);
```

## 2) مثال طلب (Request Payload)

```json
{
  "code": "Q-MULTI-01",
  "text_en": "Select all that apply",
  "text_ar": "اختر كل ما ينطبق",
  "question_type": "MultiSelect",
  "options": {
    "Option A": 5,
    "Option B": 3,
    "أخرى": 0
  },
  "weight": 1,
  "category": "general"
}
```

لا تحتاج إلى mapping: القيمة المرسلة من الواجهة (`MultiSelect`) هي نفسها القيمة المخزنة في DB.

## 3) إصلاح خطأ CHECK في قاعدة البيانات

عند ظهور:

```text
violates check constraint "questions_question_type_check"
```

شغّل migration إضافة `MultiSelect` إلى القيد:

```bash
# من مجلد المشروع
node server/database/run_add_multiselect.js
```

أو تنفيذ SQL يدوياً:

```bash
psql -U your_user -d your_database -f server/database/add_multiselect_type.sql
```

## 4) SQL بديل (تعديل القيد يدوياً)

إذا كان اسم الجدول `questions` (أصغر حروفاً):

```sql
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
```

إذا كان اسم الجدول `"Questions"` (بعلامات اقتباس):

```sql
ALTER TABLE "Questions" DROP CONSTRAINT IF EXISTS "Questions_question_type_check";
ALTER TABLE "Questions" ADD CONSTRAINT "Questions_question_type_check"
  CHECK (question_type IN (
    'Manual', 'YesNo', 'MultiChoice', 'MultiSelect', 'StaticData', 'Composite'
  ));
```

## 5) إضافة نوع جديد لاحقاً

1. إضافة القيمة في `server/constants/questionTypes.js` → `VALID_QUESTION_TYPES`.
2. إنشاء migration جديد يعدّل قيد CHECK (أو إضافة قيمة إلى ENUM إن كان الجدول يستخدم ENUM).
3. تشغيل الـ migration.
4. تحديث الواجهة لاستخدام القيمة الجديدة في `question_type` و `questionTypesList`.
