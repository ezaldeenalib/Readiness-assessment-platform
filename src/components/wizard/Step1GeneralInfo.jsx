import React, { useState } from 'react';

export default function Step1GeneralInfo({ data, onChange }) {
  const [formData, setFormData] = useState({
    total_employees: data?.total_employees || '',
    it_staff: data?.it_staff || '',
    cybersecurity_staff: data?.cybersecurity_staff || '',
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
        <h2 className="card-header">الخطوة 1: المعلومات العامة</h2>
        <p className="text-gray-600 mb-6">
          يرجى إدخال المعلومات الأساسية عن الجهة والموظفين
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              إجمالي عدد الموظفين *
              <span className="text-xs font-normal text-gray-500 mr-2">
                (Total Employees)
              </span>
            </label>
            <input
              type="number"
              name="total_employees"
              value={formData.total_employees}
              onChange={handleChange}
              className="input"
              placeholder="أدخل العدد الإجمالي للموظفين"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              عدد موظفي تقنية المعلومات *
              <span className="text-xs font-normal text-gray-500 mr-2">
                (IT Staff)
              </span>
            </label>
            <input
              type="number"
              name="it_staff"
              value={formData.it_staff}
              onChange={handleChange}
              className="input"
              placeholder="أدخل عدد موظفي تقنية المعلومات"
              min="0"
              required
            />
            {formData.total_employees > 0 && formData.it_staff > 0 && (
              <p className="text-xs text-gray-600 mt-1">
                النسبة: {((formData.it_staff / formData.total_employees) * 100).toFixed(2)}%
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              عدد موظفي الأمن السيبراني *
              <span className="text-xs font-normal text-gray-500 mr-2">
                (Cybersecurity Staff)
              </span>
            </label>
            <input
              type="number"
              name="cybersecurity_staff"
              value={formData.cybersecurity_staff}
              onChange={handleChange}
              className="input"
              placeholder="أدخل عدد موظفي الأمن السيبراني"
              min="0"
              required
            />
            {formData.total_employees > 0 && formData.cybersecurity_staff > 0 && (
              <div className="mt-1">
                <p className="text-xs text-gray-600">
                  النسبة: {((formData.cybersecurity_staff / formData.total_employees) * 100).toFixed(2)}%
                </p>
                {(formData.cybersecurity_staff / formData.total_employees) < 0.01 && (
                  <p className="text-xs text-red-600 font-semibold">
                    ⚠️ تحذير: نسبة موظفي الأمن السيبراني أقل من 1% (موصى به على الأقل 1%)
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <h3 className="font-semibold text-blue-900 mb-2">📊 ملخص الموظفين</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>إجمالي الموظفين:</span>
                <span className="font-semibold">{formData.total_employees || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>موظفو تقنية المعلومات:</span>
                <span className="font-semibold">{formData.it_staff || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>موظفو الأمن السيبراني:</span>
                <span className="font-semibold">{formData.cybersecurity_staff || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
