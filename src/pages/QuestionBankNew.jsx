/**
 * Question Bank - New System
 * بنك الأسئلة - النظام الجديد
 * يدعم: Manual, YesNo, MultiChoice, Composite, Parent/Child
 */

import React, { useState, useEffect, useMemo } from 'react';
import { questionsNewService, categoriesService } from '../services';

const QuestionBankNew = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [categories, setCategories] = useState([]);
  const [parentQuestions, setParentQuestions] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    search: ''
  });

  // أنواع الأسئلة - النظام الجديد
  const questionTypesList = [
    { 
      value: 'Manual', 
      label_ar: 'إدخال يدوي',
      icon: '✎',
      color: 'orange',
      description: 'سؤال يتطلب إدخال قيمة من المستخدم',
      example: 'مثال: "كم عدد الحوادث الأمنية في السنة؟"'
    },
    { 
      value: 'YesNo', 
      label_ar: 'نعم / لا',
      icon: '✓✗',
      color: 'green',
      description: 'سؤال بسيط بإجابة نعم أو لا',
      example: 'مثال: "هل يوجد قسم للأمن السيبراني؟"'
    },
    { 
      value: 'MultiChoice', 
      label_ar: 'اختيار واحد',
      icon: '○',
      color: 'purple',
      description: 'سؤال بخيار واحد (اختيار من متعدد)',
      example: 'مثال: "ما مستوى النسخ الاحتياطي؟"'
    },
    { 
      value: 'MultiSelect', 
      label_ar: 'اختيار أكثر من إجابة',
      icon: '☑',
      color: 'teal',
      description: 'سؤال يمكن اختيار أكثر من خيار مع إمكانية إضافة خيار "أخرى"',
      example: 'مثال: "ما الأدوات المستخدمة؟" مع خيارات أخرى حسب الحاجة'
    },
    { 
      value: 'Composite', 
      label_ar: 'سؤال مركب',
      icon: '📋',
      color: 'indigo',
      description: 'سؤال بجدول ديناميكي (مثل قائمة مراكز البيانات)',
      example: 'مثال: "اذكر مراكز البيانات" → جدول بأعمدة متعددة'
    },
  ];

  const [formData, setFormData] = useState({
    text_en: '',
    text_ar: '',
    question_type: '',
    parent_question_id: null,
    trigger_answer_value: '',
    composite_columns: [],
    options: {},
    weight: 1,
    category_id: null,
    category: '' // Legacy support
  });

  const [formErrors, setFormErrors] = useState({});
  const [optionInput, setOptionInput] = useState({ name: '', value: '' });
  /** للمultiSelect: خيار صحيح (1) أو خطأ (0) — يُستخدم عند إضافة خيار جديد */
  const [optionInputCorrect, setOptionInputCorrect] = useState(true);
  const [compositeColumnInput, setCompositeColumnInput] = useState({
    key: '', label_en: '', label_ar: '', reference_type: '', input_type: 'text', attribute_type: ''
  });
  /** عند إضافة صفة: index العمود الرئيسي الذي نضيف له صفة، أو null لو نضيف عموداً رئيسياً */
  const [addingAttributeForMainIndex, setAddingAttributeForMainIndex] = useState(null);

  useEffect(() => {
    fetchQuestions();
    fetchCategories();
  }, [filters]);

  useEffect(() => {
    if (formData.question_type !== 'Composite') {
      setFormData(prev => ({ ...prev, composite_columns: [] }));
    }
    if (formData.question_type !== 'MultiChoice' && formData.question_type !== 'MultiSelect') {
      setFormData(prev => ({ ...prev, options: {} }));
    }
    if (!formData.parent_question_id) {
      setFormData(prev => ({ ...prev, trigger_answer_value: '' }));
    }
  }, [formData.question_type, formData.parent_question_id]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const data = await questionsNewService.getAll(filters);
      setQuestions(data);

      // قائمة مسطحة من الـ API — قد تكون result.rows (كل الأسئلة) أو جذوراً مع child_questions
      const flatList = Array.isArray(data) ? data : [];
      function flattenNested(list) {
        const out = [];
        list.forEach(q => {
          if (!q) return;
          out.push(q);
          flattenNested(q.child_questions || []).forEach(c => out.push(c));
        });
        return out;
      }
      const allQuestions = flatList.some(q => q.child_questions?.length > 0)
        ? flattenNested(flatList)
        : flatList;

      // ترتيب هرمي (أب ثم أبناؤه) مع عمق لكل سؤال — لاستخدامه في قائمة «السؤال الأب»
      const idToQuestion = new Map(allQuestions.map(q => [q.id, q]));
      const orderedWithDepth = [];
      function addChildren(parentId, depth) {
        allQuestions
          .filter(q => (q.parent_question_id || null) === parentId)
          .forEach(q => {
            orderedWithDepth.push({ ...q, _depth: depth });
            addChildren(q.id, depth + 1);
          });
      }
      addChildren(null, 0);

      setParentQuestions(orderedWithDepth);
    } catch (error) {
      console.error('Error fetching questions:', error);
      alert('فشل تحميل الأسئلة: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  /** خيارات «السؤال الأب»: كل الأسئلة ما عدا السؤال الحالي عند التحرير ونسله (تفادي دورات) */
  const parentOptions = useMemo(() => {
    const list = parentQuestions || [];
    if (!editingQuestion?.id) return list;
    const descendantIds = new Set();
    function collectDescendants(pid) {
      list.filter(q => q.parent_question_id === pid).forEach(q => {
        descendantIds.add(q.id);
        collectDescendants(q.id);
      });
    }
    collectDescendants(editingQuestion.id);
    return list.filter(q => q.id !== editingQuestion.id && !descendantIds.has(q.id));
  }, [parentQuestions, editingQuestion?.id]);

  const fetchCategories = async () => {
    try {
      const data = await categoriesService.getAll({ is_active: true });
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to old method if categories service fails
      try {
        const oldData = await questionsNewService.getCategories();
        setCategories(oldData.map(cat => ({
          id: cat.id || null,
          name_en: cat.name_en || cat.category,
          name_ar: cat.name_ar || cat.category,
          category: cat.category // Legacy
        })));
      } catch (fallbackError) {
        console.error('Fallback categories fetch failed:', fallbackError);
      }
    }
  };

  const validateStep = (step) => {
    const errors = {};
    
    if (step === 1) {
      if (!formData.question_type) {
        errors.question_type = 'يجب اختيار نوع السؤال';
      }
    }
    
    if (step === 2) {
      if (!formData.text_ar?.trim()) {
        errors.text_ar = 'نص السؤال بالعربية مطلوب';
      }
      if (!formData.text_en?.trim()) {
        errors.text_en = 'نص السؤال بالإنجليزية مطلوب';
      }
    }
    
    if (step === 3) {
      if (formData.question_type === 'Composite' && (!formData.composite_columns || formData.composite_columns.length === 0)) {
        errors.composite_columns = 'يجب إضافة عمود واحد على الأقل للأسئلة المركبة';
      }
      if (formData.question_type === 'MultiChoice') {
        const opts = formData.options && typeof formData.options === 'object' && !Array.isArray(formData.options);
        const hasOptions = opts && Object.keys(formData.options).filter(k => k !== '__other_options').length > 0;
        if (!hasOptions) {
          errors.options = 'يجب إضافة خيار واحد على الأقل لسؤال الاختيار الواحد';
        }
      }
      if (formData.question_type === 'MultiSelect') {
        const opts = formData.options && typeof formData.options === 'object' && !Array.isArray(formData.options);
        const mainKeys = opts ? Object.keys(formData.options).filter(k => k !== '__other_options' && k !== '__otherOptionKey') : [];
        const correctCount = mainKeys.filter(k => formData.options[k] === 1 || formData.options[k] === true).length;
        if (mainKeys.length === 0) {
          errors.options = 'يجب إضافة خيار واحد على الأقل. يمكنك تفعيل «الإضافة المتعددة» لأي خيار من القائمة.';
        } else if (correctCount === 0) {
          errors.options = 'يجب وجود خيار صحيح واحد على الأقل (علّم أحد الخيارات كـ «خيار صحيح»)';
        }
      }
      if (formData.parent_question_id && !formData.trigger_answer_value) {
        errors.trigger_answer_value = 'يجب تحديد قيمة التفعيل للأسئلة الفرعية';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setSaving(true);
    try {
      const mainOptionKeys = formData.options && Object.keys(formData.options).filter(k => k !== '__other_options' && k !== '__otherOptionKey');
      const optionsForSubmit = (formData.question_type === 'MultiChoice' || formData.question_type === 'MultiSelect') && formData.options && mainOptionKeys.length > 0
        ? formData.options
        : null;
      const questionData = {
        ...formData,
        composite_columns: formData.question_type === 'Composite' && formData.composite_columns.length > 0
          ? formData.composite_columns
          : null,
        options: optionsForSubmit,
        parent_question_id: formData.parent_question_id || null,
        trigger_answer_value: formData.trigger_answer_value || null,
        category_id: formData.category_id || null,
        category: formData.category || null // Legacy support
      };

      if (editingQuestion) {
        await questionsNewService.update(editingQuestion.id, questionData);
        alert('تم تحديث السؤال بنجاح');
      } else {
        await questionsNewService.create(questionData);
        alert('تم إضافة السؤال بنجاح');
      }
      
      setShowModal(false);
      resetForm();
      fetchQuestions();
    } catch (error) {
      console.error('Error saving question:', error);
      setFormErrors({ submit: error.response?.data?.message || 'فشل في حفظ السؤال' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    let opts = {};
    if (question.options) {
      try {
        opts = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
        if (!opts || Array.isArray(opts)) opts = {};
        if (opts.__other_options) {
          const { __other_options, ...rest } = opts;
          opts = rest;
        }
        // للمultiSelect: تحويل نقاط قديمة إلى صحيح (1) / خطأ (0) للعرض
        if (question.question_type === 'MultiSelect') {
          const converted = {};
          for (const [k, v] of Object.entries(opts)) {
            if (k === '__otherOptionKey') { converted[k] = v; continue; }
            converted[k] = (v === 1 || v === true || (typeof v === 'number' && v > 0)) ? 1 : 0;
          }
          opts = converted;
        }
      } catch { opts = {}; }
    }
    setFormData({
      text_en: question.text_en || '',
      text_ar: question.text_ar || '',
      question_type: question.question_type || '',
      parent_question_id: question.parent_question_id || null,
      trigger_answer_value: question.trigger_answer_value || '',
      composite_columns: question.composite_columns 
        ? (typeof question.composite_columns === 'string' 
            ? JSON.parse(question.composite_columns) 
            : question.composite_columns)
        : [],
      options: opts,
      weight: question.weight || 1,
      category_id: question.category_id || null,
      category: question.category_name_ar || question.category_name_en || question.category_legacy || ''
    });
    setCurrentStep(1);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    
    try {
      await questionsNewService.delete(id);
      alert('تم حذف السؤال بنجاح');
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      alert(error.response?.data?.message || 'فشل في حذف السؤال');
    }
  };

  const resetForm = () => {
      setFormData({
        text_en: '',
        text_ar: '',
        question_type: '',
        parent_question_id: null,
        trigger_answer_value: '',
        composite_columns: [],
        options: {},
        weight: 1,
        category_id: null,
        category: ''
      });
    setEditingQuestion(null);
    setFormErrors({});
    setOptionInput({ name: '', value: '' });
    setOptionInputCorrect(true);
    setCompositeColumnInput({ key: '', label_en: '', label_ar: '', reference_type: '', input_type: 'text', attribute_type: '' });
    setCurrentStep(1);
    setAddingAttributeForMainIndex(null);
  };

  const addCompositeColumn = (insertAfterIndex = null) => {
    if (!compositeColumnInput.key.trim() || !compositeColumnInput.label_ar.trim()) {
      alert('يرجى إدخال مفتاح العمود والاسم بالعربية');
      return;
    }

    const isAttribute = insertAfterIndex !== null;
    const refType = compositeColumnInput.reference_type?.trim();
    if (isAttribute && !refType) {
      alert('صفة العمود يجب أن تكون مرتبطة بقاموس مراجع — اختر نوع المرجع');
      return;
    }

    const col = {
      key: compositeColumnInput.key,
      label_en: compositeColumnInput.label_en || compositeColumnInput.key,
      label_ar: compositeColumnInput.label_ar,
      input_type: compositeColumnInput.input_type || 'text'
    };
    if (refType) {
      col.reference_type = refType;
      col.attribute_type = compositeColumnInput.attribute_type?.trim() || compositeColumnInput.key;
    }

    setFormData(prev => {
      let nextColumns;
      if (insertAfterIndex !== null && insertAfterIndex >= 0 && insertAfterIndex < prev.composite_columns.length) {
        nextColumns = [
          ...prev.composite_columns.slice(0, insertAfterIndex + 1),
          col,
          ...prev.composite_columns.slice(insertAfterIndex + 1)
        ];
      } else {
        nextColumns = [...prev.composite_columns, col];
      }
      return { ...prev, composite_columns: nextColumns };
    });

    setCompositeColumnInput({ key: '', label_en: '', label_ar: '', reference_type: '', input_type: 'text', attribute_type: '' });
    setAddingAttributeForMainIndex(null);
  };

  const removeCompositeColumn = (index) => {
    setFormData(prev => ({
      ...prev,
      composite_columns: prev.composite_columns.filter((_, i) => i !== index)
    }));
  };

  const addOption = () => {
    const label = (optionInput.name || '').trim();
    if (!label) {
      alert('يرجى إدخال نص الخيار');
      return;
    }
    if (formData.question_type === 'MultiSelect') {
      // MultiSelect: خيار صحيح (1) أو خطأ (0) — الدرجة تُوزَّع على الصحيحة فقط
      setFormData(prev => ({
        ...prev,
        options: { ...prev.options, [label]: optionInputCorrect ? 1 : 0 }
      }));
      setOptionInput({ name: '', value: '' });
      setOptionInputCorrect(true);
    } else {
      const points = Math.max(0, parseFloat(optionInput.value) || 0);
      setFormData(prev => ({
        ...prev,
        options: { ...prev.options, [label]: points }
      }));
      setOptionInput({ name: '', value: '' });
    }
  };

  const removeOption = (label) => {
    setFormData(prev => {
      const next = { ...prev.options };
      delete next[label];
      if (next.__otherOptionKey === label) delete next.__otherOptionKey;
      return { ...prev, options: next };
    });
  };

  /** تعيين أي خيار يفعّل «الإضافة المتعددة» عند الإجابة (خيار أخرى) — خيار واحد فقط */
  const setOtherOptionKey = (label) => {
    setFormData(prev => {
      const next = { ...prev.options };
      if (next.__otherOptionKey === label) {
        delete next.__otherOptionKey;
      } else {
        next.__otherOptionKey = label;
      }
      return { ...prev, options: next };
    });
  };

  /** للمultiSelect: تبديل خيار بين صحيح (1) وخطأ (0) */
  const toggleOptionCorrect = (label) => {
    setFormData(prev => {
      const next = { ...prev.options };
      const v = next[label];
      next[label] = (v === 1 || v === true) ? 0 : 1;
      return { ...prev, options: next };
    });
  };

  /** حساب إحصائيات الخيارات للعرض (MultiChoice: نسب من الأعلى، MultiSelect: عدد الصحيحة ونسبة كل صحيح) */
  const getOptionsStats = () => {
    const opts = formData.options || {};
    const mainKeys = Object.keys(opts).filter(k => k !== '__other_options' && k !== '__otherOptionKey');
    if (mainKeys.length === 0) return null;
    if (formData.question_type === 'MultiSelect') {
      const correctCount = mainKeys.filter(k => opts[k] === 1 || opts[k] === true).length;
      const percentPerCorrect = correctCount > 0 ? (100 / correctCount) : 0;
      return { type: 'multiselect', correctCount, percentPerCorrect, mainKeys, opts };
    }
    if (formData.question_type === 'MultiChoice') {
      const values = mainKeys.map(k => Number(opts[k])).filter(n => !isNaN(n));
      const maxP = values.length ? Math.max(...values) : 0;
      const minP = values.length ? Math.min(...values) : 0;
      const minPercent = maxP > 0 ? (minP / maxP) * 100 : 0;
      return { type: 'multichoice', maxP, minP, minPercent, mainKeys, opts };
    }
    return null;
  };

  const getTypeConfig = (type) => questionTypesList.find(t => t.value === type);

  return (
    <div dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <span className="text-5xl">🏦</span>
                بنك الأسئلة - النظام الجديد
              </h1>
              <p className="text-gray-600 text-lg">
                أنشئ أسئلة ذكية مع دعم الأسئلة المركبة والفرعية
              </p>
            </div>
            
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              <span className="text-2xl">+</span>
              <span>إضافة سؤال جديد</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
            <div className="bg-white rounded-xl shadow p-4 text-center border-t-4 border-blue-500">
              <div className="text-3xl font-bold text-blue-600">{questions.length}</div>
              <div className="text-sm text-gray-600 mt-1">إجمالي الأسئلة</div>
            </div>
            
            <div className="bg-white rounded-xl shadow p-4 text-center border-t-4 border-green-500">
              <div className="text-3xl font-bold text-green-600">
                {questions.filter(q => q.question_type === 'YesNo').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">✓✗ نعم/لا</div>
            </div>
            
            <div className="bg-white rounded-xl shadow p-4 text-center border-t-4 border-purple-500">
              <div className="text-3xl font-bold text-purple-600">
                {questions.filter(q => q.question_type === 'MultiChoice').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">☑ اختيار متعدد</div>
            </div>
            
            <div className="bg-white rounded-xl shadow p-4 text-center border-t-4 border-orange-500">
              <div className="text-3xl font-bold text-orange-600">
                {questions.filter(q => q.question_type === 'Manual').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">✎ إدخال يدوي</div>
            </div>

            <div className="bg-white rounded-xl shadow p-4 text-center border-t-4 border-indigo-500">
              <div className="text-3xl font-bold text-indigo-600">
                {questions.filter(q => q.question_type === 'Composite').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">📋 مركب</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center border-t-4 border-teal-500">
              <div className="text-3xl font-bold text-teal-600">
                {questions.filter(q => q.question_type === 'MultiSelect').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">☑ اختيار أكثر من إجابة</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">🔍 البحث</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="ابحث في الأسئلة..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع السؤال</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">جميع الأنواع</option>
                {questionTypesList.map(type => (
                  <option key={type.value} value={type.value}>{type.icon} {type.label_ar}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">التصنيف</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">جميع التصنيفات</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name_ar || cat.category} {cat.name_en && cat.name_en !== cat.name_ar ? `(${cat.name_en})` : ''}
                    {cat.count !== undefined && ` (${cat.count})`}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ type: '', category: '', search: '' })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                ↺ إعادة تعيين
              </button>
            </div>
          </div>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg">جارٍ تحميل الأسئلة...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🏦</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">بنك الأسئلة فارغ</h3>
            <p className="text-gray-600 mb-6">ابدأ بإنشاء السؤال الأول</p>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg"
            >
              + إضافة السؤال الأول
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map(question => {
              const typeConfig = getTypeConfig(question.question_type);
              
              return (
                <div
                  key={question.id}
                  className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow p-6"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${typeConfig?.color || 'gray'}-100 text-${typeConfig?.color || 'gray'}-700`}>
                          {typeConfig?.icon} {typeConfig?.label_ar}
                        </span>
                        
                        {question.category && (
                          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                            {question.category}
                          </span>
                        )}
                        
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                          ⭐ {question.weight} نقطة
                        </span>

                        {question.parent_question_id && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                            ↳ سؤال فرعي
                          </span>
                        )}

                        {question.question_type === 'Composite' && (
                          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                            📋 {question.composite_columns?.length || 0} أعمدة
                          </span>
                        )}
                      </div>
                      
                      {/* Question Code */}
                      <div className="text-sm text-gray-500 mb-1">
                        السؤال #{question.id}
                      </div>
                      
                      {/* Question Text */}
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {question.text_ar}
                      </h3>
                      <p className="text-gray-500 text-sm mb-3">{question.text_en}</p>
                      
                      {/* Metadata */}
                      {question.composite_columns && question.composite_columns.length > 0 && (
                        <div className="mt-3 p-3 bg-indigo-50 rounded-lg">
                          <p className="text-sm font-medium text-indigo-900 mb-2">الأعمدة:</p>
                          <div className="flex flex-wrap gap-2">
                            {question.composite_columns.map((col, idx) => (
                              <span key={idx} className="px-2 py-1 bg-white rounded text-xs">
                                {col.label_ar || col.key}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2 mr-4">
                      <button
                        onClick={() => handleEdit(question)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                      >
                        ✎ تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(question.id)}
                        className="px-4 py-2 border border-red-300 rounded-lg hover:bg-red-50 text-red-600"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============ MODAL - معالج إضافة السؤال ============ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden" dir="rtl">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-l from-blue-600 to-blue-700 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">
                    {editingQuestion ? '✎ تعديل السؤال' : '➕ إضافة سؤال جديد'}
                  </h2>
                  <p className="text-blue-100 mt-1">اتبع الخطوات لإنشاء سؤال للتقييم</p>
                </div>
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="text-white hover:text-blue-200 text-3xl leading-none"
                >
                  ×
                </button>
              </div>
              
              {/* Progress Steps */}
              <div className="flex items-center justify-center mt-6 gap-4">
                {[
                  { num: 1, label: 'اختر النوع' },
                  { num: 2, label: 'اكتب السؤال' },
                  { num: 3, label: 'الإعدادات' },
                  { num: 4, label: 'مراجعة وحفظ' },
                ].map((step, idx) => (
                  <React.Fragment key={step.num}>
                    <div className={`flex flex-col items-center ${currentStep >= step.num ? 'text-white' : 'text-blue-300'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                        ${currentStep >= step.num ? 'bg-white text-blue-600' : 'bg-blue-500 text-blue-200'}`}>
                        {currentStep > step.num ? '✓' : step.num}
                      </div>
                      <span className="text-sm mt-1 whitespace-nowrap">{step.label}</span>
                    </div>
                    {idx < 3 && (
                      <div className={`flex-1 h-1 rounded ${currentStep > step.num ? 'bg-white' : 'bg-blue-500'}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 280px)' }}>
              
              {/* Error Display */}
              {formErrors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                  <strong>خطأ:</strong> {formErrors.submit}
                </div>
              )}

              {/* ========== الخطوة 1: اختيار النوع ========== */}
              {currentStep === 1 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">الخطوة 1: اختر نوع السؤال</h3>
                  <p className="text-gray-600 mb-6">حدد كيف تريد أن يعمل هذا السؤال في التقييم — انقر مرتين على نوع للانتقال مباشرة للخطوة التالية</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {questionTypesList.map(type => (
                      <div
                        key={type.value}
                        onClick={() => setFormData({ ...formData, question_type: type.value })}
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          setFormData(prev => ({ ...prev, question_type: type.value }));
                          setCurrentStep(2);
                        }}
                        className={`cursor-pointer rounded-xl border-2 p-6 transition-all hover:shadow-lg
                          ${formData.question_type === type.value 
                            ? `border-${type.color}-500 bg-${type.color}-50 shadow-md` 
                            : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`text-4xl p-3 rounded-xl bg-${type.color}-100`}>
                            {type.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-lg text-gray-900 mb-1">{type.label_ar}</h4>
                            <p className="text-gray-600 text-sm mb-2">{type.description}</p>
                            <p className="text-gray-500 text-xs italic">{type.example}</p>
                          </div>
                          {formData.question_type === type.value && (
                            <span className={`text-${type.color}-600 text-2xl`}>✓</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {formErrors.question_type && (
                    <p className="text-red-600 mt-4">{formErrors.question_type}</p>
                  )}
                </div>
              )}

              {/* ========== الخطوة 2: كتابة نص السؤال ========== */}
              {currentStep === 2 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">الخطوة 2: اكتب نص السؤال</h3>
                  <p className="text-gray-600 mb-6">اكتب السؤال بوضوح باللغتين العربية والإنجليزية</p>
                  
                  <div className="space-y-6">
                    {/* Code */}
                    {/* Arabic Question */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        نص السؤال بالعربية <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.text_ar}
                        onChange={(e) => setFormData({ ...formData, text_ar: e.target.value })}
                        rows={3}
                        className={`w-full px-4 py-3 border-2 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                          ${formErrors.text_ar ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="مثال: هل لديك مركز بيانات؟"
                      />
                      {formErrors.text_ar && (
                        <p className="text-red-600 text-sm mt-1">{formErrors.text_ar}</p>
                      )}
                    </div>
                    
                    {/* English Question */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        نص السؤال بالإنجليزية <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.text_en}
                        onChange={(e) => setFormData({ ...formData, text_en: e.target.value })}
                        rows={3}
                        dir="ltr"
                        className={`w-full px-4 py-3 border-2 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left
                          ${formErrors.text_en ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Example: Do you have a data center?"
                      />
                      {formErrors.text_en && (
                        <p className="text-red-600 text-sm mt-1">{formErrors.text_en}</p>
                      )}
                    </div>
                    
                    {/* Category & Weight */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          التصنيف
                          <button
                            type="button"
                            onClick={() => window.open('/categories', '_blank')}
                            className="text-xs text-blue-600 hover:text-blue-800 mr-2"
                            title="إدارة الفئات"
                          >
                            (إدارة الفئات)
                          </button>
                        </label>
                        <select
                          value={formData.category_id || ''}
                          onChange={(e) => {
                            const selectedId = e.target.value ? parseInt(e.target.value) : null;
                            const selectedCategory = categories.find(c => c.id === selectedId);
                            setFormData({ 
                              ...formData, 
                              category_id: selectedId,
                              category: selectedCategory ? (selectedCategory.name_ar || selectedCategory.name_en) : ''
                            });
                          }}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">-- اختر التصنيف --</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name_ar || cat.name_en || cat.category}
                              {cat.name_en && cat.name_en !== cat.name_ar ? ` (${cat.name_en})` : ''}
                            </option>
                          ))}
                        </select>
                        {categories.length === 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            لا توجد فئات متاحة. <a href="/categories" className="text-blue-600 hover:underline">أنشئ فئة جديدة</a>
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          النقاط (الوزن) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={formData.weight}
                          onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 1 })}
                          min="1"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========== الخطوة 3: الإعدادات حسب النوع ========== */}
              {currentStep === 3 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">الخطوة 3: إعدادات السؤال</h3>
                  <p className="text-gray-600 mb-6">حدد الإعدادات الإضافية حسب نوع السؤال</p>
                  
                  {/* MultiChoice Options */}
                  {formData.question_type === 'MultiChoice' && (
                    <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
                      <h4 className="font-bold text-purple-900 mb-4">☑ خيارات الاختيار المفرد (اختيار واحد)</h4>
                      <p className="text-purple-700 mb-4">أضف الخيارات والنقاط لكل خيار. الخيار ذو النقاط الأعلى يعتبر الأفضل (100%)</p>
                      
                      {formData.options && Object.keys(formData.options).filter(k => k !== '__other_options' && k !== '__otherOptionKey').length > 0 && (
                        <>
                          <div className="space-y-2 mb-4">
                            {(() => {
                              const stats = getOptionsStats();
                              const maxP = stats?.maxP ?? 0;
                              return Object.entries(formData.options).filter(([k]) => k !== '__other_options' && k !== '__otherOptionKey').map(([label, points]) => {
                                const pct = maxP > 0 ? Math.round((Number(points) / maxP) * 100) : 0;
                                const isBest = maxP > 0 && Number(points) === maxP;
                                return (
                                  <div key={label} className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-purple-200">
                                    <span className="text-purple-600">○</span>
                                    <span className="flex-1 font-medium">{label}</span>
                                    <span className="text-purple-700 text-sm">({points} نقطة)</span>
                                    <span className={`text-sm font-bold ${isBest ? 'text-green-600' : 'text-gray-500'}`}>
                                      {pct}% {isBest && '(الأفضل)'}
                                    </span>
                                    <label className="flex items-center gap-2 cursor-pointer shrink-0">
                                      <input
                                        type="checkbox"
                                        checked={formData.options.__otherOptionKey === label}
                                        onChange={() => setOtherOptionKey(label)}
                                        className="rounded text-amber-600"
                                      />
                                      <span className="text-sm text-amber-800">إضافة نص خارجي (أخرى)</span>
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => removeOption(label)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      ✗
                                    </button>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                          {(() => {
                            const stats = getOptionsStats();
                            if (!stats || stats.type !== 'multichoice') return null;
                            return (
                              <div className="mb-4 p-4 bg-white border-2 border-purple-200 rounded-xl">
                                <p className="font-bold text-purple-900 mb-2">📊 مرجع احتساب الدرجة لمدخل البيانات</p>
                                <ul className="text-sm text-purple-800 space-y-1 list-disc list-inside">
                                  <li>النسبة المئوية لكل خيار = (نقاط الخيار ÷ أعلى نقاط) × 100</li>
                                  <li><strong>الحد الأعلى الممكن للدرجة: 100%</strong> (عند اختيار الخيار الأفضل)</li>
                                  <li><strong>الحد الأدنى الممكن: {stats.minPercent.toFixed(0)}%</strong> (عند اختيار الخيار الأضعف)</li>
                                  <li>الدرجة النهائية للسؤال = نسبة الخيار المختار × وزن السؤال</li>
                                </ul>
                              </div>
                            );
                          })()}
                        </>
                      )}
                      
                      {formErrors.options && (
                        <p className="text-red-600 text-sm mb-3">{formErrors.options}</p>
                      )}
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={optionInput.name}
                            onChange={(e) => setOptionInput({ ...optionInput, name: e.target.value })}
                            placeholder="نص الخيار (مثال: ممتاز)"
                            className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                          />
                          <input
                            type="number"
                            value={optionInput.value}
                            onChange={(e) => setOptionInput({ ...optionInput, value: e.target.value })}
                            placeholder="النقاط"
                            min="0"
                            step="0.5"
                            className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={addOption}
                          className="w-full px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium"
                        >
                          + إضافة خيار
                        </button>
                      </div>
                      
                      <div className="mt-4 p-4 bg-purple-100 rounded-lg">
                        <p className="text-purple-800 text-sm">
                          💡 الخيار ذو النقاط الأعلى = 100%. باقي الخيارات تناسبياً. مثال: "ممتاز" 10 نقاط، "جيد" 5، "ضعيف" 0 → النسب 100%، 50%، 0%. يمكنك تفعيل «إضافة نص خارجي (أخرى)» لخيار واحد.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* MultiSelect: خيارات صحيحة فقط تحصل على نسبة من 100% */}
                  {formData.question_type === 'MultiSelect' && (
                    <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-6 mb-6">
                      <h4 className="font-bold text-teal-900 mb-4">☑ خيارات اختيار أكثر من إجابة</h4>
                      <p className="text-teal-700 mb-4">أضف الخيارات وحدّد أيها صحيحة. الدرجة الكلية للسؤال تُوزَّع على الخيارات الصحيحة فقط بالتساوي.</p>
                      
                      {formData.options && Object.keys(formData.options).filter(k => k !== '__other_options' && k !== '__otherOptionKey').length > 0 && (
                        <>
                          <div className="space-y-2 mb-4">
                            {(() => {
                              const stats = getOptionsStats();
                              const correctCount = stats?.correctCount ?? 0;
                              const percentPerCorrect = stats?.percentPerCorrect ?? 0;
                              return Object.entries(formData.options)
                                .filter(([k]) => k !== '__other_options' && k !== '__otherOptionKey')
                                .map(([label, val]) => {
                                  const isCorrect = val === 1 || val === true;
                                  const pct = isCorrect ? percentPerCorrect : 0;
                                  return (
                                    <div key={label} className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-teal-200">
                                      <span className="text-teal-600">☑</span>
                                      <span className="flex-1 font-medium">{label}</span>
                                      <label className="flex items-center gap-2 cursor-pointer shrink-0">
                                        <input
                                          type="checkbox"
                                          checked={isCorrect}
                                          onChange={() => toggleOptionCorrect(label)}
                                          className="rounded text-teal-600"
                                        />
                                        <span className="text-sm font-medium text-teal-800">خيار صحيح</span>
                                      </label>
                                      <span className={`text-sm font-bold ${isCorrect ? 'text-green-600' : 'text-gray-400'}`}>
                                        {isCorrect ? `${percentPerCorrect.toFixed(1)}%` : '0%'}
                                      </span>
                                      <label className="flex items-center gap-2 cursor-pointer shrink-0">
                                        <input
                                          type="checkbox"
                                          checked={formData.options.__otherOptionKey === label}
                                          onChange={() => setOtherOptionKey(label)}
                                          className="rounded text-amber-600"
                                        />
                                        <span className="text-sm text-amber-800">تفعيل الإضافة المتعددة لهذا الخيار</span>
                                      </label>
                                      <button type="button" onClick={() => removeOption(label)} className="text-red-500 hover:text-red-700">✗</button>
                                    </div>
                                  );
                                });
                            })()}
                          </div>
                          {(() => {
                            const stats = getOptionsStats();
                            if (!stats || stats.type !== 'multiselect') return null;
                            const { correctCount, percentPerCorrect } = stats;
                            return (
                              <div className="mb-4 p-4 bg-white border-2 border-teal-200 rounded-xl">
                                <p className="font-bold text-teal-900 mb-2">📊 مرجع احتساب الدرجة لمدخل البيانات</p>
                                <ul className="text-sm text-teal-800 space-y-1 list-disc list-inside">
                                  <li>عدد الخيارات الصحيحة: <strong>{correctCount}</strong> → كل خيار صحيح = <strong>{percentPerCorrect.toFixed(1)}%</strong></li>
                                  <li><strong>الحد الأعلى الممكن للدرجة: 100%</strong> (عند اختيار كل الخيارات الصحيحة)</li>
                                  <li><strong>الحد الأدنى الممكن: 0%</strong> (عند عدم اختيار أي خيار صحيح)</li>
                                  <li>الدرجة النهائية = (عدد الخيارات الصحيحة المختارة ÷ إجمالي الخيارات الصحيحة) × وزن السؤال</li>
                                </ul>
                              </div>
                            );
                          })()}
                        </>
                      )}
                      
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <input
                            type="text"
                            value={optionInput.name}
                            onChange={(e) => setOptionInput({ ...optionInput, name: e.target.value })}
                            placeholder="نص الخيار"
                            className="flex-1 min-w-[200px] px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500"
                          />
                          <label className="flex items-center gap-2 cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={optionInputCorrect}
                              onChange={(e) => setOptionInputCorrect(e.target.checked)}
                              className="rounded text-teal-600"
                            />
                            <span className="text-sm font-medium text-teal-800">خيار صحيح</span>
                          </label>
                        </div>
                        <button type="button" onClick={addOption} className="w-full px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-medium">
                          + إضافة خيار
                        </button>
                      </div>
                      <div className="mt-4 p-4 bg-teal-100 rounded-lg">
                        <p className="text-teal-800 text-sm">
                          💡 فقط الخيارات المُعلَّمة «خيار صحيح» تدخل في احتساب الدرجة. 100% تُوزَّع بالتساوي عليها. عند الإجابة، إذا اختار المستخدم الخيار الذي فعّلت له «الإضافة المتعددة» ستظهر له حقول لإضافة عدة إجابات نصية.
                        </p>
                      </div>
                      {formErrors.options && <p className="text-red-600 text-sm mt-2">{formErrors.options}</p>}
                    </div>
                  )}
                  
                  {/* Composite Columns */}
                  {formData.question_type === 'Composite' && (
                    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6 mb-6">
                      <h4 className="font-bold text-indigo-900 mb-1">📋 هيكل السؤال المركب</h4>
                      <p className="text-indigo-700 text-sm mb-4">
                        أضف عموداً رئيسياً أولاً، ثم استخدم «إضافة عامود صفة» لربط صفات بذلك العمود.
                      </p>

                      {/* قائمة الأعمدة الحالية */}
                      {formData.composite_columns.length > 0 && (() => {
                        const firstRefIdx = formData.composite_columns.findIndex(c => c.reference_type);
                        return (
                          <div className="space-y-2 mb-4">
                            {formData.composite_columns.map((col, index) => {
                              const isMainRef = index === firstRefIdx && col.reference_type;
                              const isAttr = col.reference_type && !isMainRef;
                              return (
                                <div key={index} className={`flex flex-wrap items-center gap-2 gap-y-2 bg-white p-3 rounded-lg border ${isMainRef ? 'border-blue-300 ring-1 ring-blue-200' : isAttr ? 'border-indigo-200' : 'border-gray-200'}`}>
                                  <span className="text-base">
                                    {isMainRef ? '🔑' : isAttr ? '📎' : '📝'}
                                  </span>
                                  <span className="flex-1 min-w-0 font-medium text-gray-800">{col.label_ar}</span>
                                  <span className="text-gray-500 text-xs font-mono">({col.key})</span>
                                  {isMainRef && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-semibold">
                                      قيمة رئيسية · {categories.find(c => String(c.id) === String(col.reference_type))?.name_ar || col.reference_type}
                                    </span>
                                  )}
                                  {isAttr && (
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                                      صفة · {categories.find(c => String(c.id) === String(col.reference_type))?.name_ar || col.reference_type}
                                      {col.attribute_type && col.attribute_type !== col.key && (
                                        <span className="text-indigo-500 ml-1">({col.attribute_type})</span>
                                      )}
                                    </span>
                                  )}
                                  {!col.reference_type && col.input_type === 'number' && (
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">رقم</span>
                                  )}
                                  {/* زر إضافة عامود صفة — يظهر فقط بجانب العمود الرئيسي */}
                                  {isMainRef && (
                                    <button
                                      type="button"
                                      onClick={() => setAddingAttributeForMainIndex(index)}
                                      className="px-3 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg text-xs font-semibold transition-colors"
                                    >
                                      + إضافة عامود صفة
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeCompositeColumn(index)}
                                    className="text-red-400 hover:text-red-600 text-sm font-bold"
                                  >
                                    ✗
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {formErrors.composite_columns && (
                        <p className="text-red-600 text-sm mb-3">{formErrors.composite_columns}</p>
                      )}

                      {/* نموذج إضافة عمود — إما رئيسي أو صفة */}
                      <div className="bg-white border border-indigo-200 rounded-xl p-4 space-y-3">
                        {addingAttributeForMainIndex !== null ? (
                          <>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <p className="text-sm font-bold text-indigo-800">📎 إضافة عامود صفة</p>
                              <button
                                type="button"
                                onClick={() => { setAddingAttributeForMainIndex(null); setCompositeColumnInput({ key: '', label_en: '', label_ar: '', reference_type: '', input_type: 'text', attribute_type: '' }); }}
                                className="text-xs text-gray-500 hover:text-gray-700 underline"
                              >
                                إلغاء — إضافة عمود رئيسي بدلاً
                              </button>
                            </div>
                            {formData.composite_columns[addingAttributeForMainIndex] && (
                              <p className="text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg">
                                الصفة ستُربط بالعمود الرئيسي: <strong>{formData.composite_columns[addingAttributeForMainIndex].label_ar}</strong>
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm font-bold text-indigo-800">🔑 إضافة عمود رئيسي</p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <input
                            type="text"
                            value={compositeColumnInput.key}
                            onChange={(e) => setCompositeColumnInput({ ...compositeColumnInput, key: e.target.value })}
                            placeholder="مفتاح العمود (key) *"
                            className="px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                          />
                          <input
                            type="text"
                            value={compositeColumnInput.label_ar}
                            onChange={(e) => setCompositeColumnInput({ ...compositeColumnInput, label_ar: e.target.value })}
                            placeholder="الاسم بالعربية *"
                            className="px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                          />
                          <input
                            type="text"
                            value={compositeColumnInput.label_en}
                            onChange={(e) => setCompositeColumnInput({ ...compositeColumnInput, label_en: e.target.value })}
                            placeholder="الاسم بالإنجليزية"
                            className="px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                            dir="ltr"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-indigo-900 mb-1">
                            {addingAttributeForMainIndex !== null ? (
                              <>ربط بقاموس المراجع <span className="text-red-500">*</span> (مطلوب للصفة)</>
                            ) : (
                              <>ربط بقاموس المراجع <span className="text-gray-400 font-normal mr-1">(اختياري — يُحوّل العمود إلى Dropdown)</span></>
                            )}
                          </label>
                          <select
                            value={compositeColumnInput.reference_type}
                            onChange={(e) => setCompositeColumnInput({ ...compositeColumnInput, reference_type: e.target.value })}
                            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                          >
                            <option value="">— {addingAttributeForMainIndex !== null ? 'اختر فئة المراجع' : 'نص حر (بدون ربط بمرجع)'} —</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name_ar || c.name_en}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* attribute_type — للصفة يظهر دائماً، للرئيسي فقط إذا وُجد عمود مرجعي آخر */}
                        {(addingAttributeForMainIndex !== null && compositeColumnInput.reference_type) || (compositeColumnInput.reference_type && formData.composite_columns.some(c => c.reference_type)) ? (
                          <div>
                            <label className="block text-sm font-bold text-indigo-900 mb-1">
                              اسم الصفة (attribute_type)
                              <span className="text-gray-400 font-normal mr-1">
                                {addingAttributeForMainIndex !== null ? '(يُخزَّن في assessment_reference_attributes)' : '(افتراضياً = key)'}
                              </span>
                            </label>
                            <input
                              type="text"
                              value={compositeColumnInput.attribute_type}
                              onChange={(e) => setCompositeColumnInput({ ...compositeColumnInput, attribute_type: e.target.value })}
                              placeholder={`مثال: ${compositeColumnInput.key || 'distributor'}`}
                              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                              dir="ltr"
                            />
                          </div>
                        ) : null}

                        <div className="flex gap-2">
                          {addingAttributeForMainIndex !== null ? (
                            <button
                              type="button"
                              onClick={() => addCompositeColumn(addingAttributeForMainIndex)}
                              className="flex-1 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm"
                            >
                              + إضافة الصفة
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addCompositeColumn()}
                              className="flex-1 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm"
                            >
                              + إضافة العمود الرئيسي
                            </button>
                          )}
                        </div>
                      </div>

                      {/* شرح النظام */}
                      <div className="mt-4 p-4 bg-white border border-indigo-100 rounded-xl">
                        <p className="text-indigo-800 text-xs font-bold mb-2">💡 كيف يعمل النظام العلائقي؟</p>
                        <div className="space-y-1 text-xs text-indigo-700">
                          <p>🔑 <strong>العمود الرئيسي</strong> = القيمة الأولى المرتبطة بمرجع (يُخزَّن في <code className="bg-indigo-100 px-1 rounded">assessment_reference_values</code>)</p>
                          <p>📎 <strong>أعمدة الصفات</strong> = أزرار «إضافة عامود صفة» بجانب العمود الرئيسي — تُخزَّن في <code className="bg-indigo-100 px-1 rounded">assessment_reference_attributes</code></p>
                          <p className="mt-2 text-gray-500">مثال: أضف عمود رئيسي «نوع الجهاز» ثم اضغط «إضافة عامود صفة» لإضافة «الموزّع» و«الموديل»</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Parent/Child Settings */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                    <h4 className="font-bold text-blue-900 mb-4">🔗 إعدادات السؤال الفرعي (اختياري)</h4>
                    <p className="text-blue-700 mb-4">يمكنك جعل هذا السؤال فرعياً لسؤال آخر</p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">السؤال الأب</label>
                        <select
                          value={formData.parent_question_id || ''}
                          onChange={(e) => setFormData({ ...formData, parent_question_id: e.target.value ? parseInt(e.target.value) : null })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- لا يوجد (سؤال مستقل) --</option>
                          {parentOptions.map(q => (
                            <option key={q.id} value={q.id}>
                              {'↳ '.repeat(q._depth || 0)}{q.text_ar}
                              {q.parent_question_id ? ' (فرعي)' : ''}
                            </option>
                          ))}
                        </select>
                        <p className="text-gray-500 text-xs mt-1">
                          يمكن اختيار سؤال رئيسي أو سؤال فرعي كأب — سيظهر هذا السؤال عند تحقق قيمة التفعيل
                        </p>
                      </div>
                      
                      {formData.parent_question_id && (
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            قيمة التفعيل <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.trigger_answer_value}
                            onChange={(e) => setFormData({ ...formData, trigger_answer_value: e.target.value })}
                            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500
                              ${formErrors.trigger_answer_value ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="مثال: Yes, No, 5"
                          />
                          <p className="text-gray-500 text-xs mt-1">
                            سيظهر هذا السؤال فقط إذا كانت إجابة السؤال الأب تساوي هذه القيمة
                          </p>
                          {formErrors.trigger_answer_value && (
                            <p className="text-red-600 text-sm mt-1">{formErrors.trigger_answer_value}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ========== الخطوة 4: المراجعة والحفظ ========== */}
              {currentStep === 4 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">الخطوة 4: مراجعة وحفظ</h3>
                  <p className="text-gray-600 mb-6">راجع السؤال قبل الحفظ</p>
                  
                  {/* Summary */}
                  <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">النوع:</span>
                        <span className="font-medium mr-2">{getTypeConfig(formData.question_type)?.label_ar}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">النقاط:</span>
                        <span className="font-medium mr-2">{formData.weight}</span>
                      </div>
                      {formData.category && (
                        <div>
                          <span className="text-gray-500">التصنيف:</span>
                          <span className="font-medium mr-2">
                            {categories.find(c => c.id === formData.category_id)?.name_ar || formData.category}
                          </span>
                        </div>
                      )}
                      {formData.parent_question_id && (
                        <div className="col-span-2">
                          <span className="text-gray-500">سؤال فرعي ل:</span>
                          <span className="font-medium mr-2">
                            {(parentQuestions || []).find(q => q.id === formData.parent_question_id)?.text_ar}
                          </span>
                          <span className="text-gray-500">عند الإجابة:</span>
                          <span className="font-medium mr-2">{formData.trigger_answer_value}</span>
                        </div>
                      )}
                      {formData.composite_columns.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-gray-500">الأعمدة:</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {formData.composite_columns.map((col, idx) => (
                              <span key={idx} className="px-2 py-1 bg-white rounded text-xs">
                                {col.label_ar}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {(formData.question_type === 'MultiChoice' || formData.question_type === 'MultiSelect') && formData.options && Object.keys(formData.options).filter(k => k !== '__other_options' && k !== '__otherOptionKey').length > 0 && (
                        <div className="col-span-2">
                          <span className="text-gray-500">الخيارات:</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {formData.question_type === 'MultiSelect' ? (() => {
                              const stats = getOptionsStats();
                              const pct = stats?.percentPerCorrect ?? 0;
                              return Object.entries(formData.options).filter(([k]) => k !== '__other_options' && k !== '__otherOptionKey').map(([label, val]) => {
                                const isCorrect = val === 1 || val === true;
                                return (
                                  <span key={label} className="px-2 py-1 bg-white rounded text-xs">
                                    {label} {isCorrect ? `(صحيح ${pct.toFixed(0)}%)` : '(خطأ 0%)'}
                                  </span>
                                );
                              });
                            })() : Object.entries(formData.options).filter(([k]) => k !== '__other_options' && k !== '__otherOptionKey').map(([label, points]) => {
                              const stats = getOptionsStats();
                              const maxP = stats?.maxP ?? 1;
                              const pct = maxP > 0 ? Math.round((Number(points) / maxP) * 100) : 0;
                              return (
                                <span key={label} className="px-2 py-1 bg-white rounded text-xs">
                                  {label} ({points} نقطة = {pct}%)
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="border-t pt-4">
                      <h4 className="font-bold text-gray-900 mb-2">نص السؤال:</h4>
                      <p className="text-lg font-medium text-gray-900">{formData.text_ar}</p>
                      <p className="text-sm text-gray-600 mt-1">{formData.text_en}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t bg-gray-50 p-6 flex justify-between">
              <div>
                {currentStep > 1 && (
                  <button
                    onClick={prevStep}
                    className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-100 font-medium"
                  >
                    → السابق
                  </button>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-100 font-medium"
                >
                  إلغاء
                </button>
                
                {currentStep < 4 ? (
                  <button
                    onClick={nextStep}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold"
                  >
                    التالي ←
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        جارٍ الحفظ...
                      </>
                    ) : (
                      <>
                        💾 حفظ السؤال
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBankNew;
