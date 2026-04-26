import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { categoriesService } from '../services';
import { useNavigate } from 'react-router-dom';

const TemplateList = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    search: ''
  });

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, [filters]);
  
  const fetchCategories = async () => {
    try {
      const data = await categoriesService.getAll({ is_active: true });
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/templates', { params: filters });
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      alert('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to deactivate this template?')) return;
    
    try {
      await api.delete(`/templates/${id}`);
      alert('Template deactivated successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert(error.response?.data?.message || 'Failed to delete template');
    }
  };

  const handleDuplicate = async (id) => {
    const newName = prompt('Enter name for the duplicated template:');
    if (!newName) return;
    
    const newNameAr = prompt('Enter Arabic name for the duplicated template:');
    if (!newNameAr) return;
    
    try {
      await api.post(`/templates/${id}/duplicate`, {
        new_name: newName,
        new_name_ar: newNameAr
      });
      alert('Template duplicated successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      alert('Failed to duplicate template');
    }
  };

  return (
      <div dir="rtl">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">قوالب التقييم</h1>
              <p className="text-gray-600 mt-1">إدارة قوالب التقييم القابلة لإعادة الاستخدام</p>
            </div>
            <button
              onClick={() => navigate('/templates/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
            >
              <span>+</span>
              <span>إنشاء قالب جديد</span>
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">البحث</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="ابحث في القوالب..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">التصنيف</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">جميع التصنيفات</option>
                  <option value="security">أمن</option>
                  <option value="maturity">نضج</option>
                  <option value="infrastructure">بنية تحتية</option>
                  <option value="compliance">امتثال</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ category: '', search: '' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  إعادة تعيين
                </button>
              </div>
            </div>
          </div>

          {/* Templates Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">جارٍ التحميل...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500 text-lg">لا توجد قوالب</p>
              <button
                onClick={() => navigate('/templates/new')}
                className="mt-4 text-blue-600 hover:text-blue-700"
              >
                إنشاء القالب الأول
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(template => (
                <div key={template.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        {(template.category_name_ar || template.category) && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium inline-block mb-2">
                            {template.category_name_ar || template.category}
                          </span>
                        )}
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {template.name_ar}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{template.name}</p>
                      </div>
                      
                      <span className="text-xs text-gray-500">v{template.version}</span>
                    </div>
                    
                    {template.description_ar && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {template.description_ar}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mb-4 pb-4 border-b">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {template.question_count || 0}
                        </div>
                        <div className="text-xs text-gray-600">أسئلة</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {Number(template.total_weight || 0).toFixed(0)}
                        </div>
                        <div className="text-xs text-gray-600">إجمالي النقاط</div>
                      </div>
                      
                      <div className="text-center">
                        <div className={`text-sm font-medium ${template.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                          {template.is_active ? 'نشط' : 'معطل'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/templates/${template.id}`)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        عرض
                      </button>
                      <button
                        onClick={() => navigate(`/templates/${template.id}/edit`)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        تعديل
                      </button>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => navigate(`/templates/${template.id}/weights`)}
                        className="w-full px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100 text-sm font-medium flex items-center justify-center gap-2"
                        title="فتح مدير توزيع الأوزان — يتيح ضبط أوزان المحاور والأسئلة بدقة"
                      >
                        ⚖ توزيع الأوزان
                      </button>
                    </div>
                    
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleDuplicate(template.id)}
                        className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        نسخ
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="flex-1 px-4 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                      >
                        حذف
                      </button>
                    </div>
                    
                    {template.created_by_name && (
                      <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                        أنشأه: {template.created_by_name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  );
};

export default TemplateList;
