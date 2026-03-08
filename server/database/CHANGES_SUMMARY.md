# ملخص التعديلات - Migration جديد
## Summary of Changes - New Migration

**التاريخ / Date:** 2026-02-01  
**الحالة / Status:** ✅ جاهز للتطبيق / Ready to Apply

---

## 📋 التعديلات المنفذة / Changes Implemented

### 1. حذف Migration السابق (السابقة)

تم حذف الـ migration الأخير من النظام:
- ❌ حُذف: `add_multiselect_type.sql`
- ❌ حُذف: `run_add_multiselect.js`
- ✅ تم تحديث: `run_migrate.js` (إزالة مرجع الـ migration)
- ✅ تم تحديث: `package.json` (إزالة script `db:fix-question-type`)

---

### 2. Migration جديد - تحديث الجداول

#### أ) حذف حقول من جدول `question_answers`

الحقول المحذوفة:
- ❌ `linked_static_data_value` (TEXT)
- ❌ `linked_static_data_field` (VARCHAR)
- ❌ `inherited_from_template_assessment_id` (INTEGER)
- ❌ `linked_static_data_snapshot` (JSONB)

**السبب:** هذه الحقول لم تعد مطلوبة في النظام الجديد

#### ب) إضافة حقل إلى جدول `template_questions`

الحقل الجديد:
- ✅ `include_in_evaluation` (BOOLEAN, DEFAULT true, NOT NULL)
  - **المعنى:** هل يدخل السؤال في حساب درجة التقييم؟
  - **القيم:** 
    - `true` = يدخل في التقييم (افتراضي)
    - `false` = لا يدخل في التقييم (سؤال للعرض فقط)

---

## 📁 الملفات الجديدة / New Files Created

### Migration Files
1. ✅ `server/database/update_question_tables.sql`
   - SQL migration لتنفيذ التعديلات على قاعدة البيانات

2. ✅ `server/database/run_update_question_tables.js`
   - JavaScript runner لتشغيل الـ migration

3. ✅ `server/database/UPDATE_TABLES_MIGRATION.md`
   - توثيق شامل للـ migration وطريقة الاستخدام

4. ✅ `server/database/CHANGES_SUMMARY.md`
   - هذا الملف - ملخص جميع التعديلات

### Updated Files
5. ✅ `package.json`
   - إضافة script جديد: `db:update-tables`
   - حذف script قديم: `db:fix-question-type`

6. ✅ `server/routes/templates.js`
   - تحديث لدعم الحقل الجديد `include_in_evaluation` في جميع العمليات:
     - إنشاء قالب جديد (POST `/api/templates`)
     - تحديث قالب (PUT `/api/templates/:id`)
     - نسخ قالب (POST `/api/templates/:id/duplicate`)
     - عرض أسئلة القالب (GET `/api/templates/:id`)

---

## 🚀 طريقة التطبيق / How to Apply

### الخطوة 1: عمل Backup لقاعدة البيانات ⚠️

```bash
# PostgreSQL backup
pg_dump -U your_user -d your_database > backup_before_migration_$(date +%Y%m%d).sql
```

### الخطوة 2: تطبيق الـ Migration

#### الطريقة الموصى بها (npm script):

```bash
npm run db:update-tables
```

#### طريقة بديلة (Node مباشر):

```bash
node server/database/run_update_question_tables.js
```

#### طريقة يدوية (SQL فقط):

```bash
psql -U your_user -d your_database -f server/database/update_question_tables.sql
```

### الخطوة 3: التحقق من نجاح التطبيق

```sql
-- التحقق من حذف الأعمدة من question_answers
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'question_answers'
ORDER BY ordinal_position;
-- يجب ألا تجد الحقول المحذوفة

-- التحقق من إضافة العمود الجديد
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'template_questions' 
  AND column_name = 'include_in_evaluation';
-- يجب أن تجد: include_in_evaluation | boolean | true | NO
```

---

## 💡 استخدام الحقل الجديد / Using the New Field

### في API Requests

#### إنشاء قالب مع أسئلة:

```json
POST /api/templates
{
  "name": "Security Assessment",
  "name_ar": "تقييم الأمن السيبراني",
  "questions": [
    {
      "question_id": 1,
      "display_order": 1,
      "include_in_evaluation": true  // يدخل في التقييم
    },
    {
      "question_id": 2,
      "display_order": 2,
      "include_in_evaluation": false  // لا يدخل (عرض فقط)
    }
  ]
}
```

#### تحديث قالب:

```json
PUT /api/templates/5
{
  "questions": [
    {
      "question_id": 10,
      "display_order": 1,
      "include_in_evaluation": true
    }
  ]
}
```

### في حساب الدرجات

عند حساب درجة التقييم، يجب تضمين فقط الأسئلة التي `include_in_evaluation = true`:

```sql
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
JOIN Questions q ON qa.question_id = q.id
WHERE qa.template_assessment_id = $1
  AND tq.include_in_evaluation = true;
```

---

## 🎯 حالات الاستخدام / Use Cases

### أسئلة لا تدخل في التقييم (include_in_evaluation = false)

مناسبة للأسئلة التالية:
- ✅ معلومات عامة (اسم المؤسسة، العنوان، إلخ)
- ✅ أسئلة مرجعية (للعرض أو السياق فقط)
- ✅ تعليمات أو ملاحظات توضيحية
- ✅ أسئلة لجمع البيانات فقط (لا تؤثر على الدرجة)

**مثال:**
```json
{
  "question_text": "ما هو اسم المؤسسة؟",
  "include_in_evaluation": false  // معلومات فقط
}
```

### أسئلة تدخل في التقييم (include_in_evaluation = true)

مناسبة للأسئلة التالية:
- ✅ أسئلة تقنية تقيس مستوى النضج
- ✅ أسئلة أمنية تؤثر على مستوى المخاطر
- ✅ أسئلة تساهم في حساب الدرجة النهائية

**مثال:**
```json
{
  "question_text": "هل يوجد جدار حماية نشط؟",
  "include_in_evaluation": true  // يدخل في التقييم
}
```

---

## 📊 ملخص npm Scripts المتاحة

```json
{
  "db:migrate": "تطبيق الـ migrations الأساسية (migrate_safe.sql)",
  "db:update-tables": "تطبيق الـ migration الجديد (تحديث الجداول)"
}
```

### الاستخدام:

```bash
# تطبيق الـ migrations الأساسية أولاً (إذا لم تكن مطبقة)
npm run db:migrate

# ثم تطبيق الـ migration الجديد
npm run db:update-tables
```

---

## ⚠️ ملاحظات مهمة / Important Notes

1. **Backup أولاً:** تأكد من عمل backup لقاعدة البيانات قبل تطبيق الـ migration

2. **الأعمدة المحذوفة:** بمجرد حذف الأعمدة، لن تتمكن من استرجاع البيانات منها إلا من الـ backup

3. **القيمة الافتراضية:** جميع السجلات الموجودة حالياً في `template_questions` ستُعيّن `include_in_evaluation = true` تلقائياً

4. **التوافق مع الكود القديم:** الكود القديم الذي لا يمرر `include_in_evaluation` سيستخدم القيمة الافتراضية `true`

5. **API Compatibility:** جميع API endpoints في `templates.js` تم تحديثها لدعم الحقل الجديد

---

## 📚 المراجع / References

- **Migration SQL:** `server/database/update_question_tables.sql`
- **Migration Runner:** `server/database/run_update_question_tables.js`
- **التوثيق الكامل:** `server/database/UPDATE_TABLES_MIGRATION.md`
- **API Routes:** `server/routes/templates.js`

---

## ✅ Checklist

- [x] حذف Migration السابق (`add_multiselect_type.sql`)
- [x] إنشاء SQL migration جديد
- [x] إنشاء JavaScript runner للـ migration
- [x] تحديث `package.json` بـ npm script جديد
- [x] تحديث `server/routes/templates.js` لدعم الحقل الجديد
- [x] كتابة توثيق شامل
- [x] كتابة ملخص التعديلات (هذا الملف)
- [ ] تطبيق الـ migration على قاعدة البيانات
- [ ] تحديث Frontend components (إن لزم)
- [ ] تحديث منطق حساب الدرجات
- [ ] اختبار شامل

---

**تم الإنجاز بتاريخ:** 2026-02-01  
**الحالة:** ✅ جاهز للتطبيق والاختبار
