# دليل النظام الجديد - New System Guide

## 📋 نظرة عامة

تم تحديث النظام بالكامل إلى هيكل جديد ومتكامل يدعم:

- ✅ جدول واحد للأسئلة (Questions) - يدعم كل أنواع الأسئلة
- ✅ جدول واحد للإجابات (Answers) - مع نظام Versioning
- ✅ جدول AuditLog - سجل كامل لجميع العمليات
- ✅ نظام Snapshot للتقييمات
- ✅ دعم الأسئلة المركبة (Composite)
- ✅ دعم الأسئلة الفرعية (Parent/Child)

---

## 🗄️ هيكل الجداول

### 1. جدول Questions

```sql
CREATE TABLE Questions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    text_en TEXT NOT NULL,
    text_ar TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- Manual | YesNo | MultiChoice | StaticData | Composite
    parent_question_id INT NULL,
    trigger_answer_value TEXT NULL,
    composite_columns JSONB NULL,
    weight INT DEFAULT 1,
    category VARCHAR(100) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. جدول Answers

```sql
CREATE TABLE Answers (
    id SERIAL PRIMARY KEY,
    institution_id INT NOT NULL,
    template_id INT NULL,
    question_id INT NOT NULL,
    answer_value JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP DEFAULT NOW(),
    valid_to TIMESTAMP NULL,
    assessment_id INT NULL, -- Snapshot ID
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. جدول AuditLog

```sql
CREATE TABLE AuditLog (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INT NOT NULL,
    operation_type VARCHAR(20) NOT NULL, -- INSERT | UPDATE | DELETE
    old_value JSONB NULL,
    new_value JSONB NULL,
    performed_by VARCHAR(100) NOT NULL,
    performed_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 التثبيت والـ Migration

### 1. تشغيل Migration

```bash
node server/database/migrate_new_system.js
```

هذا سينشئ:
- جدول Questions
- جدول Answers
- جدول AuditLog
- Indexes و Functions المطلوبة

### 2. التحقق من النجاح

```sql
-- التحقق من الجداول
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('Questions', 'Answers', 'AuditLog');

-- التحقق من Functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('create_assessment_snapshot', 'update_questions_updated_at');
```

---

## 📡 API Endpoints

### الأسئلة (Questions)

#### GET `/api/questions-new`
الحصول على جميع الأسئلة

**Query Parameters:**
- `type` - نوع السؤال (Manual, YesNo, MultiChoice, StaticData, Composite)
- `category` - الفئة
- `is_active` - true/false
- `search` - البحث في النصوص
- `institution_id` - ID المؤسسة (لإرجاع الإجابات أيضاً)
- `include_answers` - true/false

**Example:**
```javascript
GET /api/questions-new?include_answers=true&institution_id=1
```

#### POST `/api/questions-new`
إنشاء سؤال جديد

**Body:**
```json
{
  "code": "Q001",
  "text_en": "Question text in English",
  "text_ar": "نص السؤال بالعربية",
  "question_type": "YesNo",
  "parent_question_id": null,
  "trigger_answer_value": null,
  "composite_columns": null,
  "weight": 1,
  "category": "General"
}
```

**للأسئلة المركبة:**
```json
{
  "code": "Q002",
  "text_en": "Composite Question",
  "text_ar": "سؤال مركب",
  "question_type": "Composite",
  "composite_columns": [
    {"key": "column1", "label_en": "Column 1", "label_ar": "العمود 1"},
    {"key": "column2", "label_en": "Column 2", "label_ar": "العمود 2"}
  ]
}
```

**للأسئلة الفرعية:**
```json
{
  "code": "Q003",
  "text_en": "Child Question",
  "text_ar": "سؤال فرعي",
  "question_type": "YesNo",
  "parent_question_id": 1,
  "trigger_answer_value": "Yes"
}
```

---

### الإجابات (Answers)

#### GET `/api/answers/institution/:institutionId`
الحصول على إجابات مؤسسة معينة

**Query Parameters:**
- `question_id` - تصفية حسب السؤال
- `assessment_id` - تصفية حسب التقييم
- `active_only` - true/false

**Example:**
```javascript
GET /api/answers/institution/1?active_only=true
```

#### POST `/api/answers`
إضافة أو تحديث إجابة

**Body:**
```json
{
  "institution_id": 1,
  "template_id": null,
  "question_id": 1,
  "answer_value": "Yes"
}
```

**للأسئلة المركبة:**
```json
{
  "institution_id": 1,
  "question_id": 2,
  "answer_value": [
    {"column1": "value1", "column2": "value2"},
    {"column1": "value3", "column2": "value4"}
  ]
}
```

**ملاحظات:**
- عند إضافة إجابة جديدة، يتم تعطيل الإجابة القديمة تلقائياً
- يتم تسجيل العملية في AuditLog

#### DELETE `/api/answers/:id`
حذف إجابة

**ملاحظات:**
- لا يمكن حذف إجابات مرتبطة بـ snapshot
- يتم تسجيل العملية في AuditLog

#### GET `/api/answers/audit/:institutionId`
الحصول على سجل AuditLog لمؤسسة

**Query Parameters:**
- `table_name` - اسم الجدول
- `operation_type` - نوع العملية (INSERT, UPDATE, DELETE)
- `limit` - عدد النتائج (افتراضي: 100)

---

### التقييمات (Assessments)

#### POST `/api/assessments/:id/snapshot`
إنشاء snapshot للتقييم

**ملاحظات:**
- يتم نسخ كل الإجابات النشطة الحالية مع `assessment_id`
- الإجابات المرتبطة بـ snapshot لا تتأثر بالتغييرات المستقبلية

#### GET `/api/assessments/:id/answers`
الحصول على إجابات snapshot التقييم

#### POST `/api/assessments/:id/submit`
تقديم التقييم

**ملاحظات:**
- يتم إنشاء snapshot تلقائياً عند التقديم
- يتم تغيير حالة التقييم إلى 'submitted'

---

## 🔄 قواعد العمل

### إضافة/تحديث إجابة

1. البحث عن إجابة نشطة موجودة
2. إذا وُجدت، تعطيلها (`is_active = false`, `valid_to = NOW()`)
3. إضافة إجابة جديدة (`is_active = true`)
4. تسجيل العملية في AuditLog

### مسح إجابة

1. قراءة القيمة القديمة
2. حذف الإجابة
3. تسجيل العملية في AuditLog

### إنشاء Snapshot

1. الحصول على `institution_id` من التقييم
2. نسخ كل الإجابات النشطة مع `assessment_id`
3. تسجيل كل عملية في AuditLog

---

## 🎨 Frontend Integration

### استدعاء الأسئلة مع الإجابات

```javascript
const response = await fetch('/api/questions-new?include_answers=true&institution_id=1');
const { questions } = await response.json();
```

### حفظ إجابة

```javascript
await fetch('/api/answers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    institution_id: 1,
    question_id: 1,
    answer_value: "Yes"
  })
});
```

### عرض الأسئلة المركبة

```javascript
// الأسئلة المركبة تحتوي على composite_columns
const compositeQuestion = {
  question_type: 'Composite',
  composite_columns: [
    { key: 'col1', label_en: 'Column 1', label_ar: 'العمود 1' },
    { key: 'col2', label_en: 'Column 2', label_ar: 'العمود 2' }
  ]
};

// answer_value يكون array من الصفوف
const answer = [
  { col1: 'value1', col2: 'value2' },
  { col1: 'value3', col2: 'value4' }
];
```

### عرض الأسئلة الفرعية

```javascript
// الأسئلة الفرعية تظهر فقط عند تحقق شرط الإجابة الأب
const parentAnswer = "Yes"; // إجابة السؤال الأب
const childQuestion = {
  parent_question_id: 1,
  trigger_answer_value: "Yes"
};

// إذا كانت parentAnswer === trigger_answer_value، اعرض السؤال الفرعي
if (parentAnswer === childQuestion.trigger_answer_value) {
  // عرض السؤال الفرعي
}
```

---

## 📊 أمثلة الاستخدام

### مثال 1: إنشاء سؤال مركب

```javascript
const compositeQuestion = {
  code: "INFRA_001",
  text_en: "List your data centers",
  text_ar: "اذكر مراكز البيانات الخاصة بك",
  question_type: "Composite",
  composite_columns: [
    { key: "name", label_en: "Data Center Name", label_ar: "اسم مركز البيانات" },
    { key: "location", label_en: "Location", label_ar: "الموقع" },
    { key: "capacity", label_en: "Capacity", label_ar: "السعة" }
  ],
  category: "Infrastructure"
};
```

### مثال 2: إجابة سؤال مركب

```javascript
const answer = {
  institution_id: 1,
  question_id: 1,
  answer_value: [
    { name: "DC1", location: "Baghdad", capacity: "100TB" },
    { name: "DC2", location: "Basra", capacity: "50TB" }
  ]
};
```

### مثال 3: إنشاء snapshot

```javascript
// عند تقديم التقييم
await fetch(`/api/assessments/${assessmentId}/submit`, {
  method: 'POST'
});

// أو يدوياً
await fetch(`/api/assessments/${assessmentId}/snapshot`, {
  method: 'POST'
});
```

---

## ✅ المزايا الرئيسية

1. **نظام Versioning**: كل إجابة جديدة تعطل القديمة تلقائياً
2. **سجل كامل**: كل عملية مسجلة في AuditLog
3. **Snapshot**: إمكانية تجميد حالة التقييم
4. **مرونة**: دعم كل أنواع الأسئلة في جدول واحد
5. **نظافة**: لا يتم تعديل البيانات القديمة، فقط تعطيلها

---

## 🔍 استكشاف الأخطاء

### خطأ: "Question code already exists"
- تأكد من استخدام كود فريد لكل سؤال

### خطأ: "Cannot delete answers linked to assessment snapshot"
- لا يمكن حذف إجابات مرتبطة بـ snapshot
- استخدم تعطيل الإجابة بدلاً من الحذف

### خطأ: "Parent question not found"
- تأكد من وجود السؤال الأب قبل إنشاء السؤال الفرعي

---

## 📝 ملاحظات مهمة

1. النظام الجديد يعمل بالتوازي مع النظام القديم
2. يمكن استخدام `/api/questions-new` و `/api/answers` للوظائف الجديدة
3. النظام القديم (`/api/questions`, `/api/assessments`) لا يزال يعمل
4. يُنصح بالانتقال التدريجي إلى النظام الجديد

---

## 🎯 الخطوات التالية

1. ✅ إنشاء الجداول الجديدة
2. ✅ إنشاء API endpoints
3. ⏳ تحديث Frontend components
4. ⏳ نقل البيانات من النظام القديم (إن لزم)
5. ⏳ اختبار شامل

---

تم إنشاء هذا الدليل بتاريخ: 2026-01-26
