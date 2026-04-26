import React, { useState } from 'react';

export default function Step5Monitoring({ data, onChange }) {
  const [formData, setFormData] = useState({
    security_approval: data?.security_approval || '',
    security_approval_authority: data?.security_approval_authority || '',
    security_approval_date: data?.security_approval_date || '',
    security_approval_reason: data?.security_approval_reason || '',
    nda_signed: data?.nda_signed || '',
    reporting_frequency: data?.reporting_frequency || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newData = { ...formData, [name]: value };
    setFormData(newData);
    onChange(newData);
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="card-header">الخطوة 5: المراقبة والموافقات</h2>
        <p className="text-gray-600 mb-6">
          معلومات عن الموافقات الأمنية والمراقبة
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              الحصول على الموافقة الأمنية *
              <span className="text-xs font-normal text-gray-500 mr-2">
                (Security Approval Obtained)
              </span>
            </label>
            <div className="flex space-x-4 space-x-reverse">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="security_approval"
                  value="yes"
                  checked={formData.security_approval === 'yes'}
                  onChange={(e) => {
                    handleChange(e);
                    // Clear reason when yes is selected
                    const newData = { ...formData, security_approval: e.target.value, security_approval_reason: '' };
                    setFormData(newData);
                    onChange(newData);
                  }}
                  className="ml-2"
                />
                <span>نعم</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="security_approval"
                  value="no"
                  checked={formData.security_approval === 'no'}
                  onChange={(e) => {
                    handleChange(e);
                    // Clear approval details when no is selected
                    const newData = { ...formData, security_approval: e.target.value, security_approval_authority: '', security_approval_date: '' };
                    setFormData(newData);
                    onChange(newData);
                  }}
                  className="ml-2"
                />
                <span>لا</span>
              </label>
            </div>

            {/* إذا كان نعم - يظهر حقول اسم الجهة وتاريخ الموافقة */}
            {formData.security_approval === 'yes' && (
              <div className="mt-4 bg-green-50 border border-green-300 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    اسم الجهة المانحة للموافقة الأمنية *
                  </label>
                  <input
                    type="text"
                    name="security_approval_authority"
                    value={formData.security_approval_authority}
                    onChange={handleChange}
                    className="input w-full"
                    placeholder="أدخل اسم الجهة المانحة للموافقة..."
                    required={formData.security_approval === 'yes'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    تاريخ الموافقة *
                  </label>
                  <input
                    type="date"
                    name="security_approval_date"
                    value={formData.security_approval_date}
                    onChange={handleChange}
                    className="input w-full"
                    required={formData.security_approval === 'yes'}
                  />
                </div>
              </div>
            )}

            {/* إذا كان لا - يظهر حقل لذكر السبب */}
            {formData.security_approval === 'no' && (
              <div className="mt-4 bg-red-50 border border-red-300 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  يرجى ذكر السبب *
                </label>
                <textarea
                  name="security_approval_reason"
                  value={formData.security_approval_reason}
                  onChange={handleChange}
                  className="input w-full"
                  rows="3"
                  placeholder="أدخل السبب..."
                  required={formData.security_approval === 'no'}
                />
                <p className="text-xs text-red-600 mt-2 font-semibold">
                  ⚠️ مطلوب الحصول على الموافقة الأمنية
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              توقيع اتفاقية السرية (NDA) *
              <span className="text-xs font-normal text-gray-500 mr-2">
                (NDA Signed)
              </span>
            </label>
            <select
              name="nda_signed"
              value={formData.nda_signed}
              onChange={handleChange}
              className="input"
            >
              <option value="">اختر...</option>
              <option value="yes">نعم / Yes</option>
              <option value="no">لا / No</option>
              <option value="not_applicable">لا ينطبق / N/A</option>
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <h3 className="font-semibold text-blue-900 mb-2">📊 ملخص المراقبة والامتثال</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>الموافقة الأمنية:</span>
                <span className={`font-semibold ${
                  formData.security_approval === 'yes' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formData.security_approval === 'yes' ? '✓ مكتملة' : '✗ غير مكتملة'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>اتفاقية السرية:</span>
                <span className={`font-semibold ${
                  formData.nda_signed === 'yes' ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {formData.nda_signed === 'yes' ? '✓ موقعة' : '- غير موقعة'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
