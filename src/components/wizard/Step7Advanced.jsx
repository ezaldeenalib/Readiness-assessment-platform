import React, { useState } from 'react';

export default function Step7Advanced({ data, onChange }) {
  const [formData, setFormData] = useState({
    uses_virtualization: data?.uses_virtualization || '',
    virtualization_type: data?.virtualization_type || '',
    virtualization_type_other: data?.virtualization_type_other || '',
    api_integration: data?.api_integration || '',
    api_entity_name: data?.api_entity_name || '',
    regular_backup: data?.regular_backup || '',
    backup_testing: data?.backup_testing || '',
    digital_users_internal: data?.digital_users_internal || '',
    digital_users_external: data?.digital_users_external || '',
    digital_users_type: data?.digital_users_type || '',
    digital_vs_paper_reliance: data?.digital_vs_paper_reliance || '',
    pentesting_frequency: data?.pentesting_frequency || '',
    has_soc: data?.has_soc || '',
    has_noc: data?.has_noc || '',
    disaster_recovery: data?.disaster_recovery || '',
    branches_connected: data?.branches_connected || '',
    connected_branches_count: data?.connected_branches_count || '',
    connection_type: data?.connection_type || '',
    national_center_cybersecurity_reports: data?.national_center_cybersecurity_reports || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newData = { ...formData, [name]: value };
    
    // Clear fields when branches_connected is "no"
    if (name === 'branches_connected' && value === 'no') {
      newData.connected_branches_count = '';
      newData.connection_type = '';
    }
    
    // Clear api_entity_name when api_integration is not "yes"
    if (name === 'api_integration' && value !== 'yes') {
      newData.api_entity_name = '';
    }
    
    setFormData(newData);
    onChange(newData);
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="card-header">الخطوة 7: التقنيات المتقدمة</h2>
        <p className="text-gray-600 mb-6">
          معلومات عن التقنيات المتقدمة واختبارات الأمان
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-4">المحاكاة الافتراضية</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  استخدام المحاكاة الافتراضية (Virtualization) *
                </label>
                <select
                  name="uses_virtualization"
                  value={formData.uses_virtualization}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">اختر...</option>
                  <option value="yes">نعم / Yes</option>
                  <option value="no">لا / No</option>
                  <option value="planning">قيد التخطيط / Planning</option>
                </select>
              </div>

              {formData.uses_virtualization === 'yes' && (
                <div className="bg-gray-50 p-4 rounded-lg border-2 border-primary-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    نوع المحاكاة الافتراضية
                    <span className="text-xs font-normal text-gray-500 mr-2">
                      (Virtualization Type)
                    </span>
                  </label>
                  <select
                    name="virtualization_type"
                    value={formData.virtualization_type}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="">اختر...</option>
                    <option value="vmware">VMware</option>
                    <option value="hyper-v">Microsoft Hyper-V</option>
                    <option value="kvm">KVM/QEMU</option>
                    <option value="citrix">Citrix</option>
                    <option value="cloud">Cloud-based (AWS, Azure, GCP)</option>
                    <option value="other">أخرى / Other</option>
                  </select>
                  {formData.virtualization_type === 'other' && (
                    <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        يرجى تحديد نوع المحاكاة الافتراضية الآخر *
                      </label>
                      <input
                        type="text"
                        name="virtualization_type_other"
                        value={formData.virtualization_type_other}
                        onChange={handleChange}
                        className="input w-full"
                        placeholder="مثال: Oracle VM, XenServer, أو أي نوع آخر..."
                        required={formData.virtualization_type === 'other'}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">تكامل الواجهات البرمجية (APIs)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  استخدام APIs للتكامل *
                </label>
                <select
                  name="api_integration"
                  value={formData.api_integration}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">اختر...</option>
                  <option value="yes">نعم / Yes</option>
                  <option value="no">لا / No</option>
                  <option value="planning">قيد التخطيط / Planning</option>
                </select>
              </div>

              {formData.api_integration === 'yes' && (
                <div className="bg-gray-50 p-4 rounded-lg border-2 border-primary-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    اسم الجهة المتكاملة معها *
                  </label>
                  <input
                    type="text"
                    name="api_entity_name"
                    value={formData.api_entity_name}
                    onChange={handleChange}
                    className="input w-full"
                    placeholder="أدخل اسم الجهة..."
                    required={formData.api_integration === 'yes'}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">النسخ الاحتياطي</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  هل يتم إجراء نسخ احتياطي للبيانات والأنظمة بانتظام؟ *
                </label>
                <div className="flex space-x-4 space-x-reverse">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="regular_backup"
                      value="yes"
                      checked={formData.regular_backup === 'yes'}
                      onChange={handleChange}
                      className="ml-2"
                    />
                    <span>نعم</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="regular_backup"
                      value="no"
                      checked={formData.regular_backup === 'no'}
                      onChange={handleChange}
                      className="ml-2"
                    />
                    <span>لا</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  هل يتم اختبار النسخ الاحتياطية بشكل دوري للتأكد من فاعليتها؟ *
                </label>
                <div className="flex space-x-4 space-x-reverse">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="backup_testing"
                      value="yes"
                      checked={formData.backup_testing === 'yes'}
                      onChange={handleChange}
                      className="ml-2"
                    />
                    <span>نعم</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="backup_testing"
                      value="no"
                      checked={formData.backup_testing === 'no'}
                      onChange={handleChange}
                      className="ml-2"
                    />
                    <span>لا</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">حجم المستخدمين والاعتماد الرقمي</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ما هو حجم المستخدمين المستفيدين (داخلي/خارجي) من الخدمات الرقمية؟ *
                </label>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-4 rounded-lg border-2 border-primary-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      عدد المستخدمين الداخليين
                    </label>
                    <input
                      type="number"
                      name="digital_users_internal"
                      value={formData.digital_users_internal}
                      onChange={handleChange}
                      className="input w-full"
                      placeholder="أدخل عدد المستخدمين الداخليين"
                      min="0"
                    />
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border-2 border-primary-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      عدد المستخدمين الخارجيين
                    </label>
                    <input
                      type="number"
                      name="digital_users_external"
                      value={formData.digital_users_external}
                      onChange={handleChange}
                      className="input w-full"
                      placeholder="أدخل عدد المستخدمين الخارجيين"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ما هو حجم الاعتماد على الأنظمة الرقمية مقابل الورقية للتحول الرقمي الفعلي؟ *
                </label>
                <select
                  name="digital_vs_paper_reliance"
                  value={formData.digital_vs_paper_reliance}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">اختر...</option>
                  <option value="fully_digital">تحول رقمي كامل (100% رقمي)</option>
                  <option value="mostly_digital">معظم العمليات رقمية (75-99%)</option>
                  <option value="mixed">مختلط (50-74% رقمي)</option>
                  <option value="mostly_paper">معظم العمليات ورقية (25-49% رقمي)</option>
                  <option value="mostly_paper_low">معظم العمليات ورقية (أقل من 25% رقمي)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">اختبارات الأمان والمراقبة</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  تكرار اختبارات الاختراق (Penetration Testing) *
                </label>
                <select
                  name="pentesting_frequency"
                  value={formData.pentesting_frequency}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">اختر...</option>
                  <option value="quarterly">ربع سنوي / Quarterly</option>
                  <option value="semi-annual">نصف سنوي / Semi-Annual</option>
                  <option value="yearly">سنوي / Yearly</option>
                  <option value="ad-hoc">عند الحاجة / Ad-hoc</option>
                  <option value="never">لا يتم / Never</option>
                </select>
                {formData.pentesting_frequency === 'never' && (
                  <p className="text-xs text-red-600 mt-2 font-semibold">
                    ⚠️ يُنصح بشدة بإجراء اختبارات اختراق دورية
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    مركز العمليات الأمنية (SOC) *
                  </label>
                  <select
                    name="has_soc"
                    value={formData.has_soc}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="">اختر...</option>
                    <option value="yes">نعم / Yes</option>
                    <option value="no">لا / No</option>
                    <option value="outsourced">خارجي / Outsourced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    مركز عمليات الشبكة (NOC) *
                  </label>
                  <select
                    name="has_noc"
                    value={formData.has_noc}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="">اختر...</option>
                    <option value="yes">نعم / Yes</option>
                    <option value="no">لا / No</option>
                    <option value="outsourced">خارجي / Outsourced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  خطة التعافي من الكوارث (Disaster Recovery) *
                </label>
                <select
                  name="disaster_recovery"
                  value={formData.disaster_recovery}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">اختر...</option>
                  <option value="yes">نعم / Yes</option>
                  <option value="no">لا / No</option>
                  <option value="in_progress">قيد التطوير / In Progress</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">ربط الفروع</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  هل يوجد ربط بين الفروع؟ *
                </label>
                <div className="flex space-x-4 space-x-reverse">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="branches_connected"
                      value="yes"
                      checked={formData.branches_connected === 'yes'}
                      onChange={handleChange}
                      className="ml-2"
                    />
                    <span>نعم</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="branches_connected"
                      value="no"
                      checked={formData.branches_connected === 'no'}
                      onChange={handleChange}
                      className="ml-2"
                    />
                    <span>لا</span>
                  </label>
                </div>
              </div>

              {formData.branches_connected === 'yes' && (
                <div className="bg-gray-50 p-4 rounded-lg border-2 border-primary-200 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      عدد الفروع المربوطة *
                    </label>
                    <input
                      type="number"
                      name="connected_branches_count"
                      value={formData.connected_branches_count}
                      onChange={handleChange}
                      className="input w-full"
                      placeholder="0"
                      min="1"
                      required={formData.branches_connected === 'yes'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      نوع الربط *
                    </label>
                    <select
                      name="connection_type"
                      value={formData.connection_type}
                      onChange={handleChange}
                      className="input w-full"
                      required={formData.branches_connected === 'yes'}
                    >
                      <option value="">اختر نوع الربط...</option>
                      <option value="vpn">VPN - شبكة افتراضية خاصة</option>
                      <option value="mpls">MPLS - بروتوكول تبديل التسمية متعدد البروتوكولات</option>
                      <option value="leased_line">Leased Line - خط مستأجر</option>
                      <option value="internet">Internet - اتصال عبر الإنترنت</option>
                      <option value="dedicated_network">Dedicated Network - شبكة مخصصة</option>
                      <option value="cloud">Cloud Connection - اتصال سحابي</option>
                      <option value="other">أخرى / Other</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">التقارير الدورية للمركز الوطني</h3>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                هل يتم إرسال تقارير دورية عن الأمن السيبراني للمركز الوطني؟ *
              </label>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer p-3 rounded-lg border-2 border-gray-200 hover:border-primary-300 transition-colors">
                  <input
                    type="radio"
                    name="national_center_cybersecurity_reports"
                    value="yes_monthly"
                    checked={formData.national_center_cybersecurity_reports === 'yes_monthly'}
                    onChange={handleChange}
                    className="ml-2"
                  />
                  <span>نعم - شهرياً</span>
                </label>
                <label className="flex items-center cursor-pointer p-3 rounded-lg border-2 border-gray-200 hover:border-primary-300 transition-colors">
                  <input
                    type="radio"
                    name="national_center_cybersecurity_reports"
                    value="yes_quarterly"
                    checked={formData.national_center_cybersecurity_reports === 'yes_quarterly'}
                    onChange={handleChange}
                    className="ml-2"
                  />
                  <span>نعم - ربع سنوي</span>
                </label>
                <label className="flex items-center cursor-pointer p-3 rounded-lg border-2 border-gray-200 hover:border-primary-300 transition-colors">
                  <input
                    type="radio"
                    name="national_center_cybersecurity_reports"
                    value="yes_yearly"
                    checked={formData.national_center_cybersecurity_reports === 'yes_yearly'}
                    onChange={handleChange}
                    className="ml-2"
                  />
                  <span>نعم - سنوي</span>
                </label>
                <label className="flex items-center cursor-pointer p-3 rounded-lg border-2 border-gray-200 hover:border-primary-300 transition-colors">
                  <input
                    type="radio"
                    name="national_center_cybersecurity_reports"
                    value="no"
                    checked={formData.national_center_cybersecurity_reports === 'no'}
                    onChange={handleChange}
                    className="ml-2"
                  />
                  <span>لا</span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-6 mt-6">
            <h3 className="font-bold text-purple-900 mb-4 text-lg">🚀 ملخص التقنيات المتقدمة</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">المحاكاة الافتراضية</p>
                <p className={`text-xl font-bold ${
                  formData.uses_virtualization === 'yes' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formData.uses_virtualization === 'yes' ? '✓ نعم' : '✗ لا'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">اختبارات الاختراق</p>
                <p className={`text-xl font-bold ${
                  formData.pentesting_frequency && formData.pentesting_frequency !== 'never'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {formData.pentesting_frequency && formData.pentesting_frequency !== 'never'
                    ? '✓ يتم'
                    : '✗ لا يتم'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">SOC</p>
                <p className={`text-xl font-bold ${
                  formData.has_soc && formData.has_soc !== 'no' ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {formData.has_soc && formData.has_soc !== 'no' ? '✓' : '-'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">NOC</p>
                <p className={`text-xl font-bold ${
                  formData.has_noc && formData.has_noc !== 'no' ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {formData.has_noc && formData.has_noc !== 'no' ? '✓' : '-'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">ربط الفروع</p>
                <p className={`text-xl font-bold ${
                  formData.branches_connected === 'yes' ? 'text-green-600' : 
                  formData.branches_connected === 'no' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {formData.branches_connected === 'yes' ? '✓ نعم' :
                   formData.branches_connected === 'no' ? '✗ لا' : '-'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">تقارير المركز الوطني</p>
                <p className={`text-xl font-bold ${
                  formData.national_center_cybersecurity_reports && formData.national_center_cybersecurity_reports !== 'no'
                    ? 'text-green-600'
                    : formData.national_center_cybersecurity_reports === 'no'
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}>
                  {formData.national_center_cybersecurity_reports === 'yes_monthly' ? '✓ شهري' :
                   formData.national_center_cybersecurity_reports === 'yes_quarterly' ? '✓ ربع سنوي' :
                   formData.national_center_cybersecurity_reports === 'yes_yearly' ? '✓ سنوي' :
                   formData.national_center_cybersecurity_reports === 'no' ? '✗ لا' : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
