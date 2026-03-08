import React, { useState } from 'react';

export default function Step6Advanced({ data, onChange }) {
  const [formData, setFormData] = useState({
    has_subsidiaries: data?.has_subsidiaries || '',
    subsidiary_count: data?.subsidiary_count || '',
    has_external_security_auditor: data?.has_external_security_auditor || '',
    external_security_auditor_name: data?.external_security_auditor_name || '',
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let newData = { ...formData };

    if (type === 'radio') {
      newData[name] = value;
      // Clear related fields when changing selection
      if (name === 'has_subsidiaries' && value === 'no') {
        newData.subsidiary_count = '';
      }
      if (name === 'has_external_security_auditor' && value === 'no') {
        newData.external_security_auditor_name = '';
      }
    } else {
      newData[name] = value;
    }

    setFormData(newData);
    onChange(newData);
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="card-header">الخطوة 6: معلومات الفروع</h2>
        <p className="text-gray-600 mb-6">
          معلومات عن الفروع والمدققين الأمنيين الخارجيين
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-4">معلومات الفروع</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  هل لديكم فروع أو جهات تابعة؟ *
                  <span className="text-xs font-normal text-gray-500 mr-2">
                    (Has Subsidiaries/Branches)
                  </span>
                </label>
                <div className="flex space-x-4 space-x-reverse">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="has_subsidiaries"
                      value="yes"
                      checked={formData.has_subsidiaries === 'yes'}
                      onChange={handleChange}
                      className="ml-2"
                    />
                    <span>نعم / Yes</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="has_subsidiaries"
                      value="no"
                      checked={formData.has_subsidiaries === 'no'}
                      onChange={handleChange}
                      className="ml-2"
                    />
                    <span>لا / No</span>
                  </label>
                </div>

                {formData.has_subsidiaries === 'yes' && (
                  <div className="mt-4 bg-gray-50 p-4 rounded-lg border-2 border-primary-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      عدد الفروع/الجهات التابعة *
                      <span className="text-xs font-normal text-gray-500 mr-2">
                        (Number of Subsidiaries)
                      </span>
                    </label>
                    <input
                      type="number"
                      name="subsidiary_count"
                      value={formData.subsidiary_count}
                      onChange={handleChange}
                      className="input"
                      placeholder="0"
                      min="1"
                      required={formData.has_subsidiaries === 'yes'}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">المدقق الأمني الخارجي</h3>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                هل يوجد مدقق أمن معلومات خارجي أو جهة سيبرانية تقدم الخدمة؟ *
              </label>
              <div className="flex space-x-4 space-x-reverse">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="has_external_security_auditor"
                    value="yes"
                    checked={formData.has_external_security_auditor === 'yes'}
                    onChange={handleChange}
                    className="ml-2"
                  />
                  <span>نعم</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="has_external_security_auditor"
                    value="no"
                    checked={formData.has_external_security_auditor === 'no'}
                    onChange={handleChange}
                    className="ml-2"
                  />
                  <span>لا</span>
                </label>
              </div>

              {formData.has_external_security_auditor === 'yes' && (
                <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    يرجى ذكر اسم المدقق أو الجهة السيبرانية *
                  </label>
                  <input
                    type="text"
                    name="external_security_auditor_name"
                    value={formData.external_security_auditor_name}
                    onChange={handleChange}
                    className="input w-full"
                    placeholder="أدخل اسم المدقق الأمني أو الجهة السيبرانية..."
                    required={formData.has_external_security_auditor === 'yes'}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <h3 className="font-semibold text-blue-900 mb-2">📊 ملخص معلومات الفروع</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>فروع/جهات تابعة:</span>
                <span className={`font-semibold ${
                  formData.has_subsidiaries === 'yes' ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {formData.has_subsidiaries === 'yes' 
                    ? `✓ نعم (${formData.subsidiary_count || 0})` 
                    : '✗ لا'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>مدقق أمني خارجي:</span>
                <span className={`font-semibold ${
                  formData.has_external_security_auditor === 'yes' ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {formData.has_external_security_auditor === 'yes' 
                    ? `✓ ${formData.external_security_auditor_name || 'تم التحديد'}` 
                    : '✗ لا يوجد'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
