/**
 * TemplateWeightManager — مدير توزيع الأوزان الاحترافي
 * 5 خطوات: اختيار الأسئلة → تصنيف المحاور → أوزان المحاور → أوزان الأسئلة → مراجعة وحفظ
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { questionsNewService } from '../services';

// ── Helpers ──────────────────────────────────────────────────────────────────
const r2 = (n) => Math.round((n || 0) * 100) / 100;

function redistribute(weights, changedKey, rawNewValue) {
  const newValue = Math.max(0, Math.min(100, rawNewValue));
  const delta = newValue - (weights[changedKey]?.weight || 0);
  if (delta === 0) return weights;
  const unlockedKeys = Object.keys(weights).filter(k => k !== changedKey && !weights[k]?.locked);
  const updated = { ...weights, [changedKey]: { ...(weights[changedKey] || {}), weight: newValue } };
  if (unlockedKeys.length === 0) return updated;
  const totalUnlocked = unlockedKeys.reduce((s, k) => s + (weights[k]?.weight || 0), 0);
  let remaining = -delta;
  unlockedKeys.forEach((k, i) => {
    if (i === unlockedKeys.length - 1) {
      updated[k] = { ...weights[k], weight: r2(Math.max(0, (weights[k]?.weight || 0) + remaining)) };
    } else {
      const proportion = totalUnlocked > 0 ? (weights[k]?.weight || 0) / totalUnlocked : 1 / unlockedKeys.length;
      const change = r2(delta * proportion);
      updated[k] = { ...weights[k], weight: r2(Math.max(0, (weights[k]?.weight || 0) - change)) };
      remaining += change;
    }
  });
  return updated;
}

function equalizeUnlocked(weights, totalTarget = 100) {
  const lockedKeys = Object.keys(weights).filter(k => weights[k]?.locked);
  const unlockedKeys = Object.keys(weights).filter(k => !weights[k]?.locked);
  if (unlockedKeys.length === 0) return weights;
  const lockedTotal = lockedKeys.reduce((s, k) => s + (weights[k]?.weight || 0), 0);
  const available = Math.max(0, totalTarget - lockedTotal);
  const perItem = r2(available / unlockedKeys.length);
  const updated = { ...weights };
  let sum = 0;
  unlockedKeys.forEach((k, i) => {
    const w = i === unlockedKeys.length - 1 ? r2(available - sum) : perItem;
    updated[k] = { ...weights[k], weight: w };
    sum += perItem;
  });
  return updated;
}

const sumWeights = (weights) => r2(Object.values(weights).reduce((s, v) => s + (v?.weight || 0), 0));

const totalColor = (total) =>
  Math.abs(total - 100) < 0.1 ? 'text-green-600' :
  Math.abs(total - 100) <= 3  ? 'text-yellow-600' : 'text-red-600';

const totalBg = (total) =>
  Math.abs(total - 100) < 0.1 ? 'bg-green-50 border-green-200' :
  Math.abs(total - 100) <= 3  ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

const progressBg = (total) =>
  Math.abs(total - 100) < 0.1 ? 'bg-green-500' :
  Math.abs(total - 100) <= 3  ? 'bg-yellow-500' : 'bg-red-500';

const Q_TYPE_LABELS = {
  YesNo: '✓✗ نعم/لا', MultiChoice: '○ اختيار', MultiSelect: '☑ متعدد',
  Manual: '✎ يدوي', Composite: '📋 مركب', StaticData: '📊 بيانات'
};
const qTypeLabel = (t) => Q_TYPE_LABELS[t] || t;

const STEPS = [
  { num: 1, label: 'اختيار الأسئلة' },
  { num: 2, label: 'تصنيف المحاور' },
  { num: 3, label: 'أوزان المحاور'  },
  { num: 4, label: 'أوزان الأسئلة'  },
  { num: 5, label: 'مراجعة وحفظ'   },
];

const MATURITY_LEVELS = [
  { min: 90, label: 'ناضج جداً',       color: 'text-green-700 bg-green-100 border-green-300'  },
  { min: 75, label: 'متقدم',            color: 'text-blue-700 bg-blue-100 border-blue-300'     },
  { min: 60, label: 'متوسط',            color: 'text-yellow-700 bg-yellow-100 border-yellow-300'},
  { min: 0,  label: 'بحاجة لتحسين',    color: 'text-red-700 bg-red-100 border-red-300'        },
];
const getMaturity = (pct) => MATURITY_LEVELS.find(l => pct >= l.min) || MATURITY_LEVELS[3];

// ── Component ─────────────────────────────────────────────────────────────────
export default function TemplateWeightManager() {
  const navigate = useNavigate();
  const { templateId } = useParams();

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [step,     setStep]     = useState(1);
  const [template, setTemplate] = useState(null);

  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [qFilters, setQFilters] = useState({ search: '', type: '' });

  const [selectedQs, setSelectedQs]       = useState([]);   // [{id, text_ar, text_en, question_type, weight}]
  const [questionAxis, setQuestionAxis]    = useState({});   // { qId: axisName }
  const [axes, setAxes]                    = useState([]);
  const [newAxisName, setNewAxisName]      = useState('');
  const [axisWeights, setAxisWeights]      = useState({});   // { axisName: { weight, locked } }
  const [questionWeights, setQuestionWeights] = useState({}); // { qId: { weight, locked } }
  const [viewAxis, setViewAxis]            = useState('');   // active axis in step 4

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => { load(); }, [templateId]);

  const load = async () => {
    try {
      setLoading(true);
      const allQ = await questionsNewService.getAll({ flat: 'true' });
      setAvailableQuestions(Array.isArray(allQ) ? allQ : []);

      if (!templateId) { setLoading(false); return; }

      const resp = await api.get(`/templates/${templateId}`);
      const tmpl = resp.data.template;
      setTemplate(tmpl);

      const tQuestions = (tmpl.questions || [])
        .filter(q => q.include_in_evaluation !== false)
        .map(q => ({
        id: q.id,
        text_ar: q.text_ar || q.question_text_ar || '',
        text_en: q.text_en || q.question_text || '',
        question_type: q.question_type,
        weight: parseFloat(q.weight) || 1,
        override_weight: q.override_weight != null ? parseFloat(q.override_weight) : null,
        section_name_ar: q.section_name_ar || q.section_name_legacy || q.section_name || '',
      }));
      setSelectedQs(tQuestions);

      // axis map
      const axMap = {};
      const axSet = new Set();
      tQuestions.forEach(q => {
        const ax = q.section_name_ar || 'غير مصنف';
        axMap[q.id] = ax;
        axSet.add(ax);
      });
      setQuestionAxis(axMap);
      const axList = [...axSet].filter(a => a && a !== 'غير مصنف');
      if (axSet.has('غير مصنف')) axList.push('غير مصنف');
      setAxes(axList);

      // axis weights
      const savedAW = tmpl.axis_weights && typeof tmpl.axis_weights === 'object' ? tmpl.axis_weights : {};
      const awMap = {};
      axList.forEach(ax => { awMap[ax] = { weight: savedAW[ax] != null ? r2(savedAW[ax]) : 0, locked: false }; });
      if (Object.keys(savedAW).length === 0 && axList.length > 0) {
        const per = r2(100 / axList.length);
        axList.forEach((ax, i) => { awMap[ax] = { weight: i === axList.length - 1 ? r2(100 - per * (axList.length - 1)) : per, locked: false }; });
      }
      setAxisWeights(awMap);

      // question weights
      const qwMap = {};
      tQuestions.forEach(q => {
        qwMap[q.id] = { weight: q.override_weight != null ? r2(q.override_weight) : r2(q.weight), locked: false };
      });
      // normalize if not summing to 100
      const qSum = sumWeights(qwMap);
      if (tQuestions.length > 0 && Math.abs(qSum - 100) > 1) {
        axList.forEach(ax => {
          const axQ = tQuestions.filter(q => axMap[q.id] === ax);
          const axW = awMap[ax]?.weight || r2(100 / axList.length);
          const per = axQ.length > 0 ? r2(axW / axQ.length) : 0;
          axQ.forEach((q, i) => {
            qwMap[q.id] = { weight: i === axQ.length - 1 ? r2(axW - per * (axQ.length - 1)) : per, locked: false };
          });
        });
      }
      setQuestionWeights(qwMap);
      setViewAxis(axList[0] || '');
    } catch (err) {
      console.error('Error loading:', err);
      alert('فشل تحميل القالب: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // ── Computed ────────────────────────────────────────────────────────────────
  const axisQuestionMap = useMemo(() => {
    const m = {};
    axes.forEach(ax => { m[ax] = selectedQs.filter(q => questionAxis[q.id] === ax); });
    return m;
  }, [axes, selectedQs, questionAxis]);

  const totalAxisW = useMemo(() => sumWeights(axisWeights), [axisWeights]);
  const totalQuestionW = useMemo(() => r2(selectedQs.reduce((s, q) => s + (questionWeights[q.id]?.weight || 0), 0)), [selectedQs, questionWeights]);
  const uncategorized = useMemo(() => selectedQs.filter(q => !questionAxis[q.id] || questionAxis[q.id] === 'غير مصنف').length, [selectedQs, questionAxis]);

  const filteredAvailable = useMemo(() => {
    const selIds = new Set(selectedQs.map(q => q.id));
    return availableQuestions.filter(q => {
      if (selIds.has(q.id)) return false;
      if (qFilters.type && q.question_type !== qFilters.type) return false;
      if (qFilters.search) {
        const s = qFilters.search.toLowerCase();
        if (!q.text_ar?.toLowerCase().includes(s) && !q.text_en?.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [availableQuestions, selectedQs, qFilters]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const addQ = (q) => {
    setSelectedQs(prev => [...prev, { id: q.id, text_ar: q.text_ar || '', text_en: q.text_en || '', question_type: q.question_type, weight: q.weight || 1 }]);
    setQuestionWeights(prev => ({ ...prev, [q.id]: { weight: 0, locked: false } }));
  };

  const removeQ = (qId) => {
    setSelectedQs(prev => prev.filter(q => q.id !== qId));
    setQuestionAxis(prev => { const n = { ...prev }; delete n[qId]; return n; });
    setQuestionWeights(prev => { const n = { ...prev }; delete n[qId]; return n; });
  };

  const addAxis = () => {
    const name = newAxisName.trim();
    if (!name || axes.includes(name)) return;
    setAxes(prev => [...prev, name]);
    setAxisWeights(prev => ({ ...prev, [name]: { weight: 0, locked: false } }));
    setNewAxisName('');
  };

  const removeAxis = (name) => {
    if ((axisQuestionMap[name]?.length || 0) > 0) return;
    setAxes(prev => prev.filter(a => a !== name));
    setAxisWeights(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const changeAxisW = (axName, newVal) => {
    const updated = redistribute(axisWeights, axName, newVal);
    setAxisWeights(updated);
    // sync question weights for this axis proportionally
    const axQ = axisQuestionMap[axName] || [];
    if (axQ.length > 0) {
      const newAxW = updated[axName].weight;
      setQuestionWeights(prev => {
        const qwCopy = { ...prev };
        const per = r2(newAxW / axQ.length);
        axQ.forEach((q, i) => {
          if (!qwCopy[q.id]?.locked) {
            qwCopy[q.id] = { ...qwCopy[q.id], weight: i === axQ.length - 1 ? r2(newAxW - per * (axQ.length - 1)) : per };
          }
        });
        return qwCopy;
      });
    }
  };

  const equalizeAxes = () => {
    const updated = equalizeUnlocked(axisWeights, 100);
    setAxisWeights(updated);
    // sync question weights
    Object.keys(updated).forEach(ax => {
      const axQ = axisQuestionMap[ax] || [];
      if (axQ.length === 0) return;
      const axW = updated[ax].weight;
      const per = r2(axW / axQ.length);
      setQuestionWeights(prev => {
        const qwCopy = { ...prev };
        axQ.forEach((q, i) => {
          if (!qwCopy[q.id]?.locked) {
            qwCopy[q.id] = { ...qwCopy[q.id], weight: i === axQ.length - 1 ? r2(axW - per * (axQ.length - 1)) : per };
          }
        });
        return qwCopy;
      });
    });
  };

  const changeQW = (qId, rawVal, axName) => {
    const axisTotal = axisWeights[axName]?.weight || 0;
    const axQ = (axisQuestionMap[axName] || []);
    const lockedSum = axQ.filter(q => q.id !== qId && questionWeights[q.id]?.locked).reduce((s, q) => s + (questionWeights[q.id]?.weight || 0), 0);
    const clamped = Math.max(0, Math.min(axisTotal - lockedSum, rawVal));
    const axisWeightsMap = {};
    axQ.forEach(q => { axisWeightsMap[q.id] = questionWeights[q.id] || { weight: 0, locked: false }; });
    const redistributed = redistribute(axisWeightsMap, qId, clamped);
    setQuestionWeights(prev => ({ ...prev, ...redistributed }));
  };

  const equalizeQsInAxis = (axName) => {
    const axQ = axisQuestionMap[axName] || [];
    const axisTotal = axisWeights[axName]?.weight || 0;
    const axMap = {};
    axQ.forEach(q => { axMap[q.id] = questionWeights[q.id] || { weight: 0, locked: false }; });
    const eq = equalizeUnlocked(axMap, axisTotal);
    setQuestionWeights(prev => ({ ...prev, ...eq }));
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!templateId) return;
    try {
      setSaving(true);
      const axPayload = {};
      Object.keys(axisWeights).forEach(ax => { axPayload[ax] = axisWeights[ax]?.weight || 0; });
      const qPayload = selectedQs.map((q, idx) => ({
        question_id: q.id,
        display_order: idx,
        override_weight: r2(questionWeights[q.id]?.weight || 0),
        section_name_ar: questionAxis[q.id] || '',
        include_in_evaluation: true,
      }));
      await api.put(`/templates/${templateId}/weights`, { axis_weights: axPayload, questions: qPayload });
      alert('✅ تم حفظ الأوزان بنجاح!');
      navigate('/templates');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message;
      alert('❌ فشل الحفظ: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const canStep1 = selectedQs.length > 0;
  const canStep2 = uncategorized === 0 && selectedQs.length > 0;
  const canStep3 = Math.abs(totalAxisW - 100) < 0.15;
  const canStep4 = Math.abs(totalQuestionW - 100) < 0.15;

  // ── Render helpers ────────────────────────────────────────────────────────────
  const TotalBar = ({ total, label }) => (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className={`font-bold ${totalColor(total)}`}>{total}%</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${progressBg(total)}`} style={{ width: `${Math.min(100, total)}%` }} />
      </div>
      <p className={`text-xs mt-1 ${totalColor(total)}`}>
        {Math.abs(total - 100) < 0.15 ? '✓ مجموع صحيح (100%)' :
         total < 100 ? `⚠ متبقي ${r2(100 - total)}%` : `⚠ تجاوز بـ ${r2(total - 100)}%`}
      </p>
    </div>
  );

  // ── Step 1 ────────────────────────────────────────────────────────────────────
  const step1 = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Available */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-base font-bold text-gray-900 mb-4">بنك الأسئلة المتاحة</h3>
        <div className="flex gap-2 mb-4">
          <input type="text" value={qFilters.search} onChange={e => setQFilters(p => ({ ...p, search: e.target.value }))}
            placeholder="بحث..." className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
          <select value={qFilters.type} onChange={e => setQFilters(p => ({ ...p, type: e.target.value }))}
            className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
            <option value="">كل الأنواع</option>
            {Object.keys(Q_TYPE_LABELS).map(t => <option key={t} value={t}>{Q_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {filteredAvailable.length === 0 && <p className="text-gray-400 text-center py-10 text-sm">لا توجد نتائج</p>}
          {filteredAvailable.map(q => (
            <div key={q.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50/50 transition-all group cursor-pointer" onClick={() => addQ(q)}>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded mt-0.5 whitespace-nowrap shrink-0">{qTypeLabel(q.question_type)}</span>
              <span className="flex-1 text-sm text-gray-800 leading-snug">{q.text_ar}</span>
              <span className="shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold group-hover:bg-blue-600 group-hover:text-white transition-all">+</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">الأسئلة المختارة</h3>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">{selectedQs.length} سؤال</span>
        </div>
        {selectedQs.length === 0
          ? <div className="text-center py-16 text-gray-300"><div className="text-5xl mb-3">📋</div><p className="text-sm">اضغط على أي سؤال لإضافته</p></div>
          : <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {selectedQs.map((q, idx) => (
                <div key={q.id} className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <span className="text-xs text-gray-400 w-5 pt-0.5">{idx + 1}</span>
                  <span className="text-xs bg-white text-gray-500 px-2 py-0.5 rounded mt-0.5 whitespace-nowrap shrink-0">{qTypeLabel(q.question_type)}</span>
                  <span className="flex-1 text-sm text-gray-800 leading-snug">{q.text_ar}</span>
                  <button onClick={() => removeQ(q.id)} className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-red-400 hover:bg-red-100 hover:text-red-600 transition-all text-xs">✕</button>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );

  // ── Step 2 ────────────────────────────────────────────────────────────────────
  const step2 = (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-base font-bold text-gray-900 mb-3">إدارة المحاور</h3>
        <div className="flex gap-3">
          <input type="text" value={newAxisName} onChange={e => setNewAxisName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addAxis()}
            placeholder="اسم المحور الجديد..." className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm" />
          <button onClick={addAxis} disabled={!newAxisName.trim()} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-40">+ إضافة</button>
        </div>
        {axes.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {axes.map(ax => (
              <div key={ax} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm">
                <span className="text-blue-800 font-medium">{ax}</span>
                <span className="text-xs text-gray-500">({axisQuestionMap[ax]?.length || 0} سؤال)</span>
                {(axisQuestionMap[ax]?.length || 0) === 0 && (
                  <button onClick={() => removeAxis(ax)} className="text-red-400 hover:text-red-600 text-xs leading-none">✕</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">تصنيف الأسئلة</h3>
          {uncategorized > 0 && <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">⚠ {uncategorized} غير مصنف</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/70 border-b">
              <tr>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">#</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">السؤال</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">النوع</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs w-52">المحور</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {selectedQs.map((q, idx) => {
                const ax = questionAxis[q.id];
                const isUnassigned = !ax;
                return (
                  <tr key={q.id} className={isUnassigned ? 'bg-red-50/50' : 'hover:bg-gray-50/50'}>
                    <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3"><p className="text-gray-800 leading-snug line-clamp-2 text-xs">{q.text_ar}</p></td>
                    <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{qTypeLabel(q.question_type)}</span></td>
                    <td className="px-4 py-3">
                      <select value={ax || ''} onChange={e => setQuestionAxis(p => ({ ...p, [q.id]: e.target.value }))}
                        className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 ${isUnassigned ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                        <option value="">-- اختر المحور --</option>
                        {axes.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ── Step 3 ────────────────────────────────────────────────────────────────────
  const step3 = (
    <div className="space-y-5">
      <div className={`rounded-2xl border p-5 ${totalBg(totalAxisW)}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">أوزان المحاور</h3>
          <button onClick={equalizeAxes} className="px-4 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-xl text-sm font-medium hover:bg-indigo-50 transition-all">⚖ توزيع متساوٍ</button>
        </div>
        <TotalBar total={totalAxisW} label="إجمالي أوزان المحاور" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-right px-5 py-3 font-semibold text-gray-600 text-xs">المحور</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs w-20">عدد الأسئلة</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs w-24">الوزن %</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">شريط التحكم</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs w-14">قفل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {axes.map(ax => {
              const aw = axisWeights[ax] || { weight: 0, locked: false };
              return (
                <tr key={ax} className={aw.locked ? 'bg-amber-50/50' : 'hover:bg-gray-50/30'}>
                  <td className="px-5 py-4">
                    <div className="font-medium text-gray-900 text-sm">{ax}</div>
                    <div className="h-1 bg-gray-100 rounded-full mt-1.5 w-28">
                      <div className={`h-full rounded-full transition-all ${aw.weight > 0 ? 'bg-blue-500' : 'bg-gray-200'}`} style={{ width: `${Math.min(100, aw.weight)}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{axisQuestionMap[ax]?.length || 0}</span>
                  </td>
                  <td className="px-4 py-4">
                    <input type="number" min="0" max="100" step="0.5" value={aw.weight} disabled={aw.locked}
                      onChange={e => changeAxisW(ax, parseFloat(e.target.value) || 0)}
                      className={`w-20 px-2 py-1.5 border-2 rounded-lg text-center font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${aw.locked ? 'bg-amber-50 border-amber-200 text-amber-700' : 'border-gray-200'}`} />
                  </td>
                  <td className="px-4 py-4">
                    <input type="range" min="0" max="100" step="0.5" value={aw.weight} disabled={aw.locked}
                      onChange={e => changeAxisW(ax, parseFloat(e.target.value))}
                      className="w-full accent-blue-500 disabled:accent-amber-400" />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button onClick={() => setAxisWeights(p => ({ ...p, [ax]: { ...p[ax], locked: !p[ax]?.locked } }))}
                      className={`w-8 h-8 rounded-lg text-sm transition-all ${aw.locked ? 'bg-amber-200 text-amber-700 hover:bg-amber-300' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                      title={aw.locked ? 'فك القفل' : 'قفل الوزن'}>
                      {aw.locked ? '🔒' : '🔓'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── Step 4 ────────────────────────────────────────────────────────────────────
  const activeAxis = viewAxis || axes[0] || '';
  const activeAxQ  = axisQuestionMap[activeAxis] || [];
  const activeAxTotal = axisWeights[activeAxis]?.weight || 0;
  const activeAxQSum  = r2(activeAxQ.reduce((s, q) => s + (questionWeights[q.id]?.weight || 0), 0));

  const step4 = (
    <div className="space-y-5">
      {/* Axis tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex gap-2 flex-wrap">
          {axes.map(ax => {
            const axQ2 = axisQuestionMap[ax] || [];
            const axSum = r2(axQ2.reduce((s, q) => s + (questionWeights[q.id]?.weight || 0), 0));
            const axW = axisWeights[ax]?.weight || 0;
            const ok = Math.abs(axSum - axW) < 0.15;
            return (
              <button key={ax} onClick={() => setViewAxis(ax)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${activeAxis === ax ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {ax}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{axSum}/{axW}%</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeAxis && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-blue-50 border-b flex items-center justify-between">
            <div>
              <h3 className="font-bold text-blue-900">{activeAxis}</h3>
              <p className="text-xs text-blue-600 mt-0.5">وزن المحور: <b>{activeAxTotal}%</b> — {activeAxQ.length} سؤال</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold ${Math.abs(activeAxQSum - activeAxTotal) < 0.15 ? 'text-green-600' : 'text-red-600'}`}>
                موزّع: {activeAxQSum}%
              </span>
              <button onClick={() => equalizeQsInAxis(activeAxis)} className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-50">⚖ توزيع متساوٍ</button>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs">
              <tr>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">السؤال</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">% من الكلي</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">% من المحور</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 w-36">شريط</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600 w-12">قفل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activeAxQ.map(q => {
                const qw = questionWeights[q.id] || { weight: 0, locked: false };
                const fromTotal = r2(qw.weight);
                const fromAxis  = activeAxTotal > 0 ? r2((qw.weight / activeAxTotal) * 100) : 0;
                return (
                  <tr key={q.id} className={qw.locked ? 'bg-amber-50/40' : 'hover:bg-gray-50/40'}>
                    <td className="px-4 py-3">
                      <div className="relative group/tip">
                        <p className="text-gray-800 text-xs leading-snug line-clamp-2">{q.text_ar}</p>
                        {/* Tooltip */}
                        <div className="hidden group-hover/tip:block absolute z-20 right-0 top-full mt-1 bg-gray-900 text-white text-xs rounded-xl p-3 w-52 shadow-2xl pointer-events-none">
                          <p>من الكلي: <b>{fromTotal}%</b></p>
                          <p>من المحور: <b>{fromAxis}%</b></p>
                          <p>النوع: {qTypeLabel(q.question_type)}</p>
                        </div>
                      </div>
                      {/* Dual progress bars */}
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0"></span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, fromTotal)}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 w-10 text-left">{fromTotal}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full shrink-0"></span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, fromAxis)}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 w-10 text-left">{fromAxis}%</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" min="0" max={activeAxTotal} step="0.5" value={fromTotal} disabled={qw.locked}
                        onChange={e => changeQW(q.id, parseFloat(e.target.value) || 0, activeAxis)}
                        className={`w-20 px-2 py-1.5 border-2 rounded-lg text-center font-bold text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 ${qw.locked ? 'bg-amber-50 border-amber-200' : 'border-gray-200'}`} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-medium">{fromAxis}%</td>
                    <td className="px-4 py-3">
                      <input type="range" min="0" max={activeAxTotal} step="0.5" value={fromTotal} disabled={qw.locked}
                        onChange={e => changeQW(q.id, parseFloat(e.target.value), activeAxis)}
                        className="w-full accent-blue-500 disabled:accent-amber-400" />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => setQuestionWeights(p => ({ ...p, [q.id]: { ...p[q.id], locked: !p[q.id]?.locked } }))}
                        className={`w-7 h-7 rounded-lg text-xs transition-all ${qw.locked ? 'bg-amber-200 text-amber-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                        {qw.locked ? '🔒' : '🔓'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ── Step 5 ────────────────────────────────────────────────────────────────────
  const isReady = Math.abs(totalQuestionW - 100) < 0.15;
  const step5 = (
    <div className="space-y-5">
      {/* Status banner */}
      <div className={`rounded-2xl border-2 p-5 ${isReady ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-4">
          <span className="text-4xl">{isReady ? '✅' : '❌'}</span>
          <div>
            <h3 className={`font-bold text-lg ${isReady ? 'text-green-800' : 'text-red-800'}`}>
              {isReady ? 'الأوزان صحيحة — جاهز للحفظ' : 'يرجى مراجعة الأوزان'}
            </h3>
            <p className={`text-sm ${isReady ? 'text-green-700' : 'text-red-700'}`}>
              مجموع أوزان الأسئلة = {totalQuestionW}% {isReady ? '✓' : '(يجب أن يساوي 100%)'}
            </p>
          </div>
          <div className="mr-auto text-left">
            <p className="text-xs text-gray-500">عدد الأسئلة</p>
            <p className="text-2xl font-bold text-gray-800">{selectedQs.length}</p>
            <p className="text-xs text-gray-500">المحاور: {axes.length}</p>
          </div>
        </div>
      </div>

      {/* Axes summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 bg-gray-50 border-b">
          <h3 className="font-bold text-gray-900">ملخص المحاور والأسئلة</h3>
        </div>
        {axes.map(ax => {
          const axQ = axisQuestionMap[ax] || [];
          const axW = axisWeights[ax]?.weight || 0;
          const axQSum = r2(axQ.reduce((s, q) => s + (questionWeights[q.id]?.weight || 0), 0));
          const ok = Math.abs(axQSum - axW) < 0.15;
          return (
            <div key={ax} className="border-b last:border-0">
              {/* Axis header */}
              <div className="flex items-center gap-4 px-5 py-4 bg-gray-50/50">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-bold text-gray-900 text-sm">{ax}</h4>
                    <span className="text-xs text-gray-500">{axQ.length} سؤال</span>
                    {!ok && <span className="text-xs text-red-600 font-medium">⚠ مجموع غير صحيح</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 max-w-xs h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, axW)}%` }} />
                    </div>
                    <span className="text-sm font-bold text-blue-700">{axW}%</span>
                  </div>
                </div>
              </div>
              {/* Questions */}
              <div className="px-5 py-3 space-y-2">
                {axQ.map(q => {
                  const qw = questionWeights[q.id]?.weight || 0;
                  const fromAxis = axW > 0 ? r2((qw / axW) * 100) : 0;
                  return (
                    <div key={q.id} className="flex items-center gap-3 text-xs">
                      <span className="text-gray-300">•</span>
                      <span className="flex-1 text-gray-700 line-clamp-1">{q.text_ar}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, fromAxis)}%` }} />
                          </div>
                          <span className="text-gray-400 w-20 text-left">{qw}% كلي / {fromAxis}% محور</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Maturity scale */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <h3 className="font-bold text-gray-900 mb-4 text-sm">جدول التصنيف النهائي المستخدم في التقييم</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MATURITY_LEVELS.map(l => (
            <div key={l.label} className={`rounded-xl border p-3 text-center ${l.color}`}>
              <div className="font-bold text-xl">{l.min}%+</div>
              <div className="text-sm font-medium mt-0.5">{l.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Main render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">جارٍ التحميل...</p>
      </div>
    </div>
  );

  const canNext = [null, canStep1, canStep2, canStep3, canStep4, true][step];
  const nextTitle = [null,
    !canStep1 ? 'اختر سؤالاً على الأقل' : '',
    uncategorized > 0 ? `${uncategorized} سؤال غير مصنف` : '',
    !canStep3 ? `المجموع ${totalAxisW}% — يجب 100%` : '',
    !canStep4 ? `المجموع ${totalQuestionW}% — يجب 100%` : '',
    ''
  ][step];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-l from-blue-700 to-indigo-900 text-white px-6 py-5 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">مدير توزيع الأوزان</h1>
            <p className="text-blue-200 text-sm mt-0.5">{template?.name_ar || 'قالب التقييم'}</p>
          </div>
          <button onClick={() => navigate('/templates')} className="text-blue-200 hover:text-white text-sm flex items-center gap-1.5 transition-colors">
            ← العودة للقوالب
          </button>
        </div>
      </div>

      {/* Step nav */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {STEPS.map((s, idx) => (
              <React.Fragment key={s.num}>
                <button onClick={() => setStep(s.num)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                    step === s.num ? 'bg-blue-600 text-white shadow-sm' :
                    step > s.num  ? 'bg-green-50 text-green-700' : 'text-gray-400 hover:text-gray-600'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step > s.num ? 'bg-green-500 text-white' : step === s.num ? 'bg-white text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                    {step > s.num ? '✓' : s.num}
                  </span>
                  {s.label}
                </button>
                {idx < STEPS.length - 1 && <span className="text-gray-200 mx-0.5">›</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-6">
        {step === 1 && step1}
        {step === 2 && step2}
        {step === 3 && step3}
        {step === 4 && step4}
        {step === 5 && step5}
      </div>

      {/* Footer nav */}
      <div className="sticky bottom-0 bg-white border-t shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
            className="px-5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            ← السابق
          </button>

          {/* Center status */}
          <div className="flex items-center gap-4 text-xs">
            {step === 3 && <span className={`font-bold ${totalColor(totalAxisW)}`}>محاور: {totalAxisW}%</span>}
            {step === 4 && <span className={`font-bold ${totalColor(totalQuestionW)}`}>أسئلة: {totalQuestionW}%</span>}
            {step === 5 && isReady && <span className="text-green-600 font-bold">✓ جاهز للحفظ</span>}
          </div>

          {step < 5 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext}
              title={nextTitle}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2">
              التالي →
              {!canNext && nextTitle && <span className="text-blue-200 text-xs font-normal hidden sm:inline">({nextTitle})</span>}
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving || !isReady}
              className="px-7 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2">
              {saving ? <><span className="animate-spin">⏳</span> جارٍ الحفظ...</> : '💾 حفظ الأوزان'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
