import React, { useState, useEffect } from 'react';
import { entityService } from '../services';

export default function EntityManagement({ user }) {
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    activity_type: 'government',
    parent_entity_id: null,
    contact_email: '',
    contact_phone: '',
    address: '',
  });

  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      setLoading(true);
      const data = await entityService.getAll({ include_children: true });
      setEntities(data);
    } catch (error) {
      alert('فشل تحميل الجهات: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEntity) {
        await entityService.update(editingEntity.id, formData);
        alert('تم التحديث بنجاح');
      } else {
        await entityService.create(formData);
        alert('تم الإضافة بنجاح');
      }
      setShowModal(false);
      setEditingEntity(null);
      resetForm();
      loadEntities();
    } catch (error) {
      alert('فشل الحفظ: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEdit = (entity) => {
    setEditingEntity(entity);
    setFormData({
      name: entity.name,
      name_ar: entity.name_ar,
      activity_type: entity.activity_type,
      parent_entity_id: entity.parent_entity_id,
      contact_email: entity.contact_email || '',
      contact_phone: entity.contact_phone || '',
      address: entity.address || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      name_ar: '',
      activity_type: 'government',
      parent_entity_id: null,
      contact_email: '',
      contact_phone: '',
      address: '',
    });
  };

  const activityTypeLabels = {
    government: 'حكومي',
    mixed: 'مختلط',
    private: 'خاص',
  };

  const handleAddBranch = (parentEntity) => {
    resetForm();
    setFormData({
      ...formData,
      parent_entity_id: parentEntity.id,
    });
    setEditingEntity(null);
    setShowModal(true);
  };

  const handleDelete = async (entity) => {
    // Check if entity has children
    const children = childEntities.filter(c => c.parent_entity_id === entity.id);
    if (children.length > 0) {
      alert('⚠️ لا يمكن حذف هذه الجهة لأنها تحتوي على فروع. يرجى حذف أو نقل الفروع أولاً.');
      return;
    }

    const confirmMessage = `هل أنت متأكد من حذف الجهة "${entity.name_ar || entity.name}"؟\n\n⚠️ تحذير: سيتم حذف جميع البيانات المرتبطة بهذه الجهة بشكل نهائي ولا يمكن استرجاعها.`;
    
    if (confirm(confirmMessage)) {
      try {
        await entityService.delete(entity.id);
        alert('تم الحذف بنجاح');
        loadEntities();
      } catch (error) {
        alert('فشل الحذف: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const blob = await entityService.exportPDF();
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `تقرير_الجهات_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('فشل تصدير PDF: ' + (error.response?.data?.error || error.message));
    } finally {
      setExportingPDF(false);
    }
  };

  // Separate entities into parents and children
  const parentEntities = entities.filter(e => !e.parent_entity_id);
  const childEntities = entities.filter(e => e.parent_entity_id);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">إدارة الجهات والفروع</h1>
          <p className="text-gray-600">إدارة الوزارات والجهات التابعة لها</p>
        </div>
        <div className="flex space-x-3 space-x-reverse">
          <button
            onClick={handleExportPDF}
            disabled={exportingPDF || entities.length === 0}
            className="btn btn-success"
            title="تصدير تقرير PDF للجهات"
          >
            {exportingPDF ? (
              <>
                <span className="spinner-small mr-2"></span>
                جاري التصدير...
              </>
            ) : (
              <>
                📄 تصدير PDF
              </>
            )}
          </button>
          <button
            onClick={() => {
              resetForm();
              setEditingEntity(null);
              setShowModal(true);
            }}
            className="btn btn-primary"
          >
            + إضافة وزارة/جهة جديدة
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Parent Entities (Ministries) */}
          {parentEntities.map((parent) => {
            const children = childEntities.filter(c => c.parent_entity_id === parent.id);
            return (
              <div key={parent.id} className="card">
                <div className="bg-primary-50 border-b-2 border-primary-200 p-4 flex justify-between items-center">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="bg-primary-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl">
                      {parent.id}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{parent.name_ar || parent.name}</h3>
                      <p className="text-sm text-gray-600">{parent.name}</p>
                      <div className="flex items-center space-x-2 space-x-reverse mt-1">
                        <span className="badge badge-info text-xs">
                          {activityTypeLabels[parent.activity_type]}
                        </span>
                        <span className="text-xs text-gray-500">
                          📧 {parent.contact_email || 'لا يوجد بريد'}
                        </span>
                        {children.length > 0 && (
                          <span className="badge badge-success text-xs">
                            {children.length} فرع
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2 space-x-reverse">
                    <button
                      onClick={() => handleAddBranch(parent)}
                      className="btn btn-success text-sm"
                    >
                      + إضافة فرع
                    </button>
                    <button
                      onClick={() => handleEdit(parent)}
                      className="btn btn-outline text-sm"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDelete(parent)}
                      className="btn btn-danger text-sm"
                      title="حذف الجهة"
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>

                {/* Child Entities (Branches) */}
                {children.length > 0 ? (
                  <div className="p-4">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>اسم الفرع</th>
                          <th>النوع</th>
                          <th>البريد الإلكتروني</th>
                          <th>الهاتف</th>
                          <th>إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {children.map((child) => (
                          <tr key={child.id}>
                            <td>
                              <span className="bg-gray-200 px-2 py-1 rounded text-sm font-mono">
                                {child.id}
                              </span>
                            </td>
                            <td>
                              <div>
                                <div className="font-semibold">{child.name_ar || child.name}</div>
                                <div className="text-xs text-gray-500">{child.name}</div>
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-info text-xs">
                                {activityTypeLabels[child.activity_type]}
                              </span>
                            </td>
                            <td className="text-sm">{child.contact_email || '-'}</td>
                            <td className="text-sm">{child.contact_phone || '-'}</td>
                            <td>
                              <div className="flex space-x-2 space-x-reverse">
                                <button
                                  onClick={() => handleEdit(child)}
                                  className="text-primary-600 hover:text-primary-800 font-semibold text-sm"
                                >
                                  تعديل
                                </button>
                                <button
                                  onClick={() => handleDelete(child)}
                                  className="text-red-600 hover:text-red-800 font-semibold text-sm"
                                  title="حذف الفرع"
                                >
                                  🗑️ حذف
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    <p>لا توجد فروع لهذه الجهة بعد</p>
                    <button
                      onClick={() => handleAddBranch(parent)}
                      className="text-primary-600 hover:text-primary-800 font-semibold text-sm mt-2"
                    >
                      + إضافة أول فرع
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Orphan entities without parent */}
          {childEntities.filter(c => !parentEntities.find(p => p.id === c.parent_entity_id)).length > 0 && (
            <div className="card">
              <div className="bg-yellow-50 border-b-2 border-yellow-200 p-4">
                <h3 className="text-lg font-bold text-gray-800">جهات بدون وزارة أم</h3>
              </div>
              <div className="p-4">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>الاسم</th>
                      <th>النوع</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {childEntities.filter(c => !parentEntities.find(p => p.id === c.parent_entity_id)).map((entity) => (
                      <tr key={entity.id}>
                        <td>{entity.id}</td>
                        <td className="font-semibold">{entity.name_ar || entity.name}</td>
                        <td>
                          <span className="badge badge-info">
                            {activityTypeLabels[entity.activity_type]}
                          </span>
                        </td>
                        <td>
                          <div className="flex space-x-2 space-x-reverse">
                            <button
                              onClick={() => handleEdit(entity)}
                              className="text-primary-600 hover:text-primary-800 font-semibold"
                            >
                              تعديل
                            </button>
                            <button
                              onClick={() => handleDelete(entity)}
                              className="text-red-600 hover:text-red-800 font-semibold"
                              title="حذف الجهة"
                            >
                              🗑️ حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingEntity ? 'تعديل جهة' : 'إضافة جهة جديدة'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      الاسم بالإنجليزية *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      الاسم بالعربية *
                    </label>
                    <input
                      type="text"
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      نوع النشاط *
                    </label>
                    <select
                      value={formData.activity_type}
                      onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
                      className="input"
                      required
                    >
                      <option value="government">حكومي</option>
                      <option value="mixed">مختلط</option>
                      <option value="private">خاص</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      الوزارة/الجهة الأم
                      <span className="text-xs text-gray-500 font-normal mr-2">
                        (اختياري - اتركه فارغاً إذا كانت وزارة رئيسية)
                      </span>
                    </label>
                    <select
                      value={formData.parent_entity_id || ''}
                      onChange={(e) => setFormData({ ...formData, parent_entity_id: e.target.value || null })}
                      className="input"
                    >
                      <option value="">-- وزارة رئيسية (بدون جهة أم) --</option>
                      {parentEntities.map((entity) => (
                        <option 
                          key={entity.id} 
                          value={entity.id}
                          disabled={editingEntity && editingEntity.id === entity.id}
                        >
                          {entity.name_ar || entity.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    العنوان
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="input"
                    rows="3"
                  />
                </div>

                <div className="flex justify-end space-x-4 space-x-reverse pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingEntity(null);
                      resetForm();
                    }}
                    className="btn btn-secondary"
                  >
                    إلغاء
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingEntity ? 'تحديث' : 'إضافة'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
