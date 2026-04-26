import React, { useState } from 'react';

export default function Step4Cybersecurity({ data, onChange }) {
  const [formData, setFormData] = useState({
    compliance: data?.compliance || [],
    compliance_levels: data?.compliance_levels || {},
    has_cybersecurity_unit: data?.has_cybersecurity_unit || '',
    security_tools: data?.security_tools || [],
    security_tools_other: data?.security_tools_other || '',
    has_mfa: data?.has_mfa || '',
    user_permissions_review: data?.user_permissions_review || '',
    security_training_program: data?.security_training_program || '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newData = { ...formData };

    // Handle radio buttons differently from checkboxes
    if (type === 'radio') {
      // For radio buttons, set the value directly
      newData[name] = value;
    } else if (type === 'checkbox') {
      // For checkboxes, handle array values
      if (checked) {
        newData[name] = [...(newData[name] || []), value];
        // Initialize compliance level if not exists
        if (name === 'compliance' && !newData.compliance_levels[value]) {
          newData.compliance_levels[value] = '';
        }
      } else {
        newData[name] = (newData[name] || []).filter(item => item !== value);
        // Remove compliance level if unchecked
        if (name === 'compliance') {
          const newLevels = { ...newData.compliance_levels };
          delete newLevels[value];
          newData.compliance_levels = newLevels;
        }
        // Clear other text if "other" is unchecked
        if (name === 'security_tools' && value === 'other') {
          newData.security_tools_other = '';
        }
      }
    } else {
      // For text inputs and other types, set the value directly
      newData[name] = value;
    }

    setFormData(newData);
    onChange(newData);
  };

  const handleComplianceLevelChange = (standard, level) => {
    const newData = {
      ...formData,
      compliance_levels: {
        ...formData.compliance_levels,
        [standard]: level,
      },
    };
    setFormData(newData);
    onChange(newData);
  };

  const complianceStandards = [
    { value: 'ISO 27001', label: 'ISO 27001 - أمن المعلومات', critical: true },
    { value: 'NIST', label: 'NIST Cybersecurity Framework', critical: true },
    { value: 'ISO 27032', label: 'ISO 27032 - الأمن السيبراني', critical: false },
    { value: 'PCI DSS', label: 'PCI DSS - أمن بيانات الدفع', critical: false },
    { value: 'GDPR', label: 'GDPR - حماية البيانات', critical: false },
    { value: 'none', label: 'لا يوجد / None', critical: false },
  ];

  const securityTools = [
    { value: 'firewall', label: 'Firewall - جدار ناري' },
    { value: 'ids_ips', label: 'IDS/IPS - كشف ومنع التسلل' },
    { value: 'iam', label: 'IAM - إدارة الهوية والوصول' },
    { value: 'backup', label: 'Backup Solution - نظام النسخ الاحتياطي' },
    { value: 'antivirus', label: 'Antivirus - مكافح الفيروسات' },
    { value: 'other', label: 'أخرى / Other' },
  ];


  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="card-header">الخطوة 4: الأمن السيبراني</h2>
        <p className="text-gray-600 mb-6">
          معلومات عن معايير الامتثال وأدوات الأمن السيبراني المطبقة
        </p>

        <div className="space-y-6">
          {/* Compliance Standards */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              معايير الامتثال المطبقة *
              <span className="text-xs font-normal text-gray-500 mr-2">
                (Compliance Standards)
              </span>
            </label>
            <div className="space-y-3">
              {complianceStandards.map((standard) => (
                <div
                  key={standard.value}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    formData.compliance.includes(standard.value)
                      ? 'bg-primary-50 border-primary-500'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="compliance"
                      value={standard.value}
                      checked={formData.compliance.includes(standard.value)}
                      onChange={handleChange}
                      className="ml-2"
                    />
                    <span className="flex-1">{standard.label}</span>
                    {standard.critical && (
                      <span className="badge badge-info text-xs">موصى به</span>
                    )}
                  </label>
                  {formData.compliance.includes(standard.value) && (
                    <div className="mt-3 mr-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        مدى تطبيق المعيار *
                      </label>
                      <div className="flex space-x-4 space-x-reverse">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`compliance_level_${standard.value}`}
                            value="full"
                            checked={formData.compliance_levels[standard.value] === 'full'}
                            onChange={() => handleComplianceLevelChange(standard.value, 'full')}
                            className="ml-2"
                          />
                          <span>كلي</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`compliance_level_${standard.value}`}
                            value="partial"
                            checked={formData.compliance_levels[standard.value] === 'partial'}
                            onChange={() => handleComplianceLevelChange(standard.value, 'partial')}
                            className="ml-2"
                          />
                          <span>جزئي</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {formData.compliance.length === 0 && (
              <p className="text-xs text-red-600 mt-2 font-semibold">
                ⚠️ تحذير: لم يتم اختيار أي معايير امتثال
              </p>
            )}
          </div>

          <div className="border-t pt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              هل يوجد وحدة/فريق مختص بالأمن السيبراني؟ *
            </label>
            <div className="flex space-x-4 space-x-reverse">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="has_cybersecurity_unit"
                  value="yes"
                  checked={formData.has_cybersecurity_unit === 'yes'}
                  onChange={handleChange}
                  className="ml-2"
                />
                <span>نعم</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="has_cybersecurity_unit"
                  value="no"
                  checked={formData.has_cybersecurity_unit === 'no'}
                  onChange={handleChange}
                  className="ml-2"
                />
                <span>لا</span>
              </label>
            </div>
          </div>

          {/* Security Tools */}
          <div className="border-t pt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              أدوات وحلول الأمن السيبراني المطبقة *
              <span className="text-xs font-normal text-gray-500 mr-2">
                (Security Tools)
              </span>
            </label>
            <div className="space-y-3">
              {securityTools.map((tool) => (
                <label
                  key={tool.value}
                  className={`flex items-center cursor-pointer p-3 rounded-lg border-2 transition-colors ${
                    formData.security_tools.includes(tool.value)
                      ? 'bg-green-50 border-green-500'
                      : 'bg-white border-gray-200 hover:border-primary-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="security_tools"
                    value={tool.value}
                    checked={formData.security_tools.includes(tool.value)}
                    onChange={handleChange}
                    className="ml-2"
                  />
                  <span className="flex-1">{tool.label}</span>
                  {formData.security_tools.includes(tool.value) && (
                    <span className="text-green-600 text-sm font-semibold mr-2">✓</span>
                  )}
                </label>
              ))}
            </div>
            {formData.security_tools.includes('other') && (
              <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  يرجى تحديد الأدوات الأخرى *
                </label>
                <input
                  type="text"
                  name="security_tools_other"
                  value={formData.security_tools_other}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="مثال: أداة أخرى..."
                  required={formData.security_tools.includes('other')}
                />
              </div>
            )}
          </div>

          <div className="border-t pt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              هل يتم تطبيق المصادقة المتعددة العوامل (MFA) على الأنظمة والخدمات الحساسة؟ *
            </label>
            <div className="flex space-x-4 space-x-reverse">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="has_mfa"
                  value="yes"
                  checked={formData.has_mfa === 'yes'}
                  onChange={handleChange}
                  className="ml-2"
                />
                <span>نعم</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="has_mfa"
                  value="no"
                  checked={formData.has_mfa === 'no'}
                  onChange={handleChange}
                  className="ml-2"
                />
                <span>لا</span>
              </label>
            </div>
          </div>

          <div className="border-t pt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              هل يتم مراجعة صلاحيات المستخدمين بشكل دوري (كل 90 يوم مثلاً)؟ *
            </label>
            <div className="flex space-x-4 space-x-reverse">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="user_permissions_review"
                  value="yes"
                  checked={formData.user_permissions_review === 'yes'}
                  onChange={handleChange}
                  className="ml-2"
                />
                <span>نعم</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="user_permissions_review"
                  value="no"
                  checked={formData.user_permissions_review === 'no'}
                  onChange={handleChange}
                  className="ml-2"
                />
                <span>لا</span>
              </label>
            </div>
          </div>

          <div className="border-t pt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              هل يخضع جميع الموظفين لبرنامج تدريب أمني دوري؟ *
            </label>
            <div className="flex space-x-4 space-x-reverse">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="security_training_program"
                  value="yes"
                  checked={formData.security_training_program === 'yes'}
                  onChange={handleChange}
                  className="ml-2"
                />
                <span>نعم</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="security_training_program"
                  value="no"
                  checked={formData.security_training_program === 'no'}
                  onChange={handleChange}
                  className="ml-2"
                />
                <span>لا</span>
              </label>
            </div>
          </div>

          {/* Security Assessment Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6 mt-6">
            <h3 className="font-bold text-blue-900 mb-4 text-lg">🛡️ تقييم الأمان السريع</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <p className="text-sm text-gray-600">معايير الامتثال</p>
                  <p className="text-2xl font-bold text-primary-700">
                    {formData.compliance.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">إجمالي أدوات الأمان</p>
                  <p className="text-2xl font-bold text-primary-700">
                    {formData.security_tools.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
