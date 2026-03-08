/**
 * Parent-Child Question Component
 * مكون الأسئلة الفرعية - يعرض السؤال الفرعي فقط عند تحقق الشرط
 * يدعم أسئلة فرعية متداخلة (فرع فرعي): عند اختيار الإجابة المستهدفة يظهر السؤال الفرعي التالي.
 */

import React from 'react';
import QuestionRenderer from './QuestionRenderer';

/** استخراج قيم قابلة للمقارنة مع trigger_answer_value (نص المعروض أو المفتاح) */
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
    if (Array.isArray(answer.selected)) answer.selected.forEach(v => add(v));
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

export default function ParentChildQuestion({ 
  parentQuestion,
  childQuestions = [],
  parentAnswer,
  answers = {},
  onAnswerChange,
  disabled = false,
  institutionId
}) {
  // التحقق من تحقق شرط إظهار السؤال الفرعي — يدعم أي عمق وأي صيغة للإجابة
  const shouldShowChild = (currentParentAnswer, childQuestion, parentQuestion = null) => {
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
    if (toMatch.length > 0) {
      for (const m of toMatch) {
        if (m === triggerValue || triggerValues.includes(m)) return true;
        if (triggerValues.some(tv => m.includes(tv) || tv.includes(m))) return true;
      }
    }

    // إجابة محفوظة كـ JSON string — نحاول تحليلها أولاً
    if (typeof currentParentAnswer === 'string') {
      const trimmed = currentParentAnswer.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          return shouldShowChild(parsed, childQuestion, parentQuestion);
        } catch { /* ليس JSON صحيحاً */ }
      }
      const lower = trimmed.toLowerCase();
      if (lower === triggerValue || triggerValues.includes(lower)) return true;
      if (triggerValues.some(tv => lower.includes(tv))) return true;
      const yesValues = ['yes', 'نعم', 'true', '1', 'y'];
      const noValues = ['no', 'لا', 'false', '0', 'n'];
      if (yesValues.includes(lower) && yesValues.some(v => triggerValues.includes(v))) return true;
      if (noValues.includes(lower) && noValues.some(v => triggerValues.includes(v))) return true;
      return false;
    }

    // صيغة MultiSelect من الواجهة: { selected: string[], other_answers: string[] }
    if (typeof currentParentAnswer === 'object' && Array.isArray(currentParentAnswer.selected)) {
      const selected = currentParentAnswer.selected.map(v => String(v).toLowerCase().trim());
      return triggerValues.some(tv => selected.some(s => s === tv || s.includes(tv) || tv.includes(s)));
    }

    // صيغة MultiSelect قديمة: { "طرف ثالث": 0, "الجهة نفسها": 0 }
    if (typeof currentParentAnswer === 'object' && !Array.isArray(currentParentAnswer)) {
      const keys = Object.keys(currentParentAnswer).map(k => k.toLowerCase().trim());
      if (triggerValues.some(tv => keys.some(k => k === tv || k.includes(tv) || tv.includes(k)))) return true;
      if (triggerValues.some(tv => JSON.stringify(currentParentAnswer).toLowerCase().includes(tv))) return true;
      return false;
    }

    // مصفوفة
    if (Array.isArray(currentParentAnswer)) {
      const items = currentParentAnswer.map(v => String(v).toLowerCase().trim());
      return triggerValues.some(tv => items.some(s => s === tv || s.includes(tv) || tv.includes(s)));
    }

    return false;
  };

  // عرض مستوى واحد من الأسئلة الفرعية (مع إعادة استدعاء للمستوى التالي إن وُجد)
  const renderChildLevel = (levelParentAnswer, levelChildQuestions, levelParentQuestion, depth = 0) => {
    if (!levelChildQuestions?.length) return null;
    return (
      <div className="mr-8 border-r-2 border-blue-200 pr-6 mt-4">
        {levelChildQuestions.map((childQuestion) => {
          const showChild = shouldShowChild(levelParentAnswer, childQuestion, levelParentQuestion);
          if (!showChild) return null;

          const hasNestedChildren = childQuestion.child_questions?.length > 0;
          return (
            <div 
              key={childQuestion.id} 
              className="mb-6 bg-blue-50 rounded-lg p-4 border-2 border-blue-300 shadow-sm transition-all duration-300 ease-in-out"
            >
              <div className="flex items-start gap-2 mb-3">
                <span className="text-blue-600 text-lg font-bold">↳</span>
                <span className="text-blue-700 text-sm font-bold bg-blue-100 px-2 py-1 rounded">
                  سؤال فرعي
                </span>
                {childQuestion.trigger_answer_value && (
                  <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                    يظهر عند: {childQuestion.trigger_answer_value}
                  </span>
                )}
              </div>
              <QuestionRenderer
                question={childQuestion}
                answer={answers[childQuestion.id] != null && answers[childQuestion.id] !== ''
                  ? { answer_value: answers[childQuestion.id] }
                  : null}
                onChange={(value) => onAnswerChange(childQuestion.id, value)}
                disabled={disabled}
                institutionId={institutionId}
              />
              {hasNestedChildren && renderChildLevel(answers[childQuestion.id], childQuestion.child_questions, childQuestion, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="parent-child-question">
      {/* Parent Question */}
      <div className="mb-6">
        <QuestionRenderer
          question={parentQuestion}
          answer={answers[parentQuestion.id] != null && answers[parentQuestion.id] !== ''
            ? { answer_value: answers[parentQuestion.id] }
            : null}
          onChange={(value) => onAnswerChange(parentQuestion.id, value)}
          disabled={disabled}
          institutionId={institutionId}
        />
      </div>

      {/* Child Questions (مع دعم المستويات المتداخلة) */}
      {childQuestions.length > 0 && renderChildLevel(parentAnswer, childQuestions, parentQuestion)}
    </div>
  );
}
