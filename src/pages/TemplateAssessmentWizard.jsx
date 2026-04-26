import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';
import { useNavigate, useParams } from 'react-router-dom';
import QuestionRenderer from '../components/questions/QuestionRenderer';

/**
 * استخراج قيم قابلة للمقارنة مع trigger_answer_value من إجابة السؤال الأب.
 * في MultiChoice/MultiSelect قد تُخزَّن الإجابة كمفتاح الخيار (مثلاً "0" أو "opt1") وليس النص "طرف ثالث".
 */
function getDisplayValuesForTrigger(parentQuestion, answer) {
  const values = new Set();
  if (answer === undefined || answer === null) return [];
  const add = (v) => { if (v != null && String(v).trim() !== '') values.add(String(v).trim().toLowerCase()); };

  if (typeof answer === 'string') {
    add(answer);
    if (answer.trim().startsWith('{') || answer.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(answer);
        getDisplayValuesForTrigger(parentQuestion, parsed).forEach(add);
      } catch { /* ignore */ }
    }
  } else if (Array.isArray(answer)) {
    answer.forEach(v => add(v));
  } else if (typeof answer === 'object' && answer !== null) {
    if (Array.isArray(answer.selected)) {
      answer.selected.forEach(v => add(v));
    }
    Object.keys(answer).forEach(k => add(k));
  } else {
    add(answer);
  }

  const opts = parentQuestion?.options;
  if (opts && typeof opts === 'object' && !Array.isArray(opts)) {
    const skipKeys = ['__other_options', '__otherOptionKey'];
    const entries = Object.entries(opts).filter(([k]) => !skipKeys.includes(k));
    entries.forEach(([key, val]) => {
      const label = (val && typeof val === 'object' && (val.name ?? val.label)) != null
        ? (val.name ?? val.label)
        : (typeof val === 'string' ? val : (/^\d+$/.test(key) ? null : key));
      if (label) add(label);
    });
    const selectedKey = typeof answer === 'string' ? answer : (answer?.selected);
    if (selectedKey != null && selectedKey !== '') {
      const keyStr = String(selectedKey);
      const entry = entries.find(([k]) => String(k) === keyStr);
      if (entry) {
        const [, val] = entry;
        const label = (val && typeof val === 'object' && (val.name ?? val.label)) != null
          ? (val.name ?? val.label)
          : (typeof val === 'string' ? val : (/^\d+$/.test(keyStr) ? null : keyStr));
        if (label) add(label);
      }
      add(keyStr);
    }
  }

  return Array.from(values);
}

// ─── منطق إظهار السؤال الفرعي حسب الإجابة المستهدفة ───
function shouldShowChild(currentParentAnswer, childQuestion, parentQuestion = null) {
  if (!childQuestion.trigger_answer_value) return false;
  if (currentParentAnswer === undefined || currentParentAnswer === null || currentParentAnswer === '') return false;

  const triggerValue = String(childQuestion.trigger_answer_value).toLowerCase().trim();
  const triggerValues = triggerValue.split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
  let toMatch = [];
  if (parentQuestion) {
    toMatch = getDisplayValuesForTrigger(parentQuestion, currentParentAnswer);
  }
  if (toMatch.length === 0) {
    if (typeof currentParentAnswer === 'string') toMatch.push(currentParentAnswer.trim().toLowerCase());
    else if (currentParentAnswer && typeof currentParentAnswer === 'object' && currentParentAnswer.selected != null) toMatch.push(String(currentParentAnswer.selected).toLowerCase());
    else toMatch.push(String(currentParentAnswer).toLowerCase());
  }

  for (const m of toMatch) {
    if (!m) continue;
    if (m === triggerValue || triggerValues.includes(m)) return true;
    if (triggerValues.some(tv => m.includes(tv) || tv.includes(m))) return true;
  }

  const yesValues = ['yes', 'نعم', 'true', '1', 'y'];
  const noValues = ['no', 'لا', 'false', '0', 'n'];
  if (toMatch.some(m => yesValues.includes(m)) && triggerValues.some(tv => yesValues.includes(tv))) return true;
  if (toMatch.some(m => noValues.includes(m)) && triggerValues.some(tv => noValues.includes(tv))) return true;

  if (typeof currentParentAnswer === 'string') {
    const trimmed = currentParentAnswer.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return shouldShowChild(JSON.parse(trimmed), childQuestion, parentQuestion);
      } catch { /* pass */ }
    }
  }
  if (typeof currentParentAnswer === 'object' && currentParentAnswer !== null && Array.isArray(currentParentAnswer.selected)) {
    const selected = currentParentAnswer.selected.map(v => String(v).toLowerCase().trim());
    if (triggerValues.some(tv => selected.some(s => s === tv || s.includes(tv) || tv.includes(s)))) return true;
  }
  if (typeof currentParentAnswer === 'object' && currentParentAnswer !== null && !Array.isArray(currentParentAnswer)) {
    const keys = Object.keys(currentParentAnswer).map(k => k.toLowerCase().trim());
    if (triggerValues.some(tv => keys.some(k => k === tv || k.includes(tv) || tv.includes(k)))) return true;
  }
  if (Array.isArray(currentParentAnswer)) {
    const items = currentParentAnswer.map(v => String(v).toLowerCase().trim());
    if (triggerValues.some(tv => items.some(s => s === tv || s.includes(tv) || tv.includes(s)))) return true;
  }

  return false;
}

// بناء قائمة مسطحة من الأسئلة المرئية (جذور + أطفال مرئيين متداخلين)
function getVisibleSteps(questions, answers) {
  const steps = [];
  if (!Array.isArray(questions)) return steps;

  function addQuestion(q, sectionName, isChild) {
    steps.push({ question: q, sectionName, isChild });
    if (!q.child_questions?.length) return;
    const parentAnswer = answers[q.id];
    q.child_questions.forEach(child => {
      if (!shouldShowChild(parentAnswer, child, q)) return;
      addQuestion(child, sectionName, true);
    });
  }

  questions.forEach(root => {
    const sectionName = root.section_name_ar || root.section_name || 'عام';
    addQuestion(root, sectionName, false);
  });
  return steps;
}

// جمع كل معرفات الأسئلة وأنواعها (شجرة كاملة)
function buildQuestionTypeMap(questions) {
  const map = {};
  function walk(list) {
    (list || []).forEach(q => {
      map[q.id] = q.question_type;
      walk(q.child_questions);
    });
  }
  walk(questions);
  return map;
}

const TemplateAssessmentWizard = () => {
  const navigate = useNavigate();
  const { assessmentId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [editingInheritedQuestionIds, setEditingInheritedQuestionIds] = useState({});
  const prevYesNoAnswerRef = useRef({});
  const wizardReadyRef = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => { wizardReadyRef.current = true; }, 800);
    return () => clearTimeout(t);
  }, [assessmentId]);

  useEffect(() => {
    fetchAssessment();
  }, [assessmentId]);

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/template-assessments/${assessmentId}`);
      const data = response.data.assessment;
      setAssessment(data);

      const initialAnswers = {};
      // initOne يُهيّئ السؤال وكل نسله بأي عمق (يدعم child of child of child...)
      const initOne = (q) => {
        if (!q || !q.id) return;
        if (q.question_type === 'Composite') {
          if (Array.isArray(q.reference_values) && q.reference_values.length > 0) {
            initialAnswers[q.id] = q.reference_values;
          } else if (q.answer_value) {
            try {
              const parsed = typeof q.answer_value === 'string' ? JSON.parse(q.answer_value) : q.answer_value;
              initialAnswers[q.id] = Array.isArray(parsed) ? parsed : [];
            } catch {
              initialAnswers[q.id] = [];
            }
          } else {
            initialAnswers[q.id] = [];
          }
        } else {
          const v = q.answer_value ?? q.linked_static_data_value ?? '';
          initialAnswers[q.id] = v != null ? v : '';
        }
        // تهيئة أسئلة فرعية بأي عمق (تعاودي)
        (q.child_questions || []).forEach(child => initOne(child));
      };
      data.questions.forEach(q => initOne(q));
      setAnswers(initialAnswers);
      prevYesNoAnswerRef.current = { ...initialAnswers };
    } catch (error) {
      console.error('Error fetching assessment:', error);
      alert('Failed to load assessment');
      navigate('/template-assessments');
    } finally {
      setLoading(false);
    }
  };

  const visibleSteps = useMemo(
    () => getVisibleSteps(assessment?.questions || [], answers),
    [assessment?.questions, answers]
  );

  const totalSteps = visibleSteps.length;
  const currentStep = visibleSteps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex >= totalSteps - 1 && totalSteps > 0;

  // عند تغيّر عدد الخطوات تأكد أن المؤشر ضمن النطاق
  useEffect(() => {
    if (totalSteps > 0 && currentStepIndex >= totalSteps) {
      setCurrentStepIndex(totalSteps - 1);
    }
  }, [totalSteps, currentStepIndex]);

  // عند الإجابة على سؤال YesNo: الانتقال للسؤال التالي بعد تحديث الحالة
  useEffect(() => {
    if (!wizardReadyRef.current) return; // تجنّب الانتقال عند التحميل الأول
    const q = currentStep?.question;
    if (!q || String(q.question_type || '').toLowerCase() !== 'yesno') return;
    const val = answers[q.id];
    const hasAnswer = val != null && String(val).trim() !== '';
    const prev = prevYesNoAnswerRef.current[q.id];
    prevYesNoAnswerRef.current[q.id] = val;
    if (hasAnswer && (prev == null || String(prev).trim() === '') && prev !== val && !isLastStep) {
      const t = setTimeout(() => setCurrentStepIndex(i => i + 1), 350);
      return () => clearTimeout(t);
    }
  }, [currentStep?.question?.id, answers, isLastStep]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    const q = currentStep?.question;
    if (q?.question_type === 'MultiChoice') {
      let opts = q.options;
      if (typeof opts === 'string') {
        try { opts = JSON.parse(opts); } catch { opts = {}; }
      }
      opts = opts && typeof opts === 'object' ? opts : {};
      const otherKey = opts.__otherOptionKey ?? null;
      const selectedKey = typeof value === 'string' ? value : value?.selected;
      if (selectedKey != null && selectedKey !== '' && selectedKey !== otherKey) {
        setTimeout(() => goNext(), 300);
      }
    }
  };

  const goNext = () => {
    if (currentStepIndex < totalSteps - 1) setCurrentStepIndex(i => i + 1);
  };

  const goPrev = () => {
    if (currentStepIndex > 0) setCurrentStepIndex(i => i - 1);
  };

  const goToStep = (index) => {
    const i = Math.max(0, Math.min(index, totalSteps - 1));
    setCurrentStepIndex(i);
  };

  const buildAnswerPayload = () => {
    const qTypeMap = buildQuestionTypeMap(assessment?.questions || []);

    return Object.entries(answers)
      .map(([questionId, value]) => {
        const qId = parseInt(questionId);
        const isComposite = qTypeMap[qId] === 'Composite' || Array.isArray(value);
        if (isComposite) {
          const cleaned = Array.isArray(value)
            ? value.filter(item => item && item.reference_id != null)
            : [];
          if (!cleaned.length) return null;
          return { question_id: qId, reference_values: cleaned };
        }
        if (value === '' || value === null || value === undefined) return null;
        return { question_id: qId, answer_value: value };
      })
      .filter(Boolean);
  };

  const handleSaveAnswers = async () => {
    try {
      setSaving(true);
      await api.post(`/template-assessments/${assessmentId}/answers`, {
        answers: buildAnswerPayload()
      });
      await fetchAssessment();
    } catch (error) {
      console.error('Error saving answers:', error);
      alert(error.response?.data?.message || 'Failed to save answers');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!confirm('هل أنت متأكد من إرسال التقييم؟ لن تتمكن من تعديله بعد الإرسال.')) return;
    try {
      setSaving(true);
      await api.post(`/template-assessments/${assessmentId}/answers`, {
        answers: buildAnswerPayload()
      });
      await api.post(`/template-assessments/${assessmentId}/submit`);
      navigate('/template-assessments');
    } catch (error) {
      console.error('Error submitting assessment:', error);
      alert(error.response?.data?.error || error.response?.data?.message || 'فشل إرسال التقييم');
    } finally {
      setSaving(false);
    }
  };

  const formatInheritedValue = (val) => {
    if (val == null || val === '') return '—';
    if (typeof val === 'object') {
      if (val.selected && Array.isArray(val.selected)) return val.selected.join('، ');
      return JSON.stringify(val);
    }
    return String(val);
  };

  const renderSingleQuestion = (question) => {
    const isInherited = Boolean(question.inherited_from_template_assessment_id);
    const isEditingInherited = Boolean(editingInheritedQuestionIds[question.id]);
    const hasAnswer = answers[question.id] !== undefined && answers[question.id] !== '';
    const showInheritedReadOnly = assessment?.status === 'draft' && isInherited && !isEditingInherited && hasAnswer;
    const answer = hasAnswer ? { answer_value: answers[question.id] } : null;
    const disabled = assessment?.status !== 'draft';

    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
            question.question_type === 'Composite' ? 'bg-indigo-100 text-indigo-800' :
            question.question_type === 'MultiChoice' ? 'bg-purple-100 text-purple-800' :
            question.question_type === 'MultiSelect' ? 'bg-teal-100 text-teal-800' :
            question.question_type === 'YesNo' ? 'bg-green-100 text-green-800' :
            'bg-slate-100 text-slate-700'
          }`}>
            {question.question_type}
          </span>
          {question.max_possible_score != null && (
            <span className="text-xs text-gray-500">{question.max_possible_score} نقطة</span>
          )}
          {isInherited && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs">من تقييم سابق</span>
          )}
        </div>

        <div className="p-6 md:p-8">
          {showInheritedReadOnly ? (
            <div className="space-y-4">
              <p className="text-amber-800 font-medium">الإجابة الحالية (من تقييم سابق):</p>
              <p className="text-gray-900">{formatInheritedValue(answers[question.id])}</p>
              <button
                type="button"
                onClick={() => setEditingInheritedQuestionIds(prev => ({ ...prev, [question.id]: true }))}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
              >
                تغيير الإجابة
              </button>
            </div>
          ) : (
            <QuestionRenderer
              question={question}
              answer={answer}
              onChange={(value) => handleAnswerChange(question.id, value)}
              disabled={disabled}
              institutionId={assessment?.entity_id}
              onEnterKey={() => {
                const q = currentStep?.question;
                if (!q) return;
                const val = answers[q.id];
                const hasAnswer = val !== undefined && val !== '' &&
                  (typeof val !== 'object' || Object.keys(val).length > 0);
                if (hasAnswer) goNext();
              }}
            />
          )}
          {question.evaluation_notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
              <strong>ملاحظات التقييم:</strong> {question.evaluation_notes}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-gray-600">جارٍ تحميل التقييم...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">التقييم غير موجود</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {/* شريط علوي مدمج */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/template-assessments')}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-1 text-sm font-medium"
          >
            <span aria-hidden>←</span>
            <span>العودة</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">{assessment.entity_name_ar}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              assessment.status === 'draft' ? 'bg-amber-100 text-amber-800' :
              assessment.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {assessment.status === 'draft' ? 'مسودة' : assessment.status === 'submitted' ? 'مرسل' : 'معتمد'}
            </span>
          </div>
        </div>

        {/* التقدم والقسم الحالي */}
        {totalSteps > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">
                السؤال {currentStepIndex + 1} من {totalSteps}
              </span>
              <span className="text-sm text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                {currentStep?.sectionName || '—'}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${totalSteps ? ((currentStepIndex + 1) / totalSteps) * 100 : 0}%` }}
              />
            </div>
            {/* نقاط سريعة للأقسام (اختياري) */}
            {totalSteps > 1 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {visibleSteps.map((step, idx) => (
                  <button
                    key={step.question.id + String(idx)}
                    type="button"
                    onClick={() => goToStep(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentStepIndex
                        ? 'bg-blue-600 scale-125'
                        : idx < currentStepIndex
                          ? 'bg-blue-400'
                          : 'bg-gray-300'
                    }`}
                    title={`السؤال ${idx + 1}: ${step.sectionName}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* السؤال الحالي فقط */}
        {currentStep ? (
          <div className="mb-6">
            {currentStep.isChild && (
              <p className="text-sm text-blue-600 mb-2 font-medium">سؤال فرعي — يظهر عند: {currentStep.question.trigger_answer_value}</p>
            )}
            {renderSingleQuestion(currentStep.question)}
          </div>
        ) : totalSteps === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">
            لا توجد أسئلة في هذا التقييم.
          </div>
        ) : null}

        {/* أزرار التنقل والحفظ */}
        {assessment.status === 'draft' && totalSteps > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg safe-area-pb">
            <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={isFirstStep}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  السابق
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={isLastStep}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                >
                  التالي
                </button>
              </div>
              <span className="text-sm text-gray-500 hidden sm:block">
                {currentStepIndex + 1} / {totalSteps}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveAnswers}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl border border-green-600 text-green-700 font-medium hover:bg-green-50 disabled:opacity-50 transition-colors"
                >
                  {saving ? '...' : 'حفظ'}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  إرسال التقييم
                </button>
              </div>
            </div>
          </div>
        )}

        {/* في وضع غير المسودة: عرض النتيجة فقط إن وُجدت */}
        {assessment.status !== 'draft' && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
            <span className="text-gray-600">النتيجة</span>
            <span className="text-2xl font-bold text-blue-600">
              {assessment.percentage_score != null ? Number(assessment.percentage_score).toFixed(1) : '—'}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateAssessmentWizard;
