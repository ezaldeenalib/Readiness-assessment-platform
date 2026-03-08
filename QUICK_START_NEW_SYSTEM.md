# 🚀 دليل البدء السريع - النظام الجديد
# Quick Start Guide - New System

## خطوات التشغيل السريعة

### 1️⃣ تشغيل Migration

```bash
cd server/database
node migrate_new_system.js
```

**النتيجة المتوقعة:**
```
🚀 بدء Migration للنظام الجديد...
📊 إنشاء الجداول الجديدة...
✅ تم إنشاء الجداول بنجاح!
```

### 2️⃣ التحقق من النجاح

```sql
-- في PostgreSQL
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('Questions', 'Answers', 'AuditLog');
```

يجب أن ترى 3 جداول.

### 3️⃣ اختبار API

#### إنشاء سؤال جديد:
```bash
curl -X POST http://localhost:3000/api/questions-new \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "code": "TEST_001",
    "text_en": "Test Question?",
    "text_ar": "سؤال تجريبي؟",
    "question_type": "YesNo",
    "category": "Test"
  }'
```

#### إضافة إجابة:
```bash
curl -X POST http://localhost:3000/api/answers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "institution_id": 1,
    "question_id": 1,
    "answer_value": "Yes"
  }'
```

#### الحصول على الإجابات:
```bash
curl http://localhost:3000/api/answers/institution/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📋 أمثلة الاستخدام

### مثال 1: سؤال مركب (Composite)

```javascript
// إنشاء سؤال مركب
const question = {
  code: "INFRA_DC",
  text_en: "List your data centers",
  text_ar: "اذكر مراكز البيانات",
  question_type: "Composite",
  composite_columns: [
    { key: "name", label_en: "Name", label_ar: "الاسم" },
    { key: "location", label_en: "Location", label_ar: "الموقع" }
  ]
};

// إجابة سؤال مركب
const answer = {
  institution_id: 1,
  question_id: 1,
  answer_value: [
    { name: "DC1", location: "Baghdad" },
    { name: "DC2", location: "Basra" }
  ]
};
```

### مثال 2: سؤال فرعي (Parent/Child)

```javascript
// إنشاء سؤال أب
const parentQuestion = {
  code: "HAS_DC",
  text_en: "Do you have data centers?",
  text_ar: "هل لديك مراكز بيانات؟",
  question_type: "YesNo"
};

// إنشاء سؤال فرعي
const childQuestion = {
  code: "DC_COUNT",
  text_en: "How many data centers?",
  text_ar: "كم عدد مراكز البيانات؟",
  question_type: "Manual",
  parent_question_id: 1,
  trigger_answer_value: "Yes"
};
```

### مثال 3: إنشاء Snapshot

```javascript
// عند تقديم التقييم، يتم إنشاء snapshot تلقائياً
await fetch('/api/assessments/1/submit', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

// أو يدوياً
await fetch('/api/assessments/1/snapshot', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## 🔍 استكشاف الأخطاء

### خطأ: "relation does not exist"
**الحل:** تأكد من تشغيل migration أولاً

### خطأ: "duplicate key value violates unique constraint"
**الحل:** استخدم كود سؤال فريد

### خطأ: "foreign key constraint"
**الحل:** تأكد من وجود السؤال/المؤسسة قبل الإجابة

---

## 📚 المزيد من المعلومات

- دليل كامل: `docs/NEW_SYSTEM_GUIDE.md`
- ملخص التحديث: `MIGRATION_SUMMARY.md`

---

**جاهز للاستخدام! ✅**
