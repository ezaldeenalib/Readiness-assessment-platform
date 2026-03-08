# خاصية التحكم في دخول الأسئلة في التقييم
# Include in Evaluation Feature

## 📋 نظرة عامة / Overview

تمت إضافة خاصية تسمح بالتحكم في ما إذا كان السؤال سيدخل في حساب التقييم النهائي أم لا عند إضافة الأسئلة إلى القالب. هذا مفيد للأسئلة الإعلامية التي لا يجب أن تُحسب في النتيجة النهائية.

A feature has been added that allows controlling whether a question will be included in the final evaluation score calculation when adding questions to a template. This is useful for informational questions that should not be counted in the final score.

---

## 🎯 الميزات / Features

### 1. واجهة المستخدم (Frontend)

عند إضافة أو تعديل أسئلة في القالب (`TemplateBuilder`):

- ✅ **Checkbox للتحكم**: يمكن تفعيل/إلغاء تفعيل "يدخل في التقييم" لكل سؤال
- ✅ **القيمة الافتراضية**: `true` (يدخل في التقييم)
- ✅ **مؤشرات بصرية**: 
  - يظهر عدد الأسئلة التي تدخل في التقييم
  - يظهر عدد الأسئلة التي لا تدخل في التقييم
  - يتم حساب الوزن الإجمالي بناءً على الأسئلة التي تدخل في التقييم فقط

### 2. Backend API

- ✅ **دعم الحقل**: API يدعم `include_in_evaluation` عند إنشاء/تحديث القالب
- ✅ **حساب الدرجات**: يتم حساب الدرجات بناءً على الأسئلة التي `include_in_evaluation = true` فقط
- ✅ **التوافق**: القيمة الافتراضية `true` للحفاظ على التوافق مع البيانات القديمة

---

## 🔧 التطبيق / Implementation

### Frontend (`src/pages/TemplateBuilder.jsx`)

#### عند إضافة سؤال جديد:
```javascript
{
  ...question,
  include_in_evaluation: true // Default to true
}
```

#### عند تحميل قالب موجود:
```javascript
include_in_evaluation: q.include_in_evaluation !== undefined ? q.include_in_evaluation : true
```

#### عند حفظ القالب:
```javascript
questions: selectedQuestions.map((q, index) => ({
  question_id: q.id,
  display_order: index,
  override_weight: q.override_weight || null,
  section_name: q.section_name || null,
  section_name_ar: q.section_name_ar || null,
  is_required: true,
  include_in_evaluation: q.include_in_evaluation !== undefined ? q.include_in_evaluation : true
}))
```

#### حساب الوزن الإجمالي:
```javascript
const calculateTotalWeight = () => {
  return selectedQuestions.reduce((sum, q) => {
    // احتساب الوزن فقط للأسئلة التي تدخل في التقييم
    if (q.include_in_evaluation === false) {
      return sum;
    }
    const weight = q.override_weight || q.weight || 0;
    return sum + parseFloat(weight);
  }, 0);
};
```

### Backend (`server/routes/templateAssessments.js`)

#### حساب الدرجات (3 أماكن محدثة):

```sql
SELECT 
  SUM(CASE WHEN tq.include_in_evaluation = true THEN qa.score_achieved ELSE 0 END) as total_achieved,
  SUM(CASE WHEN tq.include_in_evaluation = true THEN qa.max_possible_score ELSE 0 END) as total_possible
FROM question_answers qa
JOIN template_questions tq ON qa.question_id = tq.question_id AND tq.template_id = $2
WHERE qa.template_assessment_id = $1
```

#### حساب الوزن الإجمالي عند إنشاء التقييم:

```javascript
// Get include_in_evaluation from template_questions
const questionsWithEvaluationFlag = await client.query(`
  SELECT q.id, tq.include_in_evaluation, COALESCE(tq.override_weight, q.weight) as effective_weight
  FROM template_questions tq
  JOIN Questions q ON tq.question_id = q.id
  WHERE tq.template_id = $1 AND q.is_active = true
`, [template_id]);

const totalPossibleScore = questions.reduce((sum, q) => {
  const includeInEval = evaluationMap.get(q.id) !== false;
  if (!includeInEval) return sum;
  return sum + parseFloat(q.weight || 0);
}, 0);
```

---

## 📊 مثال الاستخدام / Usage Example

### سيناريو 1: سؤال إعلامي

**السؤال**: "ما هو عدد الموظفين؟"
- **الوزن**: 0 نقطة
- **يدخل في التقييم**: ❌ لا
- **السبب**: سؤال إعلامي فقط، لا يؤثر على النتيجة

### سيناريو 2: سؤال تقييمي

**السؤال**: "هل لديك جدار ناري؟"
- **الوزن**: 10 نقاط
- **يدخل في التقييم**: ✅ نعم
- **السبب**: يؤثر على النتيجة النهائية

---

## 🎨 واجهة المستخدم / UI

### في صفحة Template Builder:

```
┌─────────────────────────────────────────────────┐
│ السؤال: هل لديك جدار ناري؟                    │
│                                                 │
│ [✓] يدخل في التقييم / Include in Evaluation   │
│     ✓ سيتم احتساب هذا السؤال في النتيجة النهائية │
└─────────────────────────────────────────────────┘
```

### عند إلغاء التفعيل:

```
┌─────────────────────────────────────────────────┐
│ السؤال: ما هو عدد الموظفين؟                    │
│                                                 │
│ [ ] يدخل في التقييم / Include in Evaluation   │
│     (لن يُحسب في النتيجة النهائية)              │
│     ⚠ هذا السؤال لن يُحسب في النتيجة النهائية  │
└─────────────────────────────────────────────────┘
```

### ملخص الأسئلة:

```
الأسئلة (15)
إجمالي الوزن: 100.0 نقطة
يدخل في التقييم: 12 سؤال | لا يدخل: 3 سؤال
```

---

## ✅ التحقق من الصحة / Validation

- ✅ القيمة الافتراضية: `true` (يدخل في التقييم)
- ✅ عند إلغاء التفعيل: السؤال لا يُحسب في النتيجة النهائية
- ✅ عند التفعيل: السؤال يُحسب في النتيجة النهائية
- ✅ التوافق مع البيانات القديمة: جميع الأسئلة الموجودة تعتبر `include_in_evaluation = true`

---

## 🔄 التأثير على حساب الدرجات / Score Calculation Impact

### قبل التحديث:
```
الدرجة الإجمالية = مجموع جميع الأسئلة
```

### بعد التحديث:
```
الدرجة الإجمالية = مجموع الأسئلة التي include_in_evaluation = true فقط
```

### مثال:
- **إجمالي الأسئلة**: 15 سؤال
- **الأسئلة التي تدخل في التقييم**: 12 سؤال (100 نقطة)
- **الأسئلة التي لا تدخل**: 3 أسئلة (0 نقطة)
- **النتيجة النهائية**: تُحسب بناءً على 12 سؤال فقط (100 نقطة)

---

## 📁 الملفات المعدلة / Modified Files

1. **Frontend:**
   - `src/pages/TemplateBuilder.jsx` - إضافة checkbox ووظائف الحساب

2. **Backend:**
   - `server/routes/templateAssessments.js` - تحديث حساب الدرجات (3 أماكن)
   - `server/routes/templates.js` - يدعم بالفعل `include_in_evaluation`

---

## 🚀 الخطوات التالية (اختياري) / Next Steps (Optional)

1. ✅ إضافة واجهة مستخدم للتحكم في `include_in_evaluation`
2. ✅ تحديث حساب الدرجات لمراعاة `include_in_evaluation`
3. ⏭️ إضافة تقارير توضح الأسئلة التي لا تدخل في التقييم
4. ⏭️ إضافة إحصائيات عن الأسئلة الإعلامية مقابل التقييمية

---

## 📝 ملاحظات مهمة / Important Notes

1. **التوافق مع البيانات القديمة**: جميع الأسئلة الموجودة في `template_questions` تعتبر `include_in_evaluation = true` تلقائياً

2. **القيمة الافتراضية**: عند إضافة سؤال جديد، القيمة الافتراضية هي `true`

3. **حساب الدرجات**: يتم حساب الدرجات بناءً على الأسئلة التي `include_in_evaluation = true` فقط

4. **الأسئلة الإعلامية**: يمكن استخدام هذه الميزة للأسئلة الإعلامية التي لا يجب أن تؤثر على النتيجة النهائية

---

**تاريخ الإضافة:** 2026-02-02  
**الحالة:** ✅ جاهز للاستخدام
