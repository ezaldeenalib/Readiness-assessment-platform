import React, { useState, useEffect } from 'react';
import { categoriesService } from '../services';
import { useNavigate } from 'react-router-dom';

const CategoryManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    is_active: true
  });
  const [filter, setFilter] = useState({
    is_active: '',
    search: ''
  });

  useEffect(() => {
    fetchCategories();
  }, [filter]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showForm) resetForm();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showForm]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const params = { ...filter };
      if (params.is_active === '') delete params.is_active;
      const data = await categoriesService.getAll(params);
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      alert('فشل تحميل الفئات: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingCategory) {
        await categoriesService.update(editingCategory.id, formData);
        alert('تم تحديث الفئة بنجاح');
      } else {
        await categoriesService.create(formData);
        alert('تم إنشاء الفئة بنجاح');
      }
      resetForm();
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('فشل حفظ الفئة: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name_en: category.name_en,
      name_ar: category.name_ar,
      description_en: category.description_en || '',
      description_ar: category.description_ar || '',
      is_active: category.is_active
    });
    setShowForm(true);
  };

  const handleToggle = async (category) => {
    if (!confirm(`هل أنت متأكد من ${category.is_active ? 'تعطيل' : 'تفعيل'} الفئة "${category.name_ar}"؟`)) return;
    try {
      setLoading(true);
      await categoriesService.toggle(category.id);
      alert(`تم ${category.is_active ? 'تعطيل' : 'تفعيل'} الفئة بنجاح`);
      fetchCategories();
    } catch (error) {
      console.error('Error toggling category:', error);
      alert('فشل تغيير حالة الفئة: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (category) => {
    if (!confirm(`هل أنت متأكد من حذف الفئة "${category.name_ar}"؟`)) return;
    try {
      setLoading(true);
      await categoriesService.delete(category.id);
      alert('تم حذف الفئة بنجاح');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('فشل حذف الفئة: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name_en: '',
      name_ar: '',
      description_en: '',
      description_ar: '',
      is_active: true
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  return (
    <div dir="rtl" className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-4 text-sm font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          العودة إلى لوحة التحكم
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">إدارة الفئات</h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">إدارة الفئات المركزي للأسئلة والقوالب والأقسام</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm ${
              showForm
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
            }`}
          >
            {showForm ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                إلغاء
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                إضافة فئة جديدة
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">البحث والتصفية</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-2">البحث بالاسم</label>
            <input
              type="text"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              placeholder="ابحث بالاسم العربي أو الإنجليزي..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">الحالة</label>
            <select
              value={filter.is_active}
              onChange={(e) => setFilter({ ...filter, is_active: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
            >
              <option value="">الكل</option>
              <option value="true">نشط فقط</option>
              <option value="false">معطل فقط</option>
            </select>
          </div>
        </div>
      </div>

      {/* Modal - إضافة / تعديل الفئة */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && resetForm()}
        >
          <div
            dir="rtl"
            className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* رأس النموذج */}
            <div className="flex items-start justify-between gap-4 bg-gradient-to-l from-blue-50 to-white px-6 sm:px-8 py-6 border-b border-gray-100 shrink-0">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {editingCategory ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
                  </h2>
                  <p className="text-gray-500 mt-1 text-sm">
                    {editingCategory ? 'تحديث بيانات الفئة وتصنيفاتها' : 'أضف فئة لتصنيف الأسئلة والقوالب والأقسام'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                aria-label="إغلاق"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 overflow-y-auto flex-1">
            {/* قسم المحتوى العربي */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-6 rounded-full bg-blue-500"></span>
                <h3 className="text-base font-bold text-gray-800">المحتوى العربي</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2 sm:max-w-md">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم بالعربية <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.name_ar}
                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                    required
                    placeholder="مثال: الأمن السيبراني"
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:text-gray-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">الوصف بالعربية</label>
                  <textarea
                    value={formData.description_ar}
                    onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                    rows={3}
                    placeholder="وصف مختصر يوضح محتوى هذه الفئة..."
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-none placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* قسم المحتوى الإنجليزي */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-6 rounded-full bg-slate-500"></span>
                <h3 className="text-base font-bold text-gray-800">المحتوى الإنجليزي</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2 sm:max-w-md">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم بالإنجليزية <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    required
                    placeholder="e.g. Cybersecurity"
                    dir="ltr"
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-left placeholder:text-gray-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">الوصف بالإنجليزية</label>
                  <textarea
                    value={formData.description_en}
                    onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                    rows={3}
                    placeholder="Brief description of this category..."
                    dir="ltr"
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-none text-left placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* الحالة والأزرار */}
            <div className="pt-6 border-t-2 border-dashed border-gray-100 space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/80">
                <div>
                  <p className="font-semibold text-gray-800">حالة الفئة</p>
                  <p className="text-sm text-gray-500">الفئات النشطة تظهر في قوائم الاختيار</p>
                </div>
                <label className="relative inline-flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-8 bg-gray-200 rounded-full peer peer-checked:bg-emerald-500 peer-focus:ring-4 peer-focus:ring-emerald-200 transition-all relative">
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all duration-200 ${formData.is_active ? 'left-1' : 'right-1'}`}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {formData.is_active ? 'نشط' : 'معطل'}
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-200/50 hover:shadow-lg hover:shadow-blue-200/50"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      جاري الحفظ...
                    </span>
                  ) : editingCategory ? (
                    'حفظ التغييرات'
                  ) : (
                    'إنشاء الفئة'
                  )}
                </button>
              </div>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading && !showForm ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">جاري التحميل...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">لا توجد فئات</h3>
            <p className="text-gray-500 text-sm text-center mb-6">ابدأ بإضافة فئة جديدة للأسئلة والقوالب</p>
            <button
              onClick={() => { setShowForm(true); setEditingCategory(null); setFormData({ name_en: '', name_ar: '', description_en: '', description_ar: '', is_active: true }); }}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
            >
              + إضافة أول فئة
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">الفئة</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">الاستخدام</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">الحالة</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((category) => (
                  <tr
                    key={category.id}
                    className={`hover:bg-gray-50/50 transition-colors ${!category.is_active ? 'bg-gray-50/30' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{category.name_ar}</span>
                        <span className="text-sm text-gray-500">{category.name_en}</span>
                        {category.description_ar && (
                          <span className="text-xs text-gray-400 mt-1 line-clamp-2">{category.description_ar}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="inline-flex items-center gap-1.5 text-gray-600">
                          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                          {category.questions_count || 0} أسئلة
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-gray-600">
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                          {category.templates_count || 0} قوالب
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-gray-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          {category.sections_count || 0} أقسام
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                        category.is_active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${category.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                        {category.is_active ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          تعديل
                        </button>
                        <button
                          onClick={() => handleToggle(category)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            category.is_active
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {category.is_active ? 'تعطيل' : 'تفعيل'}
                        </button>
                        {(category.questions_count === 0 && category.templates_count === 0 && category.sections_count === 0) && (
                          <button
                            onClick={() => handleDelete(category)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            حذف
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryManagement;
