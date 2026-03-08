import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const TemplateAssessmentList = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const user = JSON.parse(localStorage.getItem('user'));
  
  const [filters, setFilters] = useState({
    entity_id: '',
    template_id: '',
    status: ''
  });

  const [createForm, setCreateForm] = useState({
    entity_id: user.role === 'entity_user' && user.entity_id ? String(user.entity_id) : '',
    template_id: '',
    year: new Date().getFullYear(),
    quarter: Math.ceil((new Date().getMonth() + 1) / 3)
  });

  useEffect(() => {
    fetchAssessments();
    fetchTemplates();
    fetchEntities();
  }, [filters]);

  useEffect(() => {
    if (user.role === 'entity_user' && entities.length === 1 && !createForm.entity_id) {
      setCreateForm(prev => ({ ...prev, entity_id: String(entities[0].id) }));
    }
  }, [entities, user.role]);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/template-assessments', { params: filters });
      setAssessments(response.data.assessments || []);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      alert('Failed to fetch assessments');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/templates', { params: { is_active: 'true' } });
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchEntities = async () => {
    try {
      const response = await api.get('/entities');
      setEntities(response.data.entities || []);
    } catch (error) {
      console.error('Error fetching entities:', error);
    }
  };

  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    const payload = {
      ...createForm,
      entity_id: createForm.entity_id ? parseInt(createForm.entity_id, 10) : (user.role === 'entity_user' && entities.length === 1 ? entities[0].id : createForm.entity_id),
    };
    try {
      setCreating(true);
      const response = await api.post('/template-assessments/create', payload);
      
      setShowCreateModal(false);
      // الانتقال مباشرة إلى واجهة الإجابة دون رسالة
      navigate(`/template-assessments/${response.data.assessment.id}`);
    } catch (error) {
      console.error('Error creating assessment:', error);
      alert(error.response?.data?.message || 'Failed to create assessment');
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'draft': return 'مسودة';
      case 'submitted': return 'مرسل';
      case 'approved': return 'معتمد';
      case 'rejected': return 'مرفوض';
      default: return status;
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
      <div dir="rtl">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">التقييمات القائمة على القوالب</h1>
              <p className="text-gray-600 mt-1">تقييمات ذكية مع تصحيح تلقائي وتتبع النتائج</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
            >
              <span>+</span>
              <span>إنشاء تقييم جديد</span>
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {(user.role !== 'entity_user' || entities.length > 1) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الجهة</label>
                  <select
                    value={filters.entity_id}
                    onChange={(e) => setFilters({ ...filters, entity_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">جميع الجهات</option>
                    {entities.map(entity => (
                      <option key={entity.id} value={entity.id}>{entity.name_ar || entity.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">القالب</label>
                <select
                  value={filters.template_id}
                  onChange={(e) => setFilters({ ...filters, template_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">جميع القوالب</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>{template.name_ar}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">جميع الحالات</option>
                  <option value="draft">مسودة</option>
                  <option value="submitted">مرسل</option>
                  <option value="approved">معتمد</option>
                  <option value="rejected">مرفوض</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ entity_id: '', template_id: '', status: '' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  إعادة تعيين
                </button>
              </div>
            </div>
          </div>

          {/* Assessments List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">جارٍ التحميل...</p>
            </div>
          ) : assessments.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500 text-lg mb-4">لا توجد تقييمات</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-blue-600 hover:text-blue-700"
              >
                إنشاء التقييم الأول
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {assessments.map(assessment => (
                <div
                  key={assessment.id}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/template-assessments/${assessment.id}`)}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(assessment.status)}`}>
                            {getStatusText(assessment.status)}
                          </span>
                          
                          {assessment.risk_level && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(assessment.risk_level)}`}>
                              المخاطر: {assessment.risk_level}
                            </span>
                          )}
                          
                          <span className="text-xs text-gray-500">
                            {assessment.year} - Q{assessment.quarter}
                          </span>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {assessment.template_name_ar}
                        </h3>
                        <p className="text-gray-600 text-sm mb-2">{assessment.template_name}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>📍 {assessment.entity_name_ar}</span>
                          <span>👤 {assessment.created_by_name}</span>
                          <span>📅 {new Date(assessment.created_at).toLocaleDateString('ar-IQ')}</span>
                        </div>
                      </div>
                      
                      <div className="text-center mr-6">
                        <div className="text-4xl font-bold text-blue-600">
                          {assessment.percentage_score != null ? Number(assessment.percentage_score).toFixed(1) : '0.0'}%
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {assessment.total_achieved_score != null ? Number(assessment.total_achieved_score).toFixed(0) : '0'} / {assessment.total_possible_score || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Assessment Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">إنشاء تقييم جديد</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="text-2xl">×</span>
                  </button>
                </div>

                <form onSubmit={handleCreateAssessment} className="space-y-6">
                  {(user.role !== 'entity_user' || entities.length > 1) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الجهة *
                      </label>
                      <select
                        value={createForm.entity_id}
                        onChange={(e) => setCreateForm({ ...createForm, entity_id: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">-- اختر جهة --</option>
                        {entities.map(entity => (
                          <option key={entity.id} value={entity.id}>
                            {entity.name_ar || entity.name} {entity.name && entity.name !== entity.name_ar ? `(${entity.name})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {user.role === 'entity_user' && entities.length === 1 && (
                    <input type="hidden" name="entity_id" value={createForm.entity_id || entities[0]?.id} />
                  )}
                  {user.role === 'entity_user' && entities.length === 1 && (
                    <p className="text-sm text-gray-600">الجهة: <strong>{entities[0]?.name_ar || entities[0]?.name}</strong></p>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      القالب *
                    </label>
                    <select
                      value={createForm.template_id}
                      onChange={(e) => setCreateForm({ ...createForm, template_id: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">-- اختر قالب --</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name_ar} ({template.question_count} سؤال - {template.total_weight} نقطة)
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        السنة
                      </label>
                      <input
                        type="number"
                        value={createForm.year}
                        onChange={(e) => setCreateForm({ ...createForm, year: parseInt(e.target.value) })}
                        min="2020"
                        max="2030"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الربع
                      </label>
                      <select
                        value={createForm.quarter}
                        onChange={(e) => setCreateForm({ ...createForm, quarter: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="1">الربع الأول (Q1)</option>
                        <option value="2">الربع الثاني (Q2)</option>
                        <option value="3">الربع الثالث (Q3)</option>
                        <option value="4">الربع الرابع (Q4)</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      💡 سيتم إنشاء التقييم تلقائياً مع ملء الإجابات المرتبطة بالبيانات الثابتة.
                      يمكنك بعد ذلك إكمال الأسئلة اليدوية وإرسال التقييم.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {creating ? 'جارٍ الإنشاء...' : 'إنشاء التقييم'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default TemplateAssessmentList;
