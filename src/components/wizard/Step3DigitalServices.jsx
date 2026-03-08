import React, { useState } from 'react';

export default function Step3DigitalServices({ data, onChange }) {
  const [formData, setFormData] = useState({
    services: data?.services || [],
    services_other: data?.services_other || '',
    service_details: data?.service_details || '',
    services_documented: data?.services_documented || '',
    has_official_website: data?.has_official_website || '',
    website_managed_by: data?.website_managed_by || '',
    website_external_company_name: data?.website_external_company_name || '',
    domain_type: data?.domain_type || '',
    domain_type_other: data?.domain_type_other || '',
    has_official_email: data?.has_official_email || '',
    email_domain_name: data?.email_domain_name || '',
    email_type: data?.email_type || '',
    email_users: data?.email_users || '',
    email_protection: data?.email_protection || '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newData = { ...formData };

    if (type === 'checkbox') {
      if (checked) {
        newData[name] = [...(newData[name] || []), value];
      } else {
        newData[name] = (newData[name] || []).filter(item => item !== value);
        // Clear other text if "other" is unchecked
        if (name === 'services' && value === 'other') {
          newData.services_other = '';
        }
      }
    } else {
      newData[name] = value;
    }

    setFormData(newData);
    onChange(newData);
  };

  const serviceOptions = [
    { value: 'government', label: 'خدمات حكومية / Government Services' },
    { value: 'financial', label: 'خدمات مالية / Financial Services' },
    { value: 'erp', label: 'نظام تخطيط موارد المؤسسة (ERP)' },
    { value: 'crm', label: 'إدارة علاقات العملاء (CRM)' },
    { value: 'portal', label: 'بوابة إلكترونية / Portal' },
    { value: 'mobile_app', label: 'تطبيق جوال / Mobile App' },
    { value: 'other', label: 'أخرى / Other' },
  ];

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="card-header">الخطوة 3: الخدمات الرقمية</h2>
        <p className="text-gray-600 mb-6">
          معلومات عن الخدمات الرقمية والمواقع الإلكترونية
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              أنواع الخدمات الرقمية المقدمة *
              <span className="text-xs font-normal text-gray-500 mr-2">
                (Digital Services)
              </span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {serviceOptions.map((option) => (
                <label key={option.value} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="services"
                    value={option.value}
                    checked={formData.services.includes(option.value)}
                    onChange={handleChange}
                    className="ml-2"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            {formData.services.includes('other') && (
              <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  يرجى تحديد الخدمات الأخرى *
                </label>
                <input
                  type="text"
                  name="services_other"
                  value={formData.services_other}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="مثال: خدمة أخرى..."
                  required={formData.services.includes('other')}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              تفاصيل الخدمة
              <span className="text-xs font-normal text-gray-500 mr-2">
                (Service Details)
              </span>
            </label>
            <textarea
              name="service_details"
              value={formData.service_details}
              onChange={handleChange}
              className="input"
              rows="4"
              placeholder="أدخل تفاصيل إضافية عن الخدمات الرقمية المقدمة..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              هل تم توثيق الخدمات الرقمية وتسجيلها في قاعدة بيانات وطنية؟ *
              <span className="text-xs font-normal text-gray-500 mr-2">
                (Are digital services documented and registered in a national database?)
              </span>
            </label>
            <div className="flex space-x-4 space-x-reverse">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="services_documented"
                  value="yes"
                  checked={formData.services_documented === 'yes'}
                  onChange={handleChange}
                  className="ml-2"
                />
                <span>نعم</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="services_documented"
                  value="no"
                  checked={formData.services_documented === 'no'}
                  onChange={handleChange}
                  className="ml-2"
                />
                <span>لا</span>
              </label>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">معلومات الموقع الإلكتروني</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  هل لدى المؤسسة موقع إلكتروني رسمي؟ *
                  <span className="text-xs font-normal text-gray-500 mr-2">
                    (Does the organization have an official website?)
                  </span>
                </label>
                <div className="flex space-x-4 space-x-reverse">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="has_official_website"
                      value="yes"
                      checked={formData.has_official_website === 'yes'}
                      onChange={handleChange}
                      className="ml-2"
                    />
                    <span>نعم</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="has_official_website"
                      value="no"
                      checked={formData.has_official_website === 'no'}
                      onChange={handleChange}
                      className="ml-2"
                    />
                    <span>لا</span>
                  </label>
                </div>
                {formData.has_official_website === 'yes' && (
                  <div className="mt-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      من يدير الموقع؟ *
                    </label>
                    <select
                      name="website_managed_by"
                      value={formData.website_managed_by}
                      onChange={(e) => {
                        handleChange(e);
                        // Clear external company name if changed to internal
                        if (e.target.value === 'internal') {
                          const newData = { ...formData, website_managed_by: e.target.value, website_external_company_name: '' };
                          setFormData(newData);
                          onChange(newData);
                        }
                      }}
                      className="input"
                      required={formData.has_official_website === 'yes'}
                    >
                      <option value="">اختر...</option>
                      <option value="internal">داخلية / Internal</option>
                      <option value="external">خارجية / External</option>
                      <option value="hybrid">مختلطة / Hybrid</option>
                    </select>
                    {(formData.website_managed_by === 'external' || formData.website_managed_by === 'hybrid') && (
                      <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          ما هو اسم الجهة الخارجية التي تدير الموقع؟ *
                        </label>
                        <input
                          type="text"
                          name="website_external_company_name"
                          value={formData.website_external_company_name}
                          onChange={handleChange}
                          className="input w-full"
                          placeholder="أدخل اسم الجهة الخارجية..."
                          required={formData.website_managed_by === 'external' || formData.website_managed_by === 'hybrid'}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  نوع النطاق (Domain) *
                  <span className="text-xs font-normal text-gray-500 mr-2">
                    (Domain Type)
                  </span>
                </label>
                <select
                  name="domain_type"
                  value={formData.domain_type}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">اختر...</option>
                  <option value=".gov.iq">.gov.iq - حكومي عراقي</option>
                  <option value=".iq">.iq - عراقي</option>
                  <option value=".com">.com - تجاري</option>
                  <option value=".org">.org - منظمة</option>
                  <option value="other">أخرى / Other</option>
                </select>
                {formData.domain_type === '.gov.iq' && (
                  <p className="text-xs text-green-600 mt-1 font-semibold">
                    ✓ ممتاز! استخدام نطاق حكومي رسمي
                  </p>
                )}
                {formData.domain_type === 'other' && (
                  <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      يرجى تحديد نوع النطاق الآخر *
                    </label>
                    <input
                      type="text"
                      name="domain_type_other"
                      value={formData.domain_type_other}
                      onChange={handleChange}
                      className="input w-full"
                      placeholder="مثال: .net, .edu, أو أي نوع آخر..."
                      required={formData.domain_type === 'other'}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">البريد الإلكتروني</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  هل لدى المؤسسة بريد إلكتروني رسمي معتمد؟ *
                  <span className="text-xs font-normal text-gray-500 mr-2">
                    (Does the organization have an official approved email?)
                  </span>
                </label>
                <div className="flex space-x-4 space-x-reverse">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="has_official_email"
                      value="yes"
                      checked={formData.has_official_email === 'yes'}
                      onChange={handleChange}
                      className="ml-2"
                    />
                    <span>نعم</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="has_official_email"
                      value="no"
                      checked={formData.has_official_email === 'no'}
                      onChange={handleChange}
                      className="ml-2"
                    />
                    <span>لا</span>
                  </label>
                </div>
              </div>

              {formData.has_official_email === 'yes' && (
                <div className="bg-gray-50 p-4 rounded-lg border-2 border-primary-200 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ما هو اسم النطاق؟ *
                    </label>
                    <input
                      type="text"
                      name="email_domain_name"
                      value={formData.email_domain_name}
                      onChange={handleChange}
                      className="input w-full"
                      placeholder="مثال: example.gov.iq"
                      required={formData.has_official_email === 'yes'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      نوع البريد الإلكتروني *
                    </label>
                    <select
                      name="email_type"
                      value={formData.email_type}
                      onChange={handleChange}
                      className="input"
                      required={formData.has_official_email === 'yes'}
                    >
                      <option value="">اختر...</option>
                      <option value="internal">داخلي / Internal</option>
                      <option value="external">خارجي / External</option>
                      <option value="both">كلاهما / Both</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ما هو عدد مستخدمي البريد الإلكتروني؟ *
                    </label>
                    <input
                      type="number"
                      name="email_users"
                      value={formData.email_users}
                      onChange={handleChange}
                      className="input"
                      placeholder="0"
                      min="0"
                      required={formData.has_official_email === 'yes'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      هل يوجد حماية على البريد؟ *
                    </label>
                    <div className="flex space-x-4 space-x-reverse">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="email_protection"
                          value="yes"
                          checked={formData.email_protection === 'yes'}
                          onChange={handleChange}
                          className="ml-2"
                        />
                        <span>نعم</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="email_protection"
                          value="no"
                          checked={formData.email_protection === 'no'}
                          onChange={handleChange}
                          className="ml-2"
                        />
                        <span>لا</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <h3 className="font-semibold text-blue-900 mb-2">📊 ملخص الخدمات الرقمية</h3>
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-semibold">الخدمات المقدمة: </span>
                {formData.services.length > 0 ? formData.services.length : 'لم يتم التحديد'}
              </div>
              <div>
                <span className="font-semibold">نوع النطاق: </span>
                {formData.domain_type || 'لم يتم التحديد'}
              </div>
              <div>
                <span className="font-semibold">مستخدمو البريد: </span>
                {formData.email_users || 0}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
