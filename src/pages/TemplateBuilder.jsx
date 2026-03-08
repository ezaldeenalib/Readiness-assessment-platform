import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { questionsNewService, categoriesService } from '../services';
import { useNavigate, useParams } from 'react-router-dom';

const TemplateBuilder = () => {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const [loading, setLoading] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  const [categories, setCategories] = useState([]);
  const [sections, setSections] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    version: '1.0',
    category_id: null,
    category: '' // Legacy support
  });

  const [questionFilters, setQuestionFilters] = useState({
    category: '',
    type: '',
    search: ''
  });

  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    fetchAvailableQuestions();
    fetchCategories();
    
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);
  
  const fetchCategories = async () => {
    try {
      const data = await categoriesService.getAll({ is_active: true });
      setCategories(data);
      setSections(data); // Sections are also categories
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // تحميل بنك الأسئلة عند فتح الصفحة (نفس مصدر مدير الأوزان)
  useEffect(() => {
    fetchAvailableQuestions();
  }, []);

  // قائمة الأسئلة المتاحة للاختيار (استبعاد المختار + فلترة)، مرتبة من الأقدم للأحدث
  const filteredAvailableQuestions = React.useMemo(() => {
    const selIds = new Set(selectedQuestions.map(q => q.id));
    const list = (availableQuestions || []).filter(q => {
      if (selIds.has(q.id)) return false;
      if (questionFilters.type && q.question_type !== questionFilters.type) return false;
      if (questionFilters.search) {
        const s = questionFilters.search.toLowerCase();
        if (!(q.text_ar || '').toLowerCase().includes(s) && !(q.text_en || '').toLowerCase().includes(s)) return false;
      }
      if (questionFilters.category && q.category_id !== questionFilters.category && q.category !== questionFilters.category) return false;
      return true;
    });
    // ترتيب من الأقدم للأحدث: created_at ثم id
    return list.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : (a.id || 0);
      const timeB = b.created_at ? new Date(b.created_at).getTime() : (b.id || 0);
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || 0) - (b.id || 0);
    });
  }, [availableQuestions, selectedQuestions, questionFilters]);

  // تجميع الأسئلة المتاحة: حسب الفئة ثم الأب مع الفرعيين معاً
  const groupedAvailableQuestions = React.useMemo(() => {
    const list = filteredAvailableQuestions || [];
    const byCategory = new Map();

    list.forEach(q => {
      const catKey = q.category_id != null ? String(q.category_id) : (q.category || 'uncategorized');
      if (!byCategory.has(catKey)) byCategory.set(catKey, []);
      byCategory.get(catKey).push(q);
    });

    const result = [];
    byCategory.forEach((questionsInCat, catKey) => {
      const idsInCat = new Set(questionsInCat.map(q => q.id));
      const roots = questionsInCat.filter(q => !q.parent_question_id || !idsInCat.has(q.parent_question_id));
      const withChildren = roots.map(root => ({
        ...root,
        _children: questionsInCat.filter(q => q.parent_question_id === root.id)
      }));
      result.push({ categoryKey: catKey, questions: withChildren });
    });
    return result;
  }, [filteredAvailableQuestions]);

  const getCategoryLabel = (categoryKey) => {
    if (!categoryKey || categoryKey === 'uncategorized') return 'بدون فئة';
    const id = parseInt(categoryKey, 10);
    if (!isNaN(id)) {
      const cat = categories.find(c => c.id === id);
      return cat ? (cat.name_ar || cat.name_en || cat.name || categoryKey) : categoryKey;
    }
    return categoryKey;
  };

  const getQuestionTypeLabel = (type) => {
    const labels = { YesNo: '✓✗ نعم/لا', MultiChoice: '☑ اختيار متعدد', MultiSelect: '☑ متعدد', Manual: '✎ يدوي', Composite: '📋 مركب', StaticData: '📊 بيانات ثابتة' };
    return labels[type] || type;
  };

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/templates/${templateId}`);
      const template = response.data.template;
      
      setFormData({
        name: template.name,
        name_ar: template.name_ar,
        description: template.description || '',
        description_ar: template.description_ar || '',
        version: template.version,
        category_id: template.category_id || null,
        category: template.category_name_ar || template.category_name_en || template.category || ''
      });
      
      setSelectedQuestions(
        template.questions.map((q, index) => ({
          ...q,
          id: q.id,
          text_ar: q.text_ar || q.question_text_ar,
          text_en: q.text_en || q.question_text,
          question_text_ar: q.text_ar || q.question_text_ar, // للحفاظ على التوافق
          question_text: q.text_en || q.question_text, // للحفاظ على التوافق
          question_type: q.question_type,
          weight: q.weight,
          category: q.category,
          composite_columns: q.composite_columns,
          parent_question_id: q.parent_question_id,
          display_order: q.display_order || index,
          override_weight: q.override_weight,
          section_id: q.section_id || null,
          section_name: q.section_name_en || q.section_name_ar || q.section_name || '',
          section_name_ar: q.section_name_ar || q.section_name_en || '',
          include_in_evaluation: q.include_in_evaluation !== undefined ? q.include_in_evaluation : true
        }))
      );
    } catch (error) {
      console.error('Error fetching template:', error);
      alert('Failed to fetch template');
      navigate('/templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableQuestions = async (filters = questionFilters) => {
    try {
      const params = { flat: 'true' };
      if (filters.search) params.search = filters.search;
      if (filters.type) params.type = filters.type;
      if (filters.category) params.category = filters.category;
      const questions = await questionsNewService.getAll(params);
      setAvailableQuestions(Array.isArray(questions) ? questions : []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      alert('فشل تحميل الأسئلة: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleAddQuestion = (question) => {
    if (selectedQuestions.find(q => q.id === question.id)) return;
    setSelectedQuestions([
      ...selectedQuestions,
      {
        ...question,
        question_id: question.id,
        display_order: selectedQuestions.length,
        override_weight: null,
        section_id: null,
        section_name: '',
        section_name_ar: '',
        include_in_evaluation: true
      }
    ]);
  };

  const handleRemoveQuestion = (questionId) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== questionId));
  };

  const handleMoveQuestion = (index, direction) => {
    const newQuestions = [...selectedQuestions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;
    
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    
    newQuestions.forEach((q, i) => {
      q.display_order = i;
    });
    
    setSelectedQuestions(newQuestions);
  };

  // إعادة ترتيب الأسئلة المختارة بالسحب والإفلات
  const handleSelectedDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    e.target.classList.add('opacity-50');
  };

  const handleSelectedDragEnd = (e) => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    e.target.classList.remove('opacity-50');
  };

  const handleSelectedDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleSelectedDragLeave = (e) => {
    setDragOverIndex(null);
  };

  const handleSelectedDrop = (e, dropIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    const fromIndex = draggedIndex ?? parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (fromIndex === dropIndex || fromIndex < 0) {
      setDraggedIndex(null);
      return;
    }
    const newQuestions = [...selectedQuestions];
    const [removed] = newQuestions.splice(fromIndex, 1);
    newQuestions.splice(dropIndex, 0, removed);
    newQuestions.forEach((q, i) => {
      q.display_order = i;
    });
    setSelectedQuestions(newQuestions);
    setDraggedIndex(null);
  };

  const handleQuestionUpdate = (questionId, field, value) => {
    setSelectedQuestions(selectedQuestions.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedQuestions.length === 0) {
      alert('Please add at least one question to the template');
      return;
    }
    
    try {
      setLoading(true);
      
      const payload = {
        ...formData,
        category_id: formData.category_id || null,
        category: formData.category || null, // Legacy support
        questions: selectedQuestions.map((q, index) => ({
          question_id: q.id,
          display_order: index,
          override_weight: q.override_weight || null,
          section_id: q.section_id || null,
          section_name: q.section_name || null,
          section_name_ar: q.section_name_ar || null,
          is_required: true,
          include_in_evaluation: q.include_in_evaluation !== undefined ? q.include_in_evaluation : true
        }))
      };
      
      if (templateId) {
        await api.put(`/templates/${templateId}`, payload);
        alert('Template updated successfully');
      } else {
        await api.post('/templates', payload);
        alert('Template created successfully');
      }
      
      navigate('/templates');
    } catch (error) {
      console.error('Error saving template:', error);
      alert(error.response?.data?.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

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
  
  const calculateEvaluationWeight = () => {
    return selectedQuestions.filter(q => q.include_in_evaluation !== false).length;
  };
  
  const calculateNonEvaluationCount = () => {
    return selectedQuestions.filter(q => q.include_in_evaluation === false).length;
  };

  return (
      <div dir="rtl">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/templates')}
              className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
            >
              <span>→</span>
              <span>العودة إلى القوالب</span>
            </button>
            
            <h1 className="text-3xl font-bold text-gray-900">
              {templateId ? 'تعديل القالب' : 'إنشاء قالب جديد'}
            </h1>
            <p className="text-gray-600 mt-1">
              قم بإنشاء قالب تقييم من خلال اختيار الأسئلة من بنك الأسئلة
            </p>
          </div>

          {loading && !templateId ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Template Info */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">معلومات القالب</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم القالب (عربي) *
                    </label>
                    <input
                      type="text"
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name (English) *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      dir="ltr"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الإصدار
                    </label>
                    <input
                      type="text"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الوصف (عربي)
                    </label>
                    <textarea
                      value={formData.description_ar}
                      onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (English)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* اختيار الأسئلة — نفس واجهة مدير الأوزان: بنك متاحة | أسئلة مختارة */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  الأسئلة ({selectedQuestions.length})
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  إجمالي الوزن: <span className="font-semibold">{calculateTotalWeight().toFixed(1)}</span> نقطة
                  {calculateNonEvaluationCount() > 0 && (
                    <span className="mr-3">| لا تدخل في التقييم: <span className="font-semibold text-yellow-600">{calculateNonEvaluationCount()}</span> سؤال</span>
                  )}
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* بنك الأسئلة المتاحة */}
                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                    <h3 className="text-base font-bold text-gray-900 mb-3">بنك الأسئلة المتاحة</h3>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="بحث..."
                        value={questionFilters.search}
                        onChange={(e) => setQuestionFilters(f => ({ ...f, search: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                      />
                      <select
                        value={questionFilters.type}
                        onChange={(e) => setQuestionFilters(f => ({ ...f, type: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                      >
                        <option value="">كل الأنواع</option>
                        <option value="YesNo">✓✗ نعم/لا</option>
                        <option value="MultiChoice">☑ اختيار متعدد</option>
                        <option value="MultiSelect">☑ متعدد</option>
                        <option value="Manual">✎ يدوي</option>
                        <option value="Composite">📋 مركب</option>
                        <option value="StaticData">📊 بيانات ثابتة</option>
                      </select>
                    </div>
                    <div className="space-y-2 max-h-[320px] overflow-y-auto">
                      {filteredAvailableQuestions.length === 0 && (
                        <p className="text-gray-400 text-center py-8 text-sm">لا توجد أسئلة متاحة أو مطابقة للفلتر</p>
                      )}
                      {groupedAvailableQuestions.map(({ categoryKey, questions }) => (
                        <div key={categoryKey} className="mb-4">
                          <div className="text-xs font-bold text-gray-500 mb-2 px-1 border-b border-gray-200 pb-1">
                            {getCategoryLabel(categoryKey)}
                          </div>
                          <div className="space-y-1">
                            {questions.map((root) => (
                              <div key={root.id} className="space-y-1">
                                <div
                                  onClick={() => handleAddQuestion(root)}
                                  className="flex items-start gap-2 p-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all group"
                                >
                                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded shrink-0">{getQuestionTypeLabel(root.question_type)}</span>
                                  <span className="flex-1 text-sm text-gray-800 line-clamp-2">{root.text_ar || root.question_text_ar}</span>
                                  <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">+</span>
                                </div>
                                {(root._children || []).map((child) => (
                                  <div
                                    key={child.id}
                                    onClick={() => handleAddQuestion(child)}
                                    className="flex items-start gap-2 p-2 pr-3 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all group mr-6 border-r-2 border-blue-200"
                                  >
                                    <span className="text-blue-500 text-xs shrink-0">↳</span>
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded shrink-0">{getQuestionTypeLabel(child.question_type)}</span>
                                    <span className="flex-1 text-sm text-gray-700 line-clamp-2">{child.text_ar || child.question_text_ar}</span>
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">+</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* الأسئلة المختارة */}
                  <div className="border border-gray-200 rounded-xl p-4 bg-blue-50/30">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-bold text-gray-900">الأسئلة المختارة</h3>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">{selectedQuestions.length} سؤال</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">اسحب الصفوف لترتيب التسلسل قبل الحفظ</p>
                    {selectedQuestions.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                        <p className="text-sm">اضغط على سؤال من العمود الأيسر لإضافته</p>
                        <p className="text-xs mt-2 text-gray-400">يمكنك ترتيب الأسئلة بالسحب والإفلات بعد الإضافة</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[320px] overflow-y-auto">
                        {selectedQuestions.map((q, idx) => (
                          <div
                            key={q.id}
                            draggable
                            onDragStart={(e) => handleSelectedDragStart(e, idx)}
                            onDragEnd={handleSelectedDragEnd}
                            onDragOver={(e) => handleSelectedDragOver(e, idx)}
                            onDragLeave={handleSelectedDragLeave}
                            onDrop={(e) => handleSelectedDrop(e, idx)}
                            className={`flex items-start gap-2 p-3 rounded-xl bg-white border cursor-grab active:cursor-grabbing transition-all ${
                              dragOverIndex === idx ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-100'
                            } ${draggedIndex === idx ? 'opacity-50' : ''}`}
                          >
                            <span className="text-gray-400 shrink-0 cursor-grab active:cursor-grabbing" title="اسحب لترتيب الترتيب">⋮⋮</span>
                            <span className="text-xs text-gray-500 w-5 pt-0.5 shrink-0">{idx + 1}</span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded shrink-0">{getQuestionTypeLabel(q.question_type)}</span>
                            <span className="flex-1 text-sm text-gray-800 line-clamp-2">{q.text_ar || q.question_text_ar}</span>
                            <button type="button" onClick={() => handleRemoveQuestion(q.id)} className="w-6 h-6 rounded-full flex items-center justify-center text-red-500 hover:bg-red-100 shrink-0" title="إزالة">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* تفاصيل الأسئلة المختارة (قسم، تجاوز الوزن، يدخل في التقييم) — يظهر عند وجود أسئلة */}
              {selectedQuestions.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-base font-bold text-gray-900 mb-3">تفاصيل الأسئلة المختارة (قسم، وزن، يدخل في التقييم)</h3>
                  <div className="space-y-4">
                    {selectedQuestions.map((question, index) => (
                      <div key={question.id} className={`border rounded-lg p-4 transition-all ${
                        question.include_in_evaluation === false 
                          ? 'border-yellow-300 bg-yellow-50 hover:border-yellow-400' 
                          : 'border-gray-200 hover:border-blue-300'
                      }`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => handleMoveQuestion(index, 'up')}
                                disabled={index === 0}
                                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveQuestion(index, 'down')}
                                disabled={index === selectedQuestions.length - 1}
                                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                              >
                                ↓
                              </button>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                              {question.include_in_evaluation === false && (
                                <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-900 rounded font-medium">
                                  إعلامي
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(question.id)}
                            className="text-red-600 hover:bg-red-50 px-3 py-1 rounded-md"
                          >
                            إزالة
                          </button>
                        </div>
                        
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-500 font-mono">Q{question.id}</span>
                            {question.question_type === 'Composite' && (
                              <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                                📋 مركب ({question.composite_columns?.length || 0} أعمدة)
                              </span>
                            )}
                            {question.parent_question_id && (
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                ↳ فرعي
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900">{question.text_ar || question.question_text_ar}</h3>
                          <p className="text-sm text-gray-600 mt-1">{question.text_en || question.question_text}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                          <div className="md:col-span-2">
                            <label className="block text-xs text-gray-600 mb-1">
                              القسم / Section
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
                              value={String(question.section_id ?? '')}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const selectedId = raw ? parseInt(raw, 10) : null;
                                const selectedSection = sections.find(s => Number(s.id) === selectedId);
                                setSelectedQuestions(prev => prev.map(q => {
                                  if (q.id !== question.id) return q;
                                  return {
                                    ...q,
                                    section_id: selectedId,
                                    section_name: selectedSection ? (selectedSection.name_en || selectedSection.name_ar || selectedSection.name || '') : '',
                                    section_name_ar: selectedSection ? (selectedSection.name_ar || selectedSection.name_en || selectedSection.name || '') : '',
                                  };
                                }));
                              }}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            >
                              <option value="">-- اختر القسم --</option>
                              {sections.map(section => (
                                <option key={section.id} value={String(section.id)}>
                                  {section.name_ar || section.name_en || section.category || section.name}
                                  {section.name_en && section.name_en !== section.name_ar ? ` (${section.name_en})` : ''}
                                </option>
                              ))}
                            </select>
                            {sections.length === 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                لا توجد أقسام متاحة. <a href="/categories" className="text-blue-600 hover:underline">أنشئ فئة جديدة</a>
                              </p>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              تجاوز الوزن (اختياري)
                            </label>
                            <input
                              type="number"
                              value={question.override_weight || ''}
                              onChange={(e) => handleQuestionUpdate(question.id, 'override_weight', e.target.value ? parseFloat(e.target.value) : null)}
                              placeholder={`الافتراضي: ${question.weight}`}
                              min="0"
                              step="0.5"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              disabled={question.include_in_evaluation === false}
                            />
                            {question.include_in_evaluation === false && (
                              <p className="text-xs text-yellow-600 mt-1">غير متاح للأسئلة الإعلامية</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Include in Evaluation Toggle */}
                        <div className={`mt-3 pt-3 border-t ${question.include_in_evaluation === false ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'} rounded-lg p-3`}>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={question.include_in_evaluation !== undefined ? question.include_in_evaluation : true}
                              onChange={(e) => handleQuestionUpdate(question.id, 'include_in_evaluation', e.target.checked)}
                              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${question.include_in_evaluation !== false ? 'text-green-700' : 'text-yellow-700'}`}>
                                  {question.include_in_evaluation !== false ? '✓ يدخل في التقييم' : '✗ لا يدخل في التقييم'}
                                </span>
                                <span className="text-xs text-gray-500">/ Include in Evaluation</span>
                              </div>
                              <p className={`text-xs mt-1 ${question.include_in_evaluation !== false ? 'text-green-600' : 'text-yellow-600'}`}>
                                {question.include_in_evaluation !== false 
                                  ? '✓ سيتم احتساب هذا السؤال في النتيجة النهائية للتقييم'
                                  : '⚠ هذا السؤال لن يُحسب في النتيجة النهائية (للعرض فقط)'}
                              </p>
                            </div>
                            {question.include_in_evaluation === false && (
                              <span className="text-xs px-2 py-1 bg-yellow-200 text-yellow-900 rounded font-medium">
                                إعلامي فقط
                              </span>
                            )}
                          </label>
                        </div>
                        
                        <div className="mt-3 flex gap-2 text-xs flex-wrap">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {question.question_type === 'YesNo' && '✓✗ نعم/لا'}
                            {question.question_type === 'MultiChoice' && '☑ اختيار متعدد'}
                            {question.question_type === 'StaticData' && '📊 بيانات ثابتة'}
                            {question.question_type === 'Manual' && '✎ إدخال يدوي'}
                            {question.question_type === 'Composite' && '📋 سؤال مركب'}
                            {!['YesNo', 'MultiChoice', 'StaticData', 'Manual', 'Composite'].includes(question.question_type) && question.question_type}
                          </span>
                          {question.category && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              {question.category}
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded ${question.include_in_evaluation !== false ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {question.include_in_evaluation !== false ? '✓ يدخل في التقييم' : '✗ إعلامي فقط'}
                          </span>
                          {question.include_in_evaluation !== false && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
                              الوزن: {question.override_weight || question.weight || 0} نقطة
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/templates')}
                  className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedQuestions.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'جارٍ الحفظ...' : templateId ? 'حفظ التغييرات' : 'إنشاء القالب'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
  );
};

export default TemplateBuilder;
