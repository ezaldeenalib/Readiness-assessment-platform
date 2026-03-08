# خاصية إدخال التقييمات يدوياً للأسئلة
# Manual Evaluation Entry Feature

## 📋 نظرة عامة / Overview

تمت إضافة خاصية تسمح بإدخال التقييمات (الدرجات والملاحظات) يدوياً للأسئلة الخاصة بالقالب بعد إضافتها إلى جدول قاعدة البيانات.

A feature has been added that allows manual entry of evaluations (scores and notes) for template-specific questions after they've been added to the database table.

---

## 🎯 الميزات المضافة / Added Features

### 1. API Endpoints (Backend)

#### أ) الحصول على تقييم سؤال محدد
**GET** `/api/template-assessments/:assessmentId/questions/:questionId/evaluation`

**Response:**
```json
{
  "success": true,
  "evaluation": {
    "question_id": 1,
    "question_code": "Q001",
    "question_text_en": "Question text",
    "question_text_ar": "نص السؤال",
    "question_type": "YesNo",
    "answer_value": "Yes",
    "score_achieved": 10,
    "max_possible_score": 10,
    "evaluation_passed": true,
    "evaluation_notes": "Evaluation notes",
    "answered_by": 1,
    "answered_by_name": "User Name",
    "answered_at": "2026-02-02T10:00:00Z",
    "percentage_score": 100
  }
}
```

#### ب) تحديث تقييم سؤال واحد
**PUT** `/api/template-assessments/:assessmentId/questions/:questionId/evaluation`

**Request Body:**
```json
{
  "score_achieved": 8,
  "evaluation_passed": true,
  "evaluation_notes": "تم التقييم يدوياً - يحتاج تحسين"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Evaluation updated successfully",
  "evaluation": {
    "question_id": 1,
    "score_achieved": 8,
    "max_possible_score": 10,
    "evaluation_passed": true,
    "evaluation_notes": "تم التقييم يدوياً - يحتاج تحسين"
  },
  "updated_scoring": {
    "total_achieved": 85,
    "total_possible": 100,
    "percentage": 85,
    "risk_level": "Low"
  }
}
```

#### ج) تحديث تقييمات متعددة دفعة واحدة
**PUT** `/api/template-assessments/:assessmentId/evaluations`

**Request Body:**
```json
{
  "evaluations": [
    {
      "question_id": 1,
      "score_achieved": 8,
      "evaluation_passed": true,
      "evaluation_notes": "ملاحظات السؤال الأول"
    },
    {
      "question_id": 2,
      "score_achieved": 5,
      "evaluation_passed": false,
      "evaluation_notes": "ملاحظات السؤال الثاني"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Updated 2 evaluation(s) successfully",
  "evaluations": [
    {
      "question_id": 1,
      "score_achieved": 8,
      "max_possible_score": 10,
      "evaluation_passed": true,
      "evaluation_notes": "ملاحظات السؤال الأول"
    },
    {
      "question_id": 2,
      "score_achieved": 5,
      "max_possible_score": 10,
      "evaluation_passed": false,
      "evaluation_notes": "ملاحظات السؤال الثاني"
    }
  ],
  "updated_scoring": {
    "total_achieved": 85,
    "total_possible": 100,
    "percentage": 85,
    "risk_level": "Low"
  }
}
```

---

### 2. Frontend Services

تمت إضافة دوال خدمة في `src/services/index.js`:

```javascript
import { templateAssessmentService } from './services';

// الحصول على تقييم سؤال
const evaluation = await templateAssessmentService.getQuestionEvaluation(assessmentId, questionId);

// تحديث تقييم سؤال واحد
await templateAssessmentService.updateQuestionEvaluation(assessmentId, questionId, {
  score_achieved: 8,
  evaluation_passed: true,
  evaluation_notes: "ملاحظات"
});

// تحديث تقييمات متعددة
await templateAssessmentService.updateEvaluations(assessmentId, [
  { question_id: 1, score_achieved: 8, evaluation_passed: true },
  { question_id: 2, score_achieved: 5, evaluation_passed: false }
]);
```

---

## 🔐 الصلاحيات / Permissions

- **Super Admin**: يمكن تعديل أي تقييم
- **Ministry Admin**: يمكن تعديل تقييمات المؤسسات التابعة
- **Entity User**: يمكن تعديل تقييمات مؤسسته فقط

---

## ✅ التحقق من الصحة / Validation

- يتم التحقق من أن `score_achieved` بين 0 و `max_possible_score`
- يتم إعادة حساب الدرجة الإجمالية تلقائياً بعد كل تحديث
- يتم تحديث `risk_level` بناءً على النسبة المئوية الجديدة

---

## 📊 إعادة حساب الدرجات / Score Recalculation

بعد تحديث أي تقييم:

1. يتم إعادة حساب `total_achieved_score` من جميع الإجابات
2. يتم حساب `percentage_score` (النسبة المئوية)
3. يتم تحديث `risk_level` بناءً على النسبة:
   - **Low**: ≥ 80%
   - **Medium**: 60-79%
   - **High**: 40-59%
   - **Critical**: < 40%

---

## 📝 Audit Log

جميع عمليات تحديث التقييمات يتم تسجيلها في `AuditLog` مع:
- القيمة القديمة
- القيمة الجديدة
- المستخدم الذي قام بالتعديل
- وقت التعديل

---

## 🚀 أمثلة الاستخدام / Usage Examples

### مثال 1: تحديث تقييم سؤال واحد

```javascript
// في React component
const handleUpdateEvaluation = async (questionId, score, notes) => {
  try {
    const result = await templateAssessmentService.updateQuestionEvaluation(
      assessmentId,
      questionId,
      {
        score_achieved: score,
        evaluation_passed: score > 0,
        evaluation_notes: notes
      }
    );
    
    console.log('Updated scoring:', result.updated_scoring);
    // إعادة تحميل البيانات
    await fetchAssessment();
  } catch (error) {
    console.error('Error updating evaluation:', error);
  }
};
```

### مثال 2: تحديث تقييمات متعددة دفعة واحدة

```javascript
const handleBatchUpdate = async (evaluations) => {
  try {
    const result = await templateAssessmentService.updateEvaluations(
      assessmentId,
      evaluations.map(eval => ({
        question_id: eval.questionId,
        score_achieved: eval.score,
        evaluation_passed: eval.passed,
        evaluation_notes: eval.notes
      }))
    );
    
    console.log(`Updated ${result.evaluations.length} evaluations`);
    console.log('New total score:', result.updated_scoring);
  } catch (error) {
    console.error('Error updating evaluations:', error);
  }
};
```

---

## 📁 الملفات المعدلة / Modified Files

1. **Backend:**
   - `server/routes/templateAssessments.js` - إضافة 3 endpoints جديدة

2. **Frontend:**
   - `src/services/index.js` - إضافة `templateAssessmentService`

---

## 🔄 الخطوات التالية (اختياري) / Next Steps (Optional)

1. إضافة واجهة مستخدم (UI) لإدخال التقييمات يدوياً
2. إضافة إمكانية تصدير التقييمات
3. إضافة تقارير مفصلة عن التقييمات

---

**تاريخ الإضافة:** 2026-02-02  
**الحالة:** ✅ جاهز للاستخدام
