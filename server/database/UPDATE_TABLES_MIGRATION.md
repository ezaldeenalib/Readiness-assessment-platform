# Migration: تحديث جداول question_answers و template_questions

**التاريخ:** 2026-02-01  
**الحالة:** ✅ جاهز للتطبيق

---

## ملخص التعديلات

### 1️⃣ حذف حقول من جدول `question_answers`

تم حذف الحقول التالية التي لم تعد مطلوبة:

- ❌ `linked_static_data_value` (TEXT)
- ❌ `linked_static_data_field` (VARCHAR)
- ❌ `inherited_from_template_assessment_id` (INTEGER)
- ❌ `linked_static_data_snapshot` (JSONB) - إن وُجد

### 2️⃣ إضافة حقل إلى جدول `template_questions`

تمت إضافة حقل جديد:

- ✅ `include_in_evaluation` (BOOLEAN, DEFAULT true)
  - **الوصف بالعربي:** هل يدخل السؤال في التقييم؟
  - **القيم:** `true` = نعم، يدخل في التقييم | `false` = لا، لا يدخل في التقييم
  - **الافتراضي:** `true` (جميع الأسئلة تدخل في التقييم افتراضياً)

---

## كيفية التطبيق

### الطريقة 1: استخدام npm script (الموصى بها)

```bash
npm run db:update-tables
```

### الطريقة 2: تشغيل مباشر

```bash
node server/database/run_update_question_tables.js
```

### الطريقة 3: تطبيق SQL يدوياً

```bash
psql -U your_user -d your_database -f server/database/update_question_tables.sql
```

---

## البنية الجديدة

### جدول `question_answers` (بعد التعديل)

```sql
CREATE TABLE question_answers (
    id SERIAL PRIMARY KEY,
    template_assessment_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    template_question_id INTEGER,
    answer_value TEXT,
    evaluation_passed BOOLEAN,
    score_achieved DECIMAL(5,2) DEFAULT 0,
    evaluation_notes TEXT,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answered_by INTEGER,
    UNIQUE(template_assessment_id, question_id)
);
```

**الحقول المحذوفة:**
- ~~linked_static_data_value~~
- ~~linked_static_data_field~~
- ~~inherited_from_template_assessment_id~~

### جدول `template_questions` (بعد التعديل)

```sql
CREATE TABLE template_questions (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    question_order INTEGER NOT NULL,
    section_name VARCHAR(255),
    section_name_ar VARCHAR(255),
    override_weight DECIMAL(5,2),
    is_required BOOLEAN DEFAULT true,
    include_in_evaluation BOOLEAN DEFAULT true NOT NULL,  -- ✨ جديد
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, question_id)
);
```

**الحقل الجديد:**
- ✅ `include_in_evaluation` - هل يدخل السؤال في حساب التقييم؟

---

## استخدام الحقل الجديد `include_in_evaluation`

### في API

عند إنشاء أو تحديث سؤال في قالب:

```javascript
// إضافة سؤال يدخل في التقييم (افتراضي)
POST /api/template-questions
{
  "template_id": 1,
  "question_id": 5,
  "question_order": 3,
  "include_in_evaluation": true  // يدخل في التقييم
}

// إضافة سؤال للعرض فقط (لا يدخل في التقييم)
POST /api/template-questions
{
  "template_id": 1,
  "question_id": 6,
  "question_order": 4,
  "include_in_evaluation": false  // لا يدخل في التقييم
}
```

### في حساب الدرجات

عند حساب نتيجة التقييم، يجب تضمين فقط الأسئلة التي `include_in_evaluation = true`:

```sql
-- حساب الدرجة الكلية (الأسئلة التي تدخل في التقييم فقط)
SELECT 
    SUM(qa.score_achieved) as total_score,
    SUM(
        CASE 
            WHEN tq.include_in_evaluation = true 
            THEN COALESCE(tq.override_weight, q.weight) 
            ELSE 0 
        END
    ) as max_possible_score
FROM question_answers qa
JOIN template_questions tq ON qa.template_question_id = tq.id
JOIN questions q ON qa.question_id = q.id
WHERE qa.template_assessment_id = $1
  AND tq.include_in_evaluation = true;
```

---

## حالات الاستخدام

### 1. أسئلة للعرض فقط
أسئلة تُعرض للمستخدم للعلم فقط، لكن لا تدخل في حساب الدرجة:

```javascript
include_in_evaluation: false
```

**مثال:**
- "ما هو اسم المؤسسة؟" (معلومات فقط)
- "تم آخر تحديث للنظام بتاريخ..." (عرض فقط)

### 2. أسئلة تدخل في التقييم (الافتراضي)

```javascript
include_in_evaluation: true  // أو لا تمرر القيمة (افتراضي)
```

**مثال:**
- "هل يوجد جدار حماية؟" (يدخل في التقييم)
- "عدد موظفي الأمن السيبراني" (يدخل في التقييم)

---

## التحقق من نجاح Migration

بعد تشغيل الـ migration، تحقق من التعديلات:

```sql
-- التحقق من حذف الأعمدة
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'question_answers'
ORDER BY ordinal_position;
-- يجب ألا تجد: linked_static_data_value, linked_static_data_field, inherited_from_template_assessment_id

-- التحقق من إضافة العمود الجديد
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'template_questions' 
  AND column_name = 'include_in_evaluation';
-- يجب أن تجد: include_in_evaluation | boolean | true
```

---

## تحديث الكود

### Backend (API Routes)

تحديث route إنشاء/تحديث template questions:

```javascript
// server/routes/templateQuestions.js
router.post('/', async (req, res) => {
  const { 
    template_id, 
    question_id, 
    question_order,
    include_in_evaluation = true  // افتراضي true
  } = req.body;
  
  const result = await pool.query(
    `INSERT INTO template_questions 
     (template_id, question_id, question_order, include_in_evaluation) 
     VALUES ($1, $2, $3, $4) 
     RETURNING *`,
    [template_id, question_id, question_order, include_in_evaluation]
  );
  
  res.json(result.rows[0]);
});
```

### Frontend (React)

إضافة toggle في واجهة إضافة الأسئلة للقالب:

```jsx
// QuestionSelector.jsx
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    id="includeInEvaluation"
    checked={includeInEvaluation}
    onChange={(e) => setIncludeInEvaluation(e.target.checked)}
  />
  <label htmlFor="includeInEvaluation">
    يدخل في التقييم / Include in Evaluation
  </label>
</div>
```

---

## الملفات المتأثرة

### ملفات Migration
- ✅ `server/database/update_question_tables.sql` (جديد)
- ✅ `server/database/run_update_question_tables.js` (جديد)
- ✅ `package.json` (script جديد: `db:update-tables`)

### ملفات تحتاج تحديث (اختياري)
- `server/routes/templateQuestions.js` - دعم `include_in_evaluation`
- `server/routes/assessments.js` - حساب الدرجات بناءً على `include_in_evaluation`
- Frontend components لإدارة القوالب

---

## الخطوات التالية

1. ✅ تطبيق الـ migration (`npm run db:update-tables`)
2. ⏭️ تحديث API routes لدعم الحقل الجديد
3. ⏭️ تحديث Frontend لإضافة toggle "يدخل في التقييم"
4. ⏭️ تحديث منطق حساب الدرجات لتجاهل الأسئلة التي `include_in_evaluation = false`
5. ⏭️ اختبار شامل

---

## ملاحظات مهمة

⚠️ **تحذير:** هذا الـ migration يحذف أعمدة من قاعدة البيانات. تأكد من:
1. عمل backup للقاعدة قبل التطبيق
2. التأكد من أن الحقول المحذوفة لم تعد مستخدمة في الكود

✅ **آمن:** الـ migration يستخدم `IF EXISTS` و `DO` blocks لتجنب الأخطاء إذا كانت التعديلات مطبقة مسبقاً.

---

**تم التحديث بتاريخ:** 2026-02-01  
**تم بواسطة:** AI Assistant
