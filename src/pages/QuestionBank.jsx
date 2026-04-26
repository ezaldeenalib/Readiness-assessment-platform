import React, { useState, useEffect } from 'react';
import api from '../services/api';

const QuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [staticFields, setStaticFields] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    search: ''
  });

  // أنواع الأسئلة مع شرح مفصل
  const questionTypesList = [
    { 
      value: 'StaticDataLinked', 
      label_ar: 'مربوط بالبيانات الثابتة',
      icon: '📊',
      color: 'blue',
      description: 'سؤال يُعبأ تلقائياً من البيانات المخزنة للجهة',
      example: 'مثال: "هل عدد الموظفين أكثر من 500؟" → يقرأ من حقل total_employees'
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
      label_ar: 'اختيار متعدد',
      icon: '☑',
      color: 'purple',
      description: 'سؤال بخيارات متعددة، كل خيار له نقاط مختلفة',
      example: 'مثال: "ما مستوى النسخ الاحتياطي؟" → لا يوجد(0)، أساسي(5)، متقدم(10)'
    },
    { 
      value: 'Manual', 
      label_ar: 'إدخال يدوي',
      icon: '✎',
      color: 'orange',
      description: 'سؤال يتطلب إدخال قيمة من المستخدم',
      example: 'مثال: "كم عدد الحوادث الأمنية في السنة؟" → المستخدم يدخل الرقم'
    },
  ];

  // قواعد التقييم مع شرح
  const evaluationRules = [
    { value: 'greater_than', label: 'أكبر من (>)', example: '650 > 500 ✓' },
    { value: 'less_than', label: 'أصغر من (<)', example: '3 < 5 ✓' },
    { value: 'equals', label: 'يساوي (=)', example: '"نعم" = "نعم" ✓' },
    { value: 'not_equals', label: 'لا يساوي (≠)', example: '"أ" ≠ "ب" ✓' },
    { value: 'greater_or_equal', label: 'أكبر أو يساوي (≥)', example: '50 ≥ 50 ✓' },
    { value: 'less_or_equal', label: 'أصغر أو يساوي (≤)', example: '3 ≤ 5 ✓' },
    { value: 'contains', label: 'يحتوي على', example: '"gov.iq" يحتوي ".gov" ✓' },
    { value: 'exists', label: 'موجود (غير فارغ)', example: '"قيمة" موجود ✓' },
  ];

  const [formData, setFormData] = useState({
    question_text: '',
    question_text_ar: '',
    question_type: '',
    linked_static_data_field: '',
    evaluation_rule: 'greater_than',
    reference_value: '',
    options: {},
    weight: 10,
    category: '',
    help_text_ar: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [optionInput, setOptionInput] = useState({ name: '', value: '' });

  useEffect(() => {
    fetchQuestions();
    fetchMetadata();
  }, [filters]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/questions', { params: filters });
      setQuestions(response.data.questions || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [fieldsRes, categoriesRes] = await Promise.all([
        api.get('/questions/meta/static-fields'),
        api.get('/questions/meta/categories')
      ]);
      setStaticFields(fieldsRes.data.fields || []);
      setCategories(categoriesRes.data.categories || []);
    } catch (error) {
      console.error('Error fetching metadata:', error);
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
      if (!formData.question_text_ar.trim()) {
        errors.question_text_ar = 'نص السؤال بالعربية مطلوب';
      }
      if (!formData.question_text.trim()) {
        errors.question_text = 'نص السؤال بالإنجليزية مطلوب';
      }
    }
    
    if (step === 3) {
      if (formData.question_type === 'StaticDataLinked' && !formData.linked_static_data_field) {
        errors.linked_static_data_field = 'يجب اختيار الحقل المرتبط';
      }
      if (formData.question_type === 'MultiChoice' && Object.keys(formData.options).length < 2) {
        errors.options = 'يجب إضافة خيارين على الأقل';
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
      if (editingQuestion) {
        await api.put(`/questions/${editingQuestion.id}`, formData);
      } else {
        await api.post('/questions', formData);
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
    setFormData({
      question_text: question.question_text || '',
      question_text_ar: question.question_text_ar || '',
      question_type: question.question_type || '',
      linked_static_data_field: question.linked_static_data_field || '',
      evaluation_rule: question.evaluation_rule || 'greater_than',
      reference_value: question.reference_value || '',
      options: typeof question.options === 'string' ? JSON.parse(question.options) : (question.options || {}),
      weight: question.weight || 10,
      category: question.category || '',
      help_text_ar: question.help_text_ar || '',
    });
    setCurrentStep(1);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    
    try {
      await api.delete(`/questions/${id}`);
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      alert(error.response?.data?.message || 'فشل في حذف السؤال');
    }
  };

  const resetForm = () => {
    setFormData({
      question_text: '',
      question_text_ar: '',
      question_type: '',
      linked_static_data_field: '',
      evaluation_rule: 'greater_than',
      reference_value: '',
      options: {},
      weight: 10,
      category: '',
      help_text_ar: '',
    });
    setEditingQuestion(null);
    setFormErrors({});
    setOptionInput({ name: '', value: '' });
    setCurrentStep(1);
  };

  const addOption = () => {
    if (!optionInput.name.trim()) {
      alert('الرجاء إدخال اسم الخيار');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      options: {
        ...prev.options,
        [optionInput.name]: parseFloat(optionInput.value) || 0
      }
    }));
    
    setOptionInput({ name: '', value: '' });
  };

  const removeOption = (optionKey) => {
    setFormData(prev => {
      const newOptions = { ...prev.options };
      delete newOptions[optionKey];
      return { ...prev, options: newOptions };
    });
  };

  const getTypeConfig = (type) => questionTypesList.find(t => t.value === type);

  // معاينة السؤال
  const renderPreview = () => {
    const typeConfig = getTypeConfig(formData.question_type);
    if (!typeConfig) return null;

    return (
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-6">
        <div className="text-sm text-gray-500 mb-3">معاينة كيف سيظهر السؤال في التقييم:</div>
        
        <div className="bg-gray-50 rounded-lg p-4 border">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${typeConfig.color}-100 text-${typeConfig.color}-700`}>
              {typeConfig.icon} {typeConfig.label_ar}
            </span>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">
              ⭐ {formData.weight} نقطة
            </span>
          </div>
          
          {/* Question */}
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {formData.question_text_ar || 'نص السؤال سيظهر هنا...'}
          </h3>
          
          {formData.help_text_ar && (
            <p className="text-sm text-gray-500 mb-3">💡 {formData.help_text_ar}</p>
          )}
          
          {/* Answer Area Based on Type */}
          <div className="mt-4">
            {formData.question_type === 'YesNo' && (
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="preview" className="w-5 h-5 text-green-600" disabled />
                  <span className="text-green-700 font-medium">✓ نعم</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="preview" className="w-5 h-5 text-red-600" disabled />
                  <span className="text-red-700 font-medium">✗ لا</span>
                </label>
              </div>
            )}
            
            {formData.question_type === 'MultiChoice' && (
              <div className="space-y-2">
                {Object.entries(formData.options).length > 0 ? (
                  Object.entries(formData.options).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 cursor-pointer">
                      <input type="radio" name="preview-multi" className="w-5 h-5" disabled />
                      <span>{key}</span>
                      <span className="text-gray-500 text-sm">({value} نقطة)</span>
                    </label>
                  ))
                ) : (
                  <p className="text-gray-400 italic">أضف خيارات ليتم عرضها هنا...</p>
                )}
              </div>
            )}
            
            {formData.question_type === 'Manual' && (
              <input 
                type="text" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white" 
                placeholder="المستخدم سيدخل الإجابة هنا..."
                disabled
              />
            )}
            
            {formData.question_type === 'StaticDataLinked' && (
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  className="flex-1 px-4 py-3 border border-blue-300 rounded-lg bg-blue-50 text-blue-700 font-bold" 
                  value={`قيمة من: ${staticFields.find(f => f.field_key === formData.linked_static_data_field)?.field_name_ar || formData.linked_static_data_field || '...'}`}
                  disabled
                />
                <span className="text-blue-600">🔒 تلقائي</span>
              </div>
            )}
          </div>
          
          {/* Evaluation Rule Preview */}
          {(formData.question_type === 'StaticDataLinked' || formData.question_type === 'Manual') && formData.reference_value && (
            <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <span className="text-purple-700 text-sm">
                ⚖️ التقييم: القيمة {evaluationRules.find(r => r.value === formData.evaluation_rule)?.label || formData.evaluation_rule} {formData.reference_value}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div dir="rtl">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <span className="text-5xl">🏦</span>
                بنك الأسئلة
              </h1>
              <p className="text-gray-600 text-lg">
                أنشئ أسئلة ذكية للتقييم التلقائي
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-xl shadow p-4 text-center border-t-4 border-blue-500">
              <div className="text-3xl font-bold text-blue-600">{questions.length}</div>
              <div className="text-sm text-gray-600 mt-1">إجمالي الأسئلة</div>
            </div>
            
            <div className="bg-white rounded-xl shadow p-4 text-center border-t-4 border-green-500">
              <div className="text-3xl font-bold text-green-600">
                {questions.filter(q => q.question_type === 'StaticDataLinked').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">📊 تلقائية</div>
            </div>
            
            <div className="bg-white rounded-xl shadow p-4 text-center border-t-4 border-purple-500">
              <div className="text-3xl font-bold text-purple-600">
                {questions.filter(q => q.question_type === 'MultiChoice').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">☑ اختيار متعدد</div>
            </div>
            
            <div className="bg-white rounded-xl shadow p-4 text-center border-t-4 border-orange-500">
              <div className="text-3xl font-bold text-orange-600">
                {questions.filter(q => q.question_type === 'YesNo').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">✓✗ نعم/لا</div>
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
                  <option key={cat.category} value={cat.category}>
                    {cat.category} ({cat.count})
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
            <p className="text-gray-600 mb-6">ابدأ بإنشاء السؤال الأول لبناء قوالب التقييم</p>
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
                      </div>
                      
                      {/* Question Text */}
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {question.question_text_ar}
                      </h3>
                      <p className="text-gray-500 text-sm mb-3">{question.question_text}</p>
                      
                      {/* Metadata */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        {question.linked_static_data_field && (
                          <span className="text-blue-600">
                            📌 مرتبط بـ: {question.linked_field_name_ar || question.linked_static_data_field}
                          </span>
                        )}
                        
                        {question.evaluation_rule && question.reference_value && (
                          <span className="text-purple-600">
                            ⚖️ {evaluationRules.find(r => r.value === question.evaluation_rule)?.label} {question.reference_value}
                          </span>
                        )}
                        
                        {question.options && Object.keys(question.options).length > 0 && (
                          <span className="text-green-600">
                            ☑ {Object.keys(typeof question.options === 'string' ? JSON.parse(question.options) : question.options).length} خيارات
                          </span>
                        )}
                      </div>
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
                    {/* Arabic Question */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        نص السؤال بالعربية <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.question_text_ar}
                        onChange={(e) => setFormData({ ...formData, question_text_ar: e.target.value })}
                        rows={3}
                        className={`w-full px-4 py-3 border-2 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                          ${formErrors.question_text_ar ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="مثال: هل لدى المنظمة أكثر من 500 موظف؟"
                      />
                      {formErrors.question_text_ar && (
                        <p className="text-red-600 text-sm mt-1">{formErrors.question_text_ar}</p>
                      )}
                    </div>
                    
                    {/* English Question */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        نص السؤال بالإنجليزية <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.question_text}
                        onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                        rows={3}
                        dir="ltr"
                        className={`w-full px-4 py-3 border-2 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left
                          ${formErrors.question_text ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Example: Does the organization have more than 500 employees?"
                      />
                      {formErrors.question_text && (
                        <p className="text-red-600 text-sm mt-1">{formErrors.question_text}</p>
                      )}
                    </div>
                    
                    {/* Help Text */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        نص مساعد (اختياري)
                      </label>
                      <input
                        type="text"
                        value={formData.help_text_ar}
                        onChange={(e) => setFormData({ ...formData, help_text_ar: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="نص توضيحي يساعد المستخدم في فهم السؤال"
                      />
                    </div>
                    
                    {/* Category & Weight */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">التصنيف</label>
                        <input
                          type="text"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="مثال: security, general"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          النقاط (الوزن) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={formData.weight}
                          onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                          min="0"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-gray-500 text-xs mt-1">النقاط الممنوحة عند الإجابة الصحيحة</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========== الخطوة 3: الإعدادات حسب النوع ========== */}
              {currentStep === 3 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">الخطوة 3: إعدادات السؤال</h3>
                  <p className="text-gray-600 mb-6">حدد كيف سيتم تقييم الإجابة</p>
                  
                  {/* StaticDataLinked Settings */}
                  {formData.question_type === 'StaticDataLinked' && (
                    <div className="space-y-6">
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                        <h4 className="font-bold text-blue-900 mb-4">📊 ربط بالبيانات الثابتة</h4>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            اختر الحقل الذي سيُقرأ منه الجواب <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formData.linked_static_data_field}
                            onChange={(e) => setFormData({ ...formData, linked_static_data_field: e.target.value })}
                            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500
                              ${formErrors.linked_static_data_field ? 'border-red-500' : 'border-gray-300'}`}
                          >
                            <option value="">-- اختر حقلاً --</option>
                            {staticFields.map(field => (
                              <option key={field.field_key} value={field.field_key}>
                                {field.field_name_ar} ({field.field_type})
                              </option>
                            ))}
                          </select>
                          {formErrors.linked_static_data_field && (
                            <p className="text-red-600 text-sm mt-1">{formErrors.linked_static_data_field}</p>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">قاعدة التقييم</label>
                            <select
                              value={formData.evaluation_rule}
                              onChange={(e) => setFormData({ ...formData, evaluation_rule: e.target.value })}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                            >
                              {evaluationRules.map(rule => (
                                <option key={rule.value} value={rule.value}>
                                  {rule.label} - {rule.example}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">القيمة المرجعية</label>
                            <input
                              type="text"
                              value={formData.reference_value}
                              onChange={(e) => setFormData({ ...formData, reference_value: e.target.value })}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                              placeholder="مثال: 500"
                            />
                          </div>
                        </div>
                        
                        <div className="mt-4 p-4 bg-blue-100 rounded-lg">
                          <p className="text-blue-800 text-sm">
                            💡 مثال: إذا اخترت حقل "إجمالي الموظفين" وقاعدة "أكبر من 500"، 
                            فإن السؤال سينجح إذا كان عدد الموظفين أكثر من 500
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* YesNo Settings */}
                  {formData.question_type === 'YesNo' && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                      <h4 className="font-bold text-green-900 mb-4">✓✗ إعدادات نعم/لا</h4>
                      <p className="text-green-700 mb-4">
                        سيظهر للمستخدم خياران: "نعم" أو "لا"
                      </p>
                      <p className="text-green-700">
                        إذا اختار "نعم" → يحصل على <strong>{formData.weight}</strong> نقطة<br/>
                        إذا اختار "لا" → يحصل على <strong>0</strong> نقطة
                      </p>
                    </div>
                  )}
                  
                  {/* MultiChoice Settings */}
                  {formData.question_type === 'MultiChoice' && (
                    <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
                      <h4 className="font-bold text-purple-900 mb-4">☑ خيارات الإجابة</h4>
                      <p className="text-purple-700 mb-4">أضف الخيارات وحدد نقاط كل خيار</p>
                      
                      {/* Existing Options */}
                      {Object.keys(formData.options).length > 0 && (
                        <div className="space-y-2 mb-4">
                          {Object.entries(formData.options).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-purple-200">
                              <span className="text-purple-600">○</span>
                              <span className="flex-1 font-medium">{key}</span>
                              <span className="text-purple-700 font-bold">{value} نقطة</span>
                              <button
                                onClick={() => removeOption(key)}
                                className="text-red-500 hover:text-red-700"
                              >
                                ✗
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {formErrors.options && (
                        <p className="text-red-600 text-sm mb-3">{formErrors.options}</p>
                      )}
                      
                      {/* Add New Option */}
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={optionInput.name}
                          onChange={(e) => setOptionInput({ ...optionInput, name: e.target.value })}
                          placeholder="اسم الخيار (مثال: متقدم)"
                          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                        />
                        <input
                          type="number"
                          value={optionInput.value}
                          onChange={(e) => setOptionInput({ ...optionInput, value: e.target.value })}
                          placeholder="النقاط"
                          className="w-24 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          type="button"
                          onClick={addOption}
                          className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium"
                        >
                          + أضف
                        </button>
                      </div>
                      
                      <div className="mt-4 p-4 bg-purple-100 rounded-lg">
                        <p className="text-purple-800 text-sm">
                          💡 مثال: أضف خيارات مثل "لا يوجد (0 نقطة)"، "أساسي (5 نقاط)"، "متقدم (10 نقاط)"
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Manual Settings */}
                  {formData.question_type === 'Manual' && (
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
                      <h4 className="font-bold text-orange-900 mb-4">✎ إعدادات الإدخال اليدوي</h4>
                      <p className="text-orange-700 mb-4">المستخدم سيدخل قيمة وسيتم تقييمها حسب القاعدة</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">قاعدة التقييم</label>
                          <select
                            value={formData.evaluation_rule}
                            onChange={(e) => setFormData({ ...formData, evaluation_rule: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                          >
                            {evaluationRules.map(rule => (
                              <option key={rule.value} value={rule.value}>
                                {rule.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">القيمة المرجعية</label>
                          <input
                            type="text"
                            value={formData.reference_value}
                            onChange={(e) => setFormData({ ...formData, reference_value: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                            placeholder="مثال: 5"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-4 p-4 bg-orange-100 rounded-lg">
                        <p className="text-orange-800 text-sm">
                          💡 مثال: إذا كان السؤال "كم عدد الحوادث الأمنية؟" واخترت "أصغر أو يساوي 5"، 
                          فإن الإجابة تنجح إذا أدخل المستخدم رقم ≤ 5
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========== الخطوة 4: المراجعة والحفظ ========== */}
              {currentStep === 4 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">الخطوة 4: مراجعة وحفظ</h3>
                  <p className="text-gray-600 mb-6">راجع السؤال قبل الحفظ</p>
                  
                  {/* Preview */}
                  {renderPreview()}
                  
                  {/* Summary */}
                  <div className="mt-6 bg-gray-50 rounded-xl p-6">
                    <h4 className="font-bold text-gray-900 mb-4">ملخص السؤال:</h4>
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
                          <span className="font-medium mr-2">{formData.category}</span>
                        </div>
                      )}
                      {formData.linked_static_data_field && (
                        <div>
                          <span className="text-gray-500">الحقل:</span>
                          <span className="font-medium mr-2">{formData.linked_static_data_field}</span>
                        </div>
                      )}
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

export default QuestionBank;
