/**
 * Composite Question Component — Relational Architecture
 *
 * بنية البيانات الداخلية (rows):
 *   [{ reference_id: number|null, quantity: number, attributes: { [colKey]: refId } }]
 *
 * بنية الإخراج (emitted via onChange / sent to API as reference_values):
 *   [{ reference_id: number, quantity: number, attributes: [{ attribute_type, reference_id }] }]
 *
 * الجداول المستخدمة: assessment_reference_values + assessment_reference_attributes + reference_dictionary
 */

import React, { useState, useEffect, useMemo } from 'react';
import { referencesService } from '../../services';

// ─── Utilities ───────────────────────────────────────────────────────────────

function normalizeColumns(cols) {
  if (!cols) return [];
  let arr = cols;
  if (typeof arr === 'string') {
    try { arr = JSON.parse(arr); } catch { return []; }
  }
  if (Array.isArray(arr)) {
    return arr.filter(Boolean).map(c => (c && typeof c === 'object' ? c : {}));
  }
  if (arr && typeof arr === 'object') {
    const keys = Object.keys(arr);
    if (keys.every(k => !isNaN(parseInt(k)))) {
      return keys
        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
        .map(k => arr[k])
        .filter(Boolean)
        .map(c => (c && typeof c === 'object' ? c : {}));
    }
    return Object.values(arr).filter(Boolean).map(c => (c && typeof c === 'object' ? c : {}));
  }
  return [];
}

function getRefLabel(ref) {
  return ref ? (ref.name_ar || ref.name_en || '') : '';
}

function makeEmptyRow() {
  return { reference_id: null, quantity: 1, attributes: {}, text_values: {} };
}

/**
 * تحويل صف الحالة → صيغة الإخراج (reference_values[] أو نصوص حرة)
 * يدعم text_values لأعمدة النص الحر (بدون قاموس مراجع)
 */
function rowToOutput(row, attrColsWithIndex, textColsWithIndex) {
  const out = {};
  const quantity = Math.max(1, parseInt(row.quantity, 10) || 1);
  if (row.reference_id != null && row.reference_id !== '') {
    out.reference_id = parseInt(row.reference_id, 10);
    out.quantity = quantity;
    out.attributes = attrColsWithIndex
      .filter(({ columnIndex }) => row.attributes[columnIndex] != null && row.attributes[columnIndex] !== '')
      .map(({ col, columnIndex }) => ({
        attribute_type: col.attribute_type || col.key,
        reference_id: parseInt(row.attributes[columnIndex], 10)
      }))
      .filter(a => !isNaN(a.reference_id));
  }
  if (textColsWithIndex && textColsWithIndex.length > 0 && row.text_values) {
    const tv = {};
    textColsWithIndex.forEach(({ col, columnIndex }) => {
      const v = row.text_values[columnIndex];
      if (v != null && String(v).trim() !== '') tv[col.key || String(columnIndex)] = String(v).trim();
    });
    if (Object.keys(tv).length > 0) out.text_values = tv;
  }
  return out;
}

/**
 * تحويل reference_values[] أو صفوف النص الحر من الـ API → صفوف الحالة
 */
function parseToRows(parsed, attrColsWithIndex, textColsWithIndex) {
  if (!Array.isArray(parsed) || parsed.length === 0) return [makeEmptyRow()];

  const rows = parsed
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const text_values = {};
      if (textColsWithIndex && textColsWithIndex.length > 0 && item.text_values && typeof item.text_values === 'object') {
        textColsWithIndex.forEach(({ col, columnIndex }) => {
          const key = col.key || String(columnIndex);
          const v = item.text_values[key];
          if (v != null) text_values[columnIndex] = String(v);
        });
      }

      if (item.reference_id != null && item.reference_id !== '') {
        const attrs = {};
        (item.attributes || []).forEach((att, i) => {
          if (!att || att.reference_id == null) return;
          const pair = attrColsWithIndex[i];
          if (pair) attrs[pair.columnIndex] = att.reference_id;
        });
        return {
          reference_id: parseInt(item.reference_id, 10),
          quantity: parseInt(item.quantity, 10) || 1,
          attributes: attrs,
          text_values
        };
      }

      return {
        reference_id: null,
        quantity: 1,
        attributes: {},
        text_values
      };
    });

  return rows.length ? rows : [makeEmptyRow()];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CompositeQuestion({ question, answer, onChange, disabled = false }) {
  const [rows, setRows] = useState([makeEmptyRow()]);
  const [refsCache, setRefsCache] = useState({});
  const [refsLoading, setRefsLoading] = useState(false);

  const columns = useMemo(() => normalizeColumns(question?.composite_columns), [
    // اعتماد مستقر على المحتوى لتفادي فقدان الصفات عند تغيّر مرجع الكائن فقط
    typeof question?.composite_columns === 'string'
      ? question.composite_columns
      : JSON.stringify(question?.composite_columns ?? [])
  ]);

  // العمود الأول المرتبط بمرجع = المرجع الرئيسي؛ الباقي = صفات (حسب الترتيب وليس حسب key)
  const { mainRefCol, mainRefIdx } = useMemo(() => {
    const idx = columns.findIndex(c => c.reference_type != null && c.reference_type !== '');
    return {
      mainRefCol: idx >= 0 ? columns[idx] : null,
      mainRefIdx: idx >= 0 ? idx : -1
    };
  }, [columns]);

  // أعمدة الصفات = كل الأعمدة المرتبطة بمرجع ما عدا الأول (حسب الترتيب)
  const attrCols = useMemo(
    () => columns.filter((c, idx) =>
      c.reference_type != null &&
      c.reference_type !== '' &&
      idx !== mainRefIdx
    ),
    [columns, mainRefIdx]
  );

  /** أعمدة الصفات مع فهرس كل عمود في columns — للتخزين عند تكرار key/attribute_type */
  const attrColsWithIndex = useMemo(
    () => columns
      .map((c, idx) => ({ col: c, columnIndex: idx }))
      .filter(({ col, columnIndex }) =>
        col.reference_type != null &&
        col.reference_type !== '' &&
        columnIndex !== mainRefIdx
      ),
    [columns, mainRefIdx]
  );

  /** أعمدة النص الحر (بدون ربط قاموس مراجع): بدون reference_type */
  const textColsWithIndex = useMemo(
    () => columns
      .map((c, idx) => ({ col: c, columnIndex: idx }))
      .filter(({ col }) => !col.reference_type || col.reference_type === ''),
    [columns]
  );

  const hasAttributes = attrCols.length > 0;
  const hasTextColumns = textColsWithIndex.length > 0;
  const showQty = mainRefCol != null;

  // أنواع المراجع المطلوب تحميلها
  const refTypeKey = useMemo(() => {
    const types = [...new Set(
      columns
        .filter(c => c.reference_type != null && c.reference_type !== '')
        .map(c => String(c.reference_type))
    )];
    return types.join(',');
  }, [columns]);

  // ─── تحميل خيارات قاموس المراجع ───────────────────────────────────────────
  useEffect(() => {
    if (!refTypeKey) return;
    let cancelled = false;
    setRefsLoading(true);
    const types = refTypeKey.split(',');
    (async () => {
      const cache = {};
      for (const t of types) {
        try { cache[t] = (await referencesService.getByType(t)) || []; }
        catch { cache[t] = []; }
      }
      if (!cancelled) { setRefsCache(cache); setRefsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [refTypeKey]);

  // ─── تهيئة الصفوف من إجابة موجودة ─────────────────────────────────────────
  // نستخدم JSON.stringify لمقارنة مستقرة (تجنّب إعادة التشغيل عند تغيّر مرجع المصفوفة فقط)
  const answerKey = useMemo(() => {
    const av = answer?.answer_value;
    if (av == null || av === '') return '';
    return typeof av === 'string' ? av : JSON.stringify(av);
  }, [answer?.answer_value]);

  const attrColKeys = useMemo(() => attrColsWithIndex.map(({ columnIndex }) => columnIndex).join(','), [attrColsWithIndex]);
  const textColKeys = useMemo(() => textColsWithIndex.map(({ columnIndex }) => columnIndex).join(','), [textColsWithIndex]);

  useEffect(() => {
    const av = answer?.answer_value;
    if (av == null || av === '') { setRows([makeEmptyRow()]); return; }

    let parsed = av;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch { setRows([makeEmptyRow()]); return; }
    }

    setRows(parseToRows(parsed, attrColsWithIndex, textColsWithIndex));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answerKey, mainRefIdx, attrColKeys, textColKeys]);

  // ─── إصدار التغييرات للأب (تُرسَل كـ reference_values أو صفوف نصوص حرة)
  function emitChange(newRows) {
    if (!onChange) return;
    const output = newRows.map(r => rowToOutput(r, attrColsWithIndex, textColsWithIndex));
    const hasAnyData = output.some(o => o.reference_id != null || (o.text_values && Object.keys(o.text_values).length > 0));
    onChange(hasAnyData ? output : null);
  }

  // ─── معالجات ─────────────────────────────────────────────────────────────
  const updateRow = (idx, updates) => {
    const next = rows.map((r, i) => i === idx ? { ...r, ...updates } : r);
    setRows(next); emitChange(next);
  };

  const updateAttr = (rowIdx, columnIndex, value) => {
    const next = rows.map((r, i) =>
      i === rowIdx ? { ...r, attributes: { ...r.attributes, [columnIndex]: value } } : r
    );
    setRows(next); emitChange(next);
  };

  const updateTextValue = (rowIdx, columnIndex, value) => {
    const next = rows.map((r, i) =>
      i === rowIdx
        ? { ...r, text_values: { ...(r.text_values || {}), [columnIndex]: value } }
        : r
    );
    setRows(next); emitChange(next);
  };

  const addRow = () => {
    const next = [...rows, makeEmptyRow()];
    setRows(next); emitChange(next);
  };

  const removeRow = (idx) => {
    if (rows.length <= 1) return;
    const next = rows.filter((_, i) => i !== idx);
    setRows(next); emitChange(next);
  };

  // ─── مساعدات العرض ───────────────────────────────────────────────────────
  const getOptions = (refType) =>
    refType != null && refType !== '' ? (refsCache[String(refType)] || []) : [];

  const getDisplayLabel = (refType, id) => {
    if (id == null || id === '') return '—';
    const ref = getOptions(refType).find(r => r.id === parseInt(id, 10));
    return ref ? getRefLabel(ref) : String(id);
  };

  // ─── حالة: لا أعمدة ────────────────────────────────────────────────────
  if (columns.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">⚠️ هذا السؤال المركب لا يحتوي على أعمدة محددة</p>
      </div>
    );
  }

  // ─── العرض الرئيسي ───────────────────────────────────────────────────────
  return (
    <div className="composite-question space-y-3" dir="rtl">

      {rows.map((row, rowIdx) => {
        const rowFilled = row.reference_id != null;
        return (
          <div
            key={rowIdx}
            className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white"
          >
            {/* رأس البطاقة */}
            <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b border-gray-100">
              <span className="text-xs font-bold text-gray-400 tracking-widest">
                عنصر #{rowIdx + 1}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeRow(rowIdx)}
                  disabled={rows.length <= 1}
                  className="text-xs text-red-400 hover:text-red-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                >
                  🗑️ حذف
                </button>
              )}
            </div>

            <div className="p-4 space-y-4">
              {/* ── المرجع الرئيسي + الكمية (فقط عند ربط قاموس مراجع) ─────────────────────────── */}
              <div className="flex gap-3 items-end">
                {mainRefCol && (
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {mainRefCol.label_ar || mainRefCol.label_en || 'الاختيار الرئيسي'}
                      <span className="text-red-500 mr-1">*</span>
                    </label>
                    {disabled ? (
                      <div className="px-3 py-2 bg-blue-50 rounded-lg text-sm text-gray-900 font-medium border border-blue-100">
                        {getDisplayLabel(mainRefCol.reference_type, row.reference_id)}
                      </div>
                    ) : (
                      <select
                        value={row.reference_id ?? ''}
                        onChange={e => updateRow(rowIdx, {
                          reference_id: e.target.value ? parseInt(e.target.value, 10) : null,
                          attributes: {}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                        disabled={refsLoading}
                      >
                        <option value="">
                          {refsLoading ? '⏳ جاري التحميل...' : '— اختر من قاموس المراجع —'}
                        </option>
                        {getOptions(mainRefCol.reference_type).map(ref => (
                          <option key={ref.id} value={ref.id}>{getRefLabel(ref)}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {showQty && (
                  <div className="w-24 shrink-0">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">الكمية</label>
                    {disabled ? (
                      <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-center font-bold text-gray-800 border border-gray-100">
                        {row.quantity}
                      </div>
                    ) : (
                      <input
                        type="number"
                        min="1"
                        value={row.quantity ?? 1}
                        onChange={e => {
                          const v = parseInt(e.target.value, 10);
                          updateRow(rowIdx, { quantity: isNaN(v) || v < 1 ? 1 : v });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-center"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* ── أعمدة النص الحر (بدون قاموس مراجع) ─────────────────────────── */}
              {hasTextColumns && (
                <div className="rounded-xl border border-gray-200 bg-gray-50/50">
                  <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-gray-200">
                    <span className="text-gray-600 text-sm">✎</span>
                    <span className="text-sm font-bold text-gray-700">نصوص حرة</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {textColsWithIndex.map(({ col, columnIndex }) => {
                      const val = (row.text_values || {})[columnIndex] ?? '';
                      return (
                        <div key={columnIndex}>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            {col.label_ar || col.label_en || col.key}
                          </label>
                          {disabled ? (
                            <div className="px-3 py-2 bg-white rounded-lg text-sm text-gray-800 border border-gray-100">
                              {val || <span className="text-gray-400">—</span>}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={val}
                              onChange={e => updateTextValue(rowIdx, columnIndex, e.target.value)}
                              placeholder={`أدخل ${col.label_ar || col.label_en || ''}`}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── قسم الصفات (Attributes) — يظهر فقط إذا كانت الصفات محددة ─── */}
              {hasAttributes && (
                <div className={`rounded-xl border ${rowFilled || disabled ? 'border-indigo-200 bg-indigo-50/40' : 'border-dashed border-gray-200 bg-gray-50/50'}`}>
                  <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-indigo-100">
                    <span className="text-indigo-500 text-sm">📎</span>
                    <span className="text-sm font-bold text-indigo-700">الصفات</span>
                    {!rowFilled && !disabled && (
                      <span className="text-xs text-gray-400 font-normal">
                        (اختر المرجع الرئيسي أولاً لتفعيل الصفات)
                      </span>
                    )}
                  </div>
                  <div className={`p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 ${!rowFilled && !disabled ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                    {attrColsWithIndex.map(({ col, columnIndex }) => {
                      const opts = getOptions(col.reference_type);
                      const val = row.attributes[columnIndex];
                      return (
                        <div key={columnIndex}>
                          <label className="block text-xs font-semibold text-indigo-700 mb-1">
                            {col.label_ar || col.label_en || col.key}
                            <span className="text-gray-400 font-normal mr-1">(اختياري)</span>
                          </label>
                          {disabled ? (
                            <div className="px-3 py-2 bg-white rounded-lg text-sm text-gray-800 border border-indigo-100">
                              {val ? getDisplayLabel(col.reference_type, val) : <span className="text-gray-400">—</span>}
                            </div>
                          ) : (
                            <select
                              value={val ?? ''}
                              onChange={e =>
                                updateAttr(
                                  rowIdx,
                                  columnIndex,
                                  e.target.value ? parseInt(e.target.value, 10) : null
                                )
                              }
                              className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 text-sm bg-white hover:bg-indigo-50 transition-colors"
                              disabled={refsLoading || !rowFilled}
                            >
                              <option value="">
                                {refsLoading ? 'جاري التحميل...' : `— ${col.label_ar || 'اختياري'} —`}
                              </option>
                              {opts.map(ref => (
                                <option key={ref.id} value={ref.id}>{getRefLabel(ref)}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* زر إضافة عنصر جديد */}
      {!disabled && (
        <button
          type="button"
          onClick={addRow}
          className="w-full py-3 border-2 border-dashed border-blue-300 text-blue-600 rounded-xl hover:bg-blue-50 hover:border-blue-500 transition-all text-sm font-semibold flex items-center justify-center gap-2"
        >
          <span className="text-lg leading-none">+</span>
          <span>إضافة {mainRefCol?.label_ar || (hasTextColumns ? 'صف' : 'عنصر')} جديد</span>
        </button>
      )}

      {refTypeKey && !disabled && (
        <p className="text-center text-xs text-gray-400">
          💡 الخيارات تُحمَّل من قاموس المراجع المركزي
          {hasAttributes && ' · الصفات اختيارية'}
        </p>
      )}
      {hasTextColumns && !refTypeKey && !disabled && (
        <p className="text-center text-xs text-gray-400">
          ✎ هذا السؤال لا يرتبط بقاموس مراجع — يمكنك إدخال نصوص حرة في كل عمود
        </p>
      )}
    </div>
  );
}
