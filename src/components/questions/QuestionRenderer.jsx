/**
 * Question Renderer Component
 * مكون عام لعرض أي نوع من الأسئلة - يدعم المرجعيات (Reference-First) للـ MultiSelect
 */

import React from 'react';
import CompositeQuestion from './CompositeQuestion';
import { useReferences } from '../../hooks/useReferences';

/**
 * تطبيع خيارات السؤال إلى مصفوفة { key, label, points } للعرض.
 * يدعم: { "عنوان": points } أو { "0": 5 } (مفاتيح رقمية) أو مصفوفة [{ name/label, value/points }].
 */
function normalizeQuestionOptions(opts) {
  if (!opts || typeof opts !== 'object') return [];
  const skipKeys = ['__other_options', '__otherOptionKey'];
  if (Array.isArray(opts)) {
    return opts
      .map((item, idx) => {
        if (item != null && typeof item === 'object')
          return { key: String(idx), label: item.name ?? item.label ?? `الخيار ${idx + 1}`, points: item.value ?? item.points ?? 0 };
        return { key: String(idx), label: `الخيار ${idx + 1}`, points: typeof item === 'number' ? item : 0 };
      })
      .filter(o => typeof o.points === 'number');
  }
  return Object.entries(opts)
    .filter(([k]) => !skipKeys.includes(k))
    .map(([k, v]) => {
      const points = typeof v === 'number' ? v : (v && typeof v === 'object' && (v.value ?? v.points) != null) ? (v.value ?? v.points) : 0;
      const label = v && typeof v === 'object' && (v.name ?? v.label) != null ? (v.name ?? v.label) : (/^\d+$/.test(String(k)) ? `الخيار ${Number(k) + 1}` : k);
      return { key: String(k), label: String(label), points };
    })
    .filter(o => typeof o.points === 'number');
}

export default function QuestionRenderer({ 
  question, 
  answer, 
  onChange,
  disabled = false,
  institutionId,
  /** عند الضغط Enter في حقل النص ينتقل للسؤال/الخيار التالي */
  onEnterKey
}) {
  const refType = question?.question_type === 'MultiSelect' && (question?.options_from_reference || question?.options?.__options_from_reference)
    ? (question.options_from_reference || question.options?.__options_from_reference)
    : null;
  const { references: refOptions } = useReferences(refType);

  const questionTextAr = question?.text_ar || question?.question_text_ar || '';
  const questionTextEn = question?.text_en || question?.question_text || '';

  if (!question) {
    return null;
  }

  const handleChange = (value) => {
    if (onChange) {
      onChange(value);
    }
  };

  // الأسئلة المركبة — نعرض نص السؤال ثم المكون
  if (question.question_type === 'Composite') {
    return (
      <div className="question-renderer mb-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {questionTextAr || 'سؤال مركب'}
          </h3>
          {questionTextEn && (
            <p className="text-sm text-gray-600">{questionTextEn}</p>
          )}
          {question.category && (
            <span className="inline-block mt-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
              {question.category}
            </span>
          )}
        </div>
        <CompositeQuestion
          question={question}
          answer={answer}
          onChange={handleChange}
          disabled={disabled}
        />
      </div>
    );
  }

  // الأسئلة الأخرى
  const answerValue = answer?.answer_value 
    ? (typeof answer.answer_value === 'string' 
        ? (answer.answer_value.startsWith('{') || answer.answer_value.startsWith('[')
            ? JSON.parse(answer.answer_value)
            : answer.answer_value)
        : answer.answer_value)
    : null;

  // دعم حقول مختلفة (للتوافق مع TemplateAssessmentWizard)
  return (
    <div className="question-renderer mb-6">
      {/* Question Text */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {questionTextAr}
        </h3>
        {questionTextEn && (
          <p className="text-sm text-gray-600">{questionTextEn}</p>
        )}
        {question.category && (
          <span className="inline-block mt-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
            {question.category}
          </span>
        )}
      </div>

      {/* Answer Input Based on Type */}
      <div className="answer-input">
        {/* Yes/No Question */}
        {question.question_type === 'YesNo' && (() => {
          const v = typeof answerValue === 'string' ? answerValue.trim().toLowerCase() : String(answerValue || '').toLowerCase();
          const isYes = ['yes', 'نعم', 'true', '1', 'y'].includes(v);
          const isNo = ['no', 'لا', 'false', '0', 'n'].includes(v);
          return (
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value="yes"
                  checked={isYes}
                  onChange={(e) => handleChange('yes')}
                  disabled={disabled}
                  className="w-5 h-5 text-green-600"
                />
                <span className="text-green-700 font-medium">✓ نعم</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value="no"
                  checked={isNo}
                  onChange={(e) => handleChange('no')}
                  disabled={disabled}
                  className="w-5 h-5 text-red-600"
                />
                <span className="text-red-700 font-medium">✗ لا</span>
              </label>
            </div>
          );
        })()}

        {/* MultiChoice - اختيار واحد؛ عند اختيار «أخرى» يظهر حقل نص خارجي */}
        {question.question_type === 'MultiChoice' && (() => {
          let opts = question.options;
          if (typeof opts === 'string') {
            try { opts = JSON.parse(opts); } catch { opts = {}; }
          }
          opts = opts && typeof opts === 'object' ? opts : {};
          const mainOptions = normalizeQuestionOptions(opts);
          const otherKey = opts.__otherOptionKey && mainOptions.some(o => o.key === opts.__otherOptionKey) ? opts.__otherOptionKey : null;
          const rawAnswer = answerValue;
          const selectedKey = rawAnswer && typeof rawAnswer === 'object' && rawAnswer !== null && 'selected' in rawAnswer
            ? rawAnswer.selected
            : (typeof rawAnswer === 'string' ? rawAnswer : null);
          const otherText = rawAnswer && typeof rawAnswer === 'object' && rawAnswer !== null && 'other_text' in rawAnswer
            ? (rawAnswer.other_text || '')
            : '';
          const setMultiChoiceAnswer = (key, externalText) => {
            if (key === otherKey && externalText !== undefined) {
              handleChange({ selected: key, other_text: externalText });
            } else if (key === otherKey) {
              handleChange({ selected: key, other_text: '' });
            } else {
              handleChange(key);
            }
          };
          const isOtherSelected = otherKey && selectedKey === otherKey;
          return (
            <div className="space-y-3">
              <div className="space-y-2">
                {mainOptions.map(({ key, label, points }) => (
                  <label key={key} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-200">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={key}
                      checked={selectedKey === key}
                      onChange={() => setMultiChoiceAnswer(key)}
                      disabled={disabled}
                      className="w-5 h-5"
                    />
                    <span className="flex-1">{label}</span>
                    <span className="text-gray-500 text-sm">({points} نقطة)</span>
                  </label>
                ))}
              </div>
              {isOtherSelected && otherKey && (
                <div className="mr-2 p-4 rounded-lg border-2 border-amber-200 bg-amber-50/80">
                  <p className="text-amber-800 font-medium mb-2">اخترت «أخرى» — أضف النص الخارجي (خيار غير موجود في القائمة):</p>
                  <input
                    type="text"
                    value={otherText}
                    onChange={(e) => setMultiChoiceAnswer(otherKey, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        onEnterKey?.();
                      }
                    }}
                    disabled={disabled}
                    placeholder="اكتب الخيار أو النص..."
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>
          );
        })()}

        {/* MultiSelect - يدعم options_from_reference أو خيارات يدوية */}
        {question.question_type === 'MultiSelect' && (() => {
          const useRefOptions = refOptions && refOptions.length > 0;
          let opts = question.options;
          if (typeof opts === 'string') {
            try { opts = JSON.parse(opts); } catch { opts = {}; }
          }
          opts = opts && typeof opts === 'object' ? opts : {};
          const mainOptionsManual = normalizeQuestionOptions(opts);
          const allBinary = mainOptionsManual.length > 0 && mainOptionsManual.every(o => o.points === 0 || o.points === 1);
          const mainOptions = useRefOptions
            ? refOptions.map(r => ({ key: r.id, label: r.name_ar || r.name_en, points: 0 }))
            : mainOptionsManual;
          const otherKey = useRefOptions ? null : (
            (opts.__otherOptionKey && mainOptionsManual.some(o => o.key === opts.__otherOptionKey))
              ? opts.__otherOptionKey
              : mainOptionsManual.find(o => String(o.label).trim() === 'أخرى' || String(o.label).trim().toLowerCase() === 'other')?.key
          );
          const value = answerValue && typeof answerValue === 'object' && !Array.isArray(answerValue)
            ? answerValue
            : { selected: Array.isArray(answerValue) ? answerValue : [], other_answers: [] };
          const selected = value.selected || [];
          const selectedIds = selected.map(s => (typeof s === 'number' ? s : parseInt(s, 10))).filter(n => !isNaN(n));
          const otherAnswers = Array.isArray(value.other_answers) ? value.other_answers : [];
          const setMultiSelectValue = (updates) => {
            handleChange({
              selected: updates.selected !== undefined ? updates.selected : selected,
              other_answers: updates.other_answers !== undefined ? updates.other_answers : otherAnswers
            });
          };
          const toggleSelected = (keyOrId) => {
            const nextSelected = selected.includes(keyOrId)
              ? selected.filter(k => k !== keyOrId)
              : [...selected, keyOrId];
            if (keyOrId === otherKey) {
              const newOtherAnswers = nextSelected.includes(otherKey) ? (otherAnswers.length === 0 ? [''] : otherAnswers) : [];
              setMultiSelectValue({ selected: nextSelected, other_answers: newOtherAnswers });
              return;
            }
            setMultiSelectValue({ selected: nextSelected });
          };
          const isChecked = (keyOrId) => selected.includes(keyOrId) || (useRefOptions && selectedIds.includes(keyOrId));
          const addOtherAnswer = () => setMultiSelectValue({ other_answers: [...otherAnswers, ''] });
          const setOtherAnswerAt = (idx, text) => setMultiSelectValue({ other_answers: otherAnswers.map((a, i) => i === idx ? text : a) });
          const removeOtherAnswer = (idx) => setMultiSelectValue({ other_answers: otherAnswers.filter((_, i) => i !== idx) });
          const isOtherSelected = otherKey && selected.includes(otherKey);
          return (
            <div className="space-y-3">
              <div className="space-y-2">
                {mainOptions.map(({ key: keyOrId, label, points }) => (
                  <label key={keyOrId} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-200">
                    <input
                      type="checkbox"
                      checked={isChecked(keyOrId)}
                      onChange={() => toggleSelected(keyOrId)}
                      disabled={disabled}
                      className="w-5 h-5 rounded text-teal-600"
                    />
                    <span className="flex-1">{label}</span>
                    {!useRefOptions && allBinary && (
                      <span className={`text-sm font-medium ${points === 1 ? 'text-green-600' : 'text-gray-400'}`}>
                        {points === 1 ? '✓ صحيح' : '✗ خطأ'}
                      </span>
                    )}
                    {!useRefOptions && !allBinary && typeof points === 'number' && points > 0 && (
                      <span className="text-gray-500 text-sm">({points} نقطة)</span>
                    )}
                  </label>
                ))}
              </div>
              {isOtherSelected && (
                <div className="mr-2 p-4 rounded-lg border-2 border-amber-200 bg-amber-50/80">
                  <p className="text-amber-800 font-medium mb-3">اخترت «أخرى» — يمكنك إضافة عدة خيارات (اكتب كل خيار في حقل، واضغط «إضافة خيار آخر» للمزيد):</p>
                  <div className="space-y-2">
                    {otherAnswers.map((text, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={text}
                          onChange={(e) => setOtherAnswerAt(idx, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              onEnterKey?.();
                            }
                          }}
                          disabled={disabled}
                          placeholder={otherAnswers.length > 1 ? `خيار ${idx + 1}` : 'اكتب الخيار الأول...'}
                          className="flex-1 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeOtherAnswer(idx)}
                          disabled={disabled}
                          className="text-red-600 hover:text-red-800 p-2 shrink-0"
                          title="حذف هذا الخيار"
                        >
                          ✗
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addOtherAnswer}
                      disabled={disabled}
                      className="w-full sm:w-auto px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
                    >
                      + إضافة خيار آخر
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Manual Input Question */}
        {question.question_type === 'Manual' && (
          <input
            type="text"
            value={answerValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onEnterKey?.();
              }
            }}
            disabled={disabled}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="أدخل الإجابة..."
          />
        )}

        {/* StaticData Question */}
        {question.question_type === 'StaticData' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              📊 هذا السؤال يُعبأ تلقائياً من البيانات الثابتة للمؤسسة
            </p>
            {answerValue && (
              <p className="mt-2 text-blue-900 font-medium">
                القيمة الحالية: {answerValue}
              </p>
            )}
          </div>
        )}

        {/* Number Input for Manual (if numeric) */}
        {question.question_type === 'Manual' && question.category?.toLowerCase().includes('number') && (
          <input
            type="number"
            value={answerValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onEnterKey?.();
              }
            }}
            disabled={disabled}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-2"
            placeholder="أدخل رقم..."
          />
        )}
      </div>

      {/* Weight Display */}
      {question.weight && (
        <div className="mt-3 text-sm text-gray-600">
          <span>⭐ النقاط: {question.weight}</span>
        </div>
      )}
    </div>
  );
}
