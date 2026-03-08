import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate, useParams } from 'react-router-dom';

const QUESTION_TYPE_LABELS = {
  YesNo: 'نعم/لا',
  MultiChoice: 'اختيار من متعدد',
  Manual: 'يدوي',
  StaticData: 'بيانات ثابتة',
  StaticDataLinked: 'مرتبط ببيانات ثابتة',
  Composite: 'مركب',
};

const TemplateView = () => {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/templates/${templateId}`);
      setTemplate(res.data.template);
    } catch (e) {
      console.error('Error fetching template:', e);
      setError(e.response?.data?.message || 'فشل تحميل القالب');
      setTemplate(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center" dir="rtl">
        <p className="text-red-600 mb-4">{error || 'القالب غير موجود'}</p>
        <button
          onClick={() => navigate('/templates')}
          className="text-blue-600 hover:text-blue-700"
        >
          العودة إلى القوالب
        </button>
      </div>
    );
  }

  const questions = template.questions || [];
  const roots = questions.filter((q) => !q.parent_question_id);
  const childrenByParent = questions
    .filter((q) => q.parent_question_id)
    .reduce((acc, q) => {
      const pid = q.parent_question_id;
      if (!acc[pid]) acc[pid] = [];
      acc[pid].push(q);
      return acc;
    }, {});

  const sectionMap = {};
  roots.forEach((q) => {
    const section = q.section_name_ar || q.section_name || 'عام';
    if (!sectionMap[section]) sectionMap[section] = [];
    sectionMap[section].push(q);
  });
  const sections = Object.entries(sectionMap);

  const typeBadgeClass = (t) => {
    switch (t) {
      case 'YesNo': return 'bg-green-100 text-green-800';
      case 'MultiChoice': return 'bg-purple-100 text-purple-800';
      case 'StaticData':
      case 'StaticDataLinked': return 'bg-blue-100 text-blue-800';
      case 'Composite': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      <button
        onClick={() => navigate('/templates')}
        className="text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-2"
      >
        <span>←</span>
        <span>العودة إلى القوالب</span>
      </button>

      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {template.category && (
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium mb-2">
                {template.category}
              </span>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{template.name_ar}</h1>
            {template.name && (
              <p className="text-gray-500 mt-1">{template.name}</p>
            )}
            {template.description_ar && (
              <p className="text-gray-600 mt-3 max-w-2xl">{template.description_ar}</p>
            )}
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
              <div className="text-xs text-gray-600">أسئلة</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Number(template.total_weight || 0).toFixed(0)}
              </div>
              <div className="text-xs text-gray-600">إجمالي النقاط</div>
            </div>
            <button
              onClick={() => navigate(`/templates/${templateId}/edit`)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              تعديل القالب
            </button>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-4">أسئلة القالب</h2>

      {sections.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center text-gray-500">
          لا توجد أسئلة في هذا القالب.
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map(([sectionName, sectionRoots]) => (
            <div key={sectionName} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <h3 className="font-bold text-gray-900">{sectionName}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {sectionRoots.map((q) => (
                  <div key={q.id}>
                    <div className="px-6 py-4 flex flex-wrap items-start gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeBadgeClass(q.question_type)}`}>
                        {QUESTION_TYPE_LABELS[q.question_type] || q.question_type}
                      </span>
                      {(q.effective_weight != null || q.weight != null) && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                          {Number(q.effective_weight ?? q.weight ?? 0).toFixed(0)} نقطة
                        </span>
                      )}
                      <div className="w-full mt-1">
                        <p className="text-gray-900 font-medium">{q.text_ar || q.question_text_ar || q.text_en || q.question_text}</p>
                      </div>
                    </div>
                    {(childrenByParent[q.id] || []).map((child) => (
                      <div
                        key={child.id}
                        className="mr-6 mb-4 ml-6 pl-6 border-r-2 border-blue-200"
                      >
                        <div className="flex flex-wrap items-start gap-2">
                          <span className="text-blue-600 text-sm font-medium">↳ سؤال فرعي</span>
                          {child.trigger_answer_value && (
                            <span className="text-xs text-gray-500">
                              يظهر عند: {child.trigger_answer_value}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeBadgeClass(child.question_type)}`}>
                            {QUESTION_TYPE_LABELS[child.question_type] || child.question_type}
                          </span>
                          {(child.effective_weight != null || child.weight != null) && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs">
                              {Number(child.effective_weight ?? child.weight ?? 0).toFixed(0)} نقطة
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 mt-1">{child.text_ar || child.question_text_ar || child.text_en || child.question_text}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateView;
