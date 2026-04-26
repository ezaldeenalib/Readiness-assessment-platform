# الترحيل الموحد - Unified Migration

## لماذا لم يكن هناك ملف ترحيل موحد واحد؟

خلال عملية تطوير التطبيق، تم إضافة التعديلات على مراحل متعددة، وكل مرحلة أنشأت ملف ترحيل منفصل:

| الملف | الغرض |
|-------|-------|
| `schema.sql` | الجداول الأساسية (users, entities, assessments) |
| `evaluation_engine_schema.sql` | محرك التقييم (questions, templates, question_answers) |
| `new_system_schema.sql` | نظام الأسئلة الجديد (Questions بـ composite_columns) |
| `migrate_safe.sql` | سجل التدقيق (auditlog) |
| `migrate_reference_architecture.sql` | قاموس المراجع |
| `migrate_master_categories.sql` | الفئات المركزية |
| `migrate_drop_code_column.sql` | حذف عمود code |
| `migrate_drop_old_category_columns.sql` | حذف أعمدة الفئات القديمة |
| `migrate_reference_category.sql` | ربط المراجع بالفئات |
| `update_question_tables.sql` | include_in_evaluation وحذف أعمدة من question_answers |
| `add_axis_weights.sql` | أوزان المحاور للقوالب |
| `add_question_type_values.sql` | أنواع الأسئلة الجديدة |
| `fix_questions_question_type_check.sql` | إصلاح قيد أنواع الأسئلة |
| `migrate_to_7_steps.js` | دعم 7 خطوات في assessment_data |

هذا أدى إلى:
- صعوبة معرفة الترتيب الصحيح للتشغيل
- احتمال نسيان تشغيل بعض الملفات
- عدم وضوح الحالة النهائية للقاعدة

## الحل: ملف الترحيل الموحد

تم إنشاء `migrate_unified.sql` الذي يجمع **جميع** عمليات الترحيل في ملف واحد، بالترتيب الصحيح.

### الاستخدام

```bash
# ترحيل تزايدي (للقاعدة الموجودة - يضيف التعديلات الناقصة فقط)
npm run db:migrate-unified

# ترحيل من الصفر (حذف كل الجداول وإعادة الإنشاء)
npm run db:migrate-unified -- --fresh
```

أو مباشرة:
```bash
node server/database/run_unified_migrate.js
node server/database/run_unified_migrate.js --fresh
```

### ما يتضمنه الترحيل الموحد

1. **الجداول الأساسية**: users, entities, assessments, assessment_data (7 خطوات)
2. **محرك التقييم**: static_data_fields, static_data_values, questions, templates, template_questions, template_assessments, question_answers
3. **سجل التدقيق**: auditlog
4. **قاموس المراجع**: reference_dictionary, assessment_reference_values, assessment_reference_attributes
5. **الفئات المركزية**: master_categories مع الربط بـ questions, templates, template_questions, reference_dictionary
6. **جميع التعديلات**: include_in_evaluation, axis_weights, composite_columns, أنواع الأسئلة (Manual, YesNo, MultiChoice, MultiSelect, StaticData, Composite, StaticDataLinked, ParentChild)، وحذف الأعمدة القديمة

### ملاحظات

- الترحيل **آمن للتشغيل المتكرر** (idempotent) - يستخدم `IF NOT EXISTS` و `DO $$ ... EXCEPTION`
- الوضع `--fresh` يحذف جميع الجداول والأنواع قبل إعادة الإنشاء
- كلمات المرور الافتراضية تُستبدل تلقائياً عند التشغيل
