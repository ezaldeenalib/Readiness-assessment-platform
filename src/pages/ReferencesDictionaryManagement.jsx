/**
 * References Dictionary Management
 * إدارة قاموس المراجع (reference_dictionary)
 * نوع المرجع مرتبط بجدول الفئات (master_categories) عبر المفتاح الأجنبي category_id
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { referencesService, categoriesService } from '../services';

export default function ReferencesDictionaryManagement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [references, setReferences] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRef, setEditingRef] = useState(null);
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [formData, setFormData] = useState({
    category_id: '',
    name_en: '',
    name_ar: '',
    display_order: 0
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadReferences();
  }, [filterCategoryId]);

  const loadCategories = async () => {
    try {
      const data = await categoriesService.getAll({ is_active: true });
      setCategories(data);
      if (data.length && !filterCategoryId) setFilterCategoryId(String(data[0].id));
    } catch (e) {
      console.error(e);
    }
  };

  const loadReferences = async () => {
    try {
      setLoading(true);
      const params = filterCategoryId ? { category_id: filterCategoryId } : {};
      const data = await referencesService.getAll(params);
      setReferences(data);
    } catch (e) {
      console.error(e);
      alert('فشل تحميل المراجع');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category_id || !formData.name_ar) {
      alert('يرجى اختيار الفئة (نوع المرجع) والاسم بالعربية');
      return;
    }
    try {
      setLoading(true);
      if (editingRef) {
        await referencesService.update(editingRef.id, formData);
        alert('تم التحديث بنجاح');
      } else {
        await referencesService.create(formData);
        alert('تم الإنشاء بنجاح');
      }
      resetForm();
      loadReferences();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ref) => {
    setEditingRef(ref);
    setFormData({
      category_id: ref.category_id ? String(ref.category_id) : '',
      name_en: ref.name_en || '',
      name_ar: ref.name_ar || '',
      display_order: ref.display_order ?? 0
    });
    setShowForm(true);
  };

  const handleToggle = async (ref) => {
    if (!confirm(`هل تريد ${ref.is_active ? 'تعطيل' : 'تفعيل'} "${ref.name_ar}"؟`)) return;
    try {
      setLoading(true);
      await referencesService.toggle(ref.id);
      alert('تم التحديث');
      loadReferences();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ref) => {
    if (!confirm(`حذف "${ref.name_ar}"؟`)) return;
    try {
      setLoading(true);
      await referencesService.delete(ref.id);
      alert('تم الحذف');
      loadReferences();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل الحذف - قد يكون قيد الاستخدام');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      category_id: filterCategoryId || (categories[0]?.id ? String(categories[0].id) : ''),
      name_en: '',
      name_ar: '',
      display_order: references.length + 1
    });
    setEditingRef(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    setFormData({
      category_id: filterCategoryId || (categories[0]?.id ? String(categories[0].id) : ''),
      name_en: '',
      name_ar: '',
      display_order: references.length + 1
    });
    setEditingRef(null);
    setShowForm(true);
  };

  return (
    <div dir="rtl" className="max-w-7xl mx-auto p-6">
      <button
        onClick={() => navigate('/dashboard')}
        className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
      >
        <span>→</span>
        <span>العودة إلى لوحة التحكم</span>
      </button>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">قاموس المراجع</h1>
          <p className="text-gray-600 mt-1">إدارة المرجعيات للأسئلة المركبة واختيار من متعدد</p>
        </div>
        <button
          onClick={openAddForm}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
        >
          + إضافة مرجع جديد
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">الفئة (نوع المرجع)</label>
        <select
          value={filterCategoryId}
          onChange={(e) => setFilterCategoryId(e.target.value)}
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">الكل</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name_ar || c.name_en}</option>
          ))}
        </select>
        {categories.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">
            لا توجد فئات. <a href="/categories" className="text-blue-600 hover:underline">أنشئ فئات من إدارة الفئات</a>
          </p>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {editingRef ? 'تعديل المراجع' : 'إضافة مرجع جديد'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الفئة (نوع المرجع) *</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={!!editingRef}
                >
                  <option value="">اختر الفئة</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name_ar || c.name_en}</option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    لا توجد فئات. <a href="/categories" className="text-blue-600 hover:underline">أنشئ فئة أولاً</a>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الاسم (عربي) *</label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  required
                  placeholder="نوع الأصل"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الاسم (إنجليزي)</label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  placeholder="Asset Type"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ترتيب العرض</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={resetForm} className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                إلغاء
              </button>
              <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'جارٍ الحفظ...' : editingRef ? 'حفظ' : 'إنشاء'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading && references.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفئة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم (عربي)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم (إنجليزي)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الترتيب</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {references.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    لا توجد مراجع
                  </td>
                </tr>
              ) : (
                references.map((r) => (
                  <tr key={r.id} className={!r.is_active ? 'bg-gray-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.category_name_ar || r.category_name_en || r.type || '—'}</td>
                    <td className="px-6 py-4">{r.name_ar}</td>
                    <td className="px-6 py-4">{r.name_en || '—'}</td>
                    <td className="px-6 py-4">{r.display_order ?? 0}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${r.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {r.is_active ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button onClick={() => handleEdit(r)} className="text-blue-600 hover:text-blue-900 ml-3">تعديل</button>
                      <button onClick={() => handleToggle(r)} className={r.is_active ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}>
                        {r.is_active ? 'تعطيل' : 'تفعيل'}
                      </button>
                      <button onClick={() => handleDelete(r)} className="text-red-600 hover:text-red-900">حذف</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
