# إحصائية كاملة لقاعدة البيانات - Full Database Inventory

## ملخص تنفيذي

| البند | العدد |
|-------|-------|
| **إجمالي الجداول** | 21 |
| **إجمالي ملفات الترحيل** | 20+ |
| **الأنواع (ENUMs)** | 5 |
| **الـ Views** | 5 |
| **الجداول المضافة في الترحيل الموحد** | 21 |

---

## 1. قائمة الجداول الكاملة

### 1.1 الجداول الأساسية (من schema.sql)

| الجدول | الوصف | الأعمدة الرئيسية |
|--------|-------|------------------|
| `users` | المستخدمون | id, email, password_hash, full_name, role, entity_id, is_active |
| `entities` | الجهات/المؤسسات (هيكل أب-ابن) | id, name, name_ar, activity_type, parent_entity_id |
| `assessments` | التقييمات الرئيسية | id, entity_id, created_by, status, year, quarter |
| `assessment_data` | بيانات خطوات التقييم (1-7) | id, assessment_id, step_number, data (JSONB) |

### 1.2 محرك التقييم (من evaluation_engine_schema.sql)

| الجدول | الوصف | الأعمدة الرئيسية |
|--------|-------|------------------|
| `static_data_fields` | تعريف حقول البيانات الثابتة | id, field_key, field_name, field_name_ar, field_type |
| `static_data_values` | قيم البيانات الثابتة (نسخية) | id, institution_id, field_key, field_value, is_active |
| `questions` | بنك الأسئلة | id, question_text, question_text_ar, question_type, options, composite_columns |
| `templates` | قوالب التقييم | id, name, name_ar, axis_weights, category_id |
| `template_questions` | ربط الأسئلة بالقوالب | id, template_id, question_id, display_order, include_in_evaluation |
| `template_assessments` | ربط التقييمات بالقوالب | id, assessment_id, template_id, total_achieved_score |
| `question_answers` | إجابات أسئلة التقييم | id, template_assessment_id, question_id, answer_value, score_achieved |

### 1.3 سجل التدقيق والمراجع

| الجدول | الوصف | المصدر |
|--------|-------|--------|
| `auditlog` | سجل العمليات (INSERT/UPDATE/DELETE) | migrate_safe.sql |
| `reference_dictionary` | قاموس المراجع (أنواع الأصول، الموزعين...) | migrate_reference_architecture.sql |
| `assessment_reference_values` | قيم المراجع في الإجابات | migrate_reference_architecture.sql |
| `assessment_reference_attributes` | سمات المراجع (vendor, model) | migrate_reference_architecture.sql |

### 1.4 الفئات والصلاحيات

| الجدول | الوصف | المصدر |
|--------|-------|--------|
| `master_categories` | الفئات المركزية | migrate_master_categories.sql |
| `permissions` | صلاحيات النظام | **جديد - الترحيل الموحد** |
| `roles` | الأدوار | **جديد - الترحيل الموحد** |
| `role_permissions` | ربط الأدوار بالصلاحيات | **جديد - الترحيل الموحد** |
| `user_roles` | تعيين الأدوار للمستخدمين | **جديد - الترحيل الموحد** |
| `user_institutions` | تعيين المؤسسات للمستخدمين | **جديد - الترحيل الموحد** |

### 1.5 جداول نظام قديم (قد لا تكون مستخدمة)

| الجدول | الوصف | الملاحظات |
|--------|-------|------------|
| `Questions` (بحرف كبير) | نظام الأسئلة القديم | new_system_schema - text_en, text_ar |
| `Answers` | إجابات المؤسسات | يُستخدم في /api/answers |

---

## 2. التعديلات على قاعدة البيانات (حسب الملف)

| الملف | التعديل |
|-------|---------|
| **schema.sql** | إنشاء users, entities, assessments, assessment_data |
| **evaluation_engine_schema.sql** | static_data_*, questions, templates, template_*, question_answers |
| **migrate_safe.sql** | auditlog + عمود inherited_from_template_assessment_id (تم حذفه لاحقاً) |
| **add_question_type_values.sql** | إضافة MultiSelect, StaticData, Composite لـ question_type |
| **add_axis_weights.sql** | axis_weights في templates، توسيع override_weight |
| **migrate_reference_architecture.sql** | reference_dictionary, assessment_reference_* |
| **migrate_master_categories.sql** | master_categories + category_id, section_id |
| **migrate_drop_old_category_columns.sql** | حذف category, section_name من الجداول |
| **migrate_reference_category.sql** | category_id في reference_dictionary |
| **migrate_drop_code_column.sql** | حذف عمود code من questions, reference_dictionary, master_categories |
| **update_question_tables.sql** | حذف أعمدة من question_answers، إضافة include_in_evaluation |
| **fix_questions_question_type_check.sql** | إصلاح CHECK لـ question_type |
| **migrate_to_7_steps.js** | assessment_data: step_number 1-7 |
| **migrate_unified.sql** | **جميع التعديلات أعلاه + جداول RBAC** |

---

## 3. الأنواع (ENUMs)

| النوع | القيم |
|-------|-------|
| `entity_activity_type` | government, mixed, private |
| `user_role` | super_admin, ministry_admin, entity_user |
| `assessment_status` | draft, submitted, approved, rejected |
| `question_type` (قديم) | StaticDataLinked, Manual, MultiChoice, YesNo, ParentChild, MultiSelect, StaticData, Composite |
| `evaluation_rule` | greater_than, less_than, equals, not_equals, contains, exists, greater_or_equal, less_or_equal, in_range |

---

## 4. الـ Views

| View | الوصف |
|------|-------|
| `assessment_summary` | ملخص التقييمات مع الجهة والمستخدم |
| `entity_hierarchy` | شجرة الجهات (أب-ابن) |
| `current_static_data` | البيانات الثابتة النشطة الحالية |
| `template_summary` | ملخص القوالب مع عدد الأسئلة |
| `assessment_with_template` | التقييم مع معلومات القالب |

---

## 5. الصلاحيات (19 صلاحية)

| المجموعة | الصلاحيات |
|----------|-----------|
| **بنك الأسئلة** | view_questions, create_question, edit_question, delete_question |
| **القوالب** | view_templates, create_template, edit_template, delete_template |
| **التقييمات** | view_assessments, fill_assessment, submit_assessment, evaluate_assessment |
| **التقارير** | view_reports, export_reports |
| **الإدارة** | manage_users, view_entities, manage_entities, manage_categories, manage_references |

---

## 6. الأدوار الافتراضية (7 أدوار)

| الدور | الوصف |
|-------|-------|
| super_admin | مدير النظام - صلاحيات كاملة |
| ministry_admin | مدير الوزارة |
| entity_user | مستخدم الجهة |
| QuestionManager | مدير الأسئلة |
| Evaluator | مقيّم |
| InstitutionUser | مستخدم مؤسسة |
| Viewer | عارض |

---

## 7. مخطط العلاقات (مبسط)

```
users ←→ entities (entity_id)
users ←→ user_roles ←→ roles
users ←→ user_institutions ←→ entities
roles ←→ role_permissions ←→ permissions

entities ← assessments ← assessment_data
assessments ← template_assessments ← templates
templates ← template_questions ← questions
template_assessments ← question_answers ← questions

questions ← assessment_reference_values ← reference_dictionary
question_answers ← assessment_reference_attributes

master_categories ← questions, templates, template_questions, reference_dictionary
static_data_fields ← static_data_values
entities ← static_data_values
```

---

## 8. الاستخدام

```bash
# ترحيل تزايدي (للقاعدة الموجودة)
npm run db:migrate-unified

# ترحيل من الصفر (حذف وإعادة إنشاء)
npm run db:migrate-unified -- --fresh
```

---

*آخر تحديث: مارس 2025*
