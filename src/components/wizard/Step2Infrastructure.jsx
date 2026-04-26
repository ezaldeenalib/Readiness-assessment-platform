import React, { useState } from 'react';

export default function Step2Infrastructure({ data, onChange }) {
  // Normalize inventory items to ensure all fields exist
  const normalizeInventory = (inventory) => {
    if (!inventory || !Array.isArray(inventory)) return [];
    return inventory.map(item => ({
      type: item.type || '',
      brand: item.brand || '',
      model: item.model || '',
      quantity: item.quantity || '',
      type_other: item.type_other || '',
      storage_amount: item.storage_amount !== undefined ? item.storage_amount : '',
      storage_unit: item.storage_unit || 'TB',
    }));
  };

  const [formData, setFormData] = useState({
    has_infrastructure: data?.has_infrastructure || 'no',
    data_center_count: data?.data_center_count || '',
    physical_servers: data?.physical_servers || '',
    virtual_servers: data?.virtual_servers || '',
    storage_amount: data?.storage_amount || '',
    storage_unit: data?.storage_unit || 'TB',
    infrastructure_managed_by: data?.infrastructure_managed_by || '',
    third_party_name: data?.third_party_name || '',
    network_types: data?.network_types || [],
    network_types_other: data?.network_types_other || '',
    has_accurate_asset_register: data?.has_accurate_asset_register || '',
    inventory: normalizeInventory(data?.inventory),
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newData = { ...formData };

    if (type === 'checkbox') {
      if (checked) {
        newData[name] = [...(newData[name] || []), value];
      } else {
        newData[name] = (newData[name] || []).filter(item => item !== value);
      }
    } else {
      newData[name] = value;
    }

    setFormData(newData);
    onChange(newData);
  };

  const addInventoryItem = () => {
    const newInventory = [
      ...formData.inventory,
      { type: '', brand: '', model: '', quantity: '', type_other: '', storage_amount: '', storage_unit: 'TB' },
    ];
    const newData = { ...formData, inventory: newInventory };
    setFormData(newData);
    onChange(newData);
  };

  const removeInventoryItem = (index) => {
    const newInventory = formData.inventory.filter((_, i) => i !== index);
    const newData = { ...formData, inventory: newInventory };
    setFormData(newData);
    onChange(newData);
  };

  const updateInventoryItem = (index, field, value) => {
    const newInventory = formData.inventory.map((item, i) => {
      if (i === index) {
        // Create a new object with updated field
        const updatedItem = {
          ...item,
          [field]: value
        };
        
        // Clear other_text if type is changed from "Other - أخرى"
        if (field === 'type' && value !== 'Other - أخرى') {
          updatedItem.type_other = '';
        }
        
        // Initialize storage fields if type is changed to a type that needs storage
        const typesNeedingStorage = ['Storage - تخزين', 'Server - خادم', 'VMs - أجهزة افتراضية', 'PC - حواسيب'];
        if (field === 'type' && typesNeedingStorage.includes(value)) {
          if (updatedItem.storage_amount === undefined || updatedItem.storage_amount === null) {
            updatedItem.storage_amount = '';
          }
          if (!updatedItem.storage_unit) {
            updatedItem.storage_unit = 'TB';
          }
        }
        
        return updatedItem;
      }
      return item;
    });
    
    const newData = { ...formData, inventory: newInventory };
    setFormData(newData);
    onChange(newData);
  };

  const networkOptions = [
    { value: 'lan', label: 'LAN - شبكة محلية' },
    { value: 'wan', label: 'WAN - شبكة واسعة' },
    { value: 'cloud', label: 'Cloud - سحابية' },
    { value: 'hybrid', label: 'Hybrid - هجينة' },
    { value: 'other', label: 'أخرى' },
  ];

  const inventoryTypes = [
    'Router - موجه',
    'Switch - مبدل',
    'Firewall - جدار ناري',
    'Load Balancer - موازن حمل',
    'Access Point - نقطة وصول',
    'Server - خادم',
    'Storage - تخزين',
    'VMs - أجهزة افتراضية',
    'PC - حواسيب',
    'UPS - مزود طاقة',
    'Other - أخرى',
  ];

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="card-header">الخطوة 2: البنية التحتية الرقمية</h2>
        <p className="text-gray-600 mb-6">
          معلومات عن البنية التحتية التقنية للجهة
        </p>

        <div className="space-y-6">
          {/* Conditional Question */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              هل لديكم بنية تحتية رقمية؟ *
              <span className="text-xs font-normal text-gray-500 mr-2">
                (Do you have digital infrastructure?)
              </span>
            </label>
            <div className="flex space-x-4 space-x-reverse">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="has_infrastructure"
                  value="yes"
                  checked={formData.has_infrastructure === 'yes'}
                  onChange={handleChange}
                  className="ml-2"
                />
                <span>نعم</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="has_infrastructure"
                  value="no"
                  checked={formData.has_infrastructure === 'no'}
                  onChange={handleChange}
                  className="ml-2"
                />
                <span>لا</span>
              </label>
            </div>
          </div>

          {/* Conditional Fields - Only show if has_infrastructure is 'yes' */}
          {formData.has_infrastructure === 'yes' && (
            <div className="space-y-4 bg-gray-50 p-6 rounded-lg border-2 border-primary-200">
              <h3 className="font-semibold text-lg text-primary-800 mb-4">
                تفاصيل البنية التحتية
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    عدد مراكز البيانات *
                    <span className="text-xs font-normal text-gray-500 mr-2">
                      (Data Centers)
                    </span>
                  </label>
                  <input
                    type="number"
                    name="data_center_count"
                    value={formData.data_center_count}
                    onChange={handleChange}
                    className="input"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    الخوادم الفيزيائية *
                    <span className="text-xs font-normal text-gray-500 mr-2">
                      (Physical Servers)
                    </span>
                  </label>
                  <input
                    type="number"
                    name="physical_servers"
                    value={formData.physical_servers}
                    onChange={handleChange}
                    className="input"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    الخوادم الافتراضية
                    <span className="text-xs font-normal text-gray-500 mr-2">
                      (Virtual Servers)
                    </span>
                  </label>
                  <input
                    type="number"
                    name="virtual_servers"
                    value={formData.virtual_servers}
                    onChange={handleChange}
                    className="input"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    سعة التخزين الإجمالية *
                    <span className="text-xs font-normal text-gray-500 mr-2">
                      (Total Storage Capacity)
                    </span>
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="text"
                      name="storage_amount"
                      value={formData.storage_amount}
                      onChange={handleChange}
                      className="input flex-1"
                      placeholder="أدخل السعة الإجمالية"
                      style={{ fontSize: '16px', padding: '12px 16px', minWidth: '180px' }}
                    />
                    <select
                      name="storage_unit"
                      value={formData.storage_unit}
                      onChange={handleChange}
                      className="input"
                      style={{ fontSize: '16px', padding: '12px 16px', width: '140px' }}
                    >
                      <option value="TB">TB - تيرابايت</option>
                      <option value="PB">PB - بيتابايت</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 أدخل إجمالي سعة التخزين المتاحة في البنية التحتية
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    البنية التحتية مدارة من قبل *
                    <span className="text-xs font-normal text-gray-500 mr-2">
                      (Infrastructure Managed By)
                    </span>
                  </label>
                  <select
                    name="infrastructure_managed_by"
                    value={formData.infrastructure_managed_by}
                    onChange={handleChange}
                    className="input"
                    required
                  >
                    <option value="">اختر...</option>
                    <option value="self">الجهة نفسها</option>
                    <option value="third_party">طرف ثالث</option>
                    <option value="shared">الجهة نفسها والطرف الثالث (مشترك)</option>
                  </select>
                  {formData.infrastructure_managed_by === 'third_party' && (
                    <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        ما هو اسم الجهة الطرف الثالث؟ *
                      </label>
                      <input
                        type="text"
                        name="third_party_name"
                        value={formData.third_party_name}
                        onChange={handleChange}
                        className="input w-full"
                        placeholder="اسم الجهة الطرف الثالث..."
                        required={formData.infrastructure_managed_by === 'third_party'}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  هل يوجد سجل محدث ودقيق لجميع الأصول التقنية؟ *
                  <span className="text-xs font-normal text-gray-500 mr-2">
                    (Is there an updated and accurate register of all technical assets?)
                  </span>
                </label>
                <div className="flex space-x-4 space-x-reverse mb-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="has_accurate_asset_register"
                      value="yes"
                      checked={formData.has_accurate_asset_register === 'yes'}
                      onChange={handleChange}
                      className="ml-2"
                    />
                    <span>نعم</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="has_accurate_asset_register"
                      value="no"
                      checked={formData.has_accurate_asset_register === 'no'}
                      onChange={handleChange}
                      className="ml-2"
                    />
                    <span>لا</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  أنواع الشبكات المستخدمة *
                  <span className="text-xs font-normal text-gray-500 mr-2">
                    (Network Types)
                  </span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {networkOptions.map((option) => (
                    <label key={option.value} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="network_types"
                        value={option.value}
                        checked={formData.network_types.includes(option.value)}
                        onChange={(e) => {
                          handleChange(e);
                          // Clear other text if "other" is unchecked
                          if (!e.target.checked && option.value === 'other') {
                            const newData = { ...formData };
                            newData.network_types = newData.network_types.filter(item => item !== 'other');
                            newData.network_types_other = '';
                            setFormData(newData);
                            onChange(newData);
                          }
                        }}
                        className="ml-2"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
                {formData.network_types.includes('other') && (
                  <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      يرجى تحديد أنواع الشبكات الأخرى *
                    </label>
                    <input
                      type="text"
                      name="network_types_other"
                      value={formData.network_types_other}
                      onChange={handleChange}
                      className="input w-full"
                      placeholder="مثال: Mesh Network, SD-WAN, أو أي نوع آخر..."
                      required={formData.network_types.includes('other')}
                    />
                  </div>
                )}
              </div>

              {/* Infrastructure Inventory Table */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    جرد الأجهزة والمعدات
                    <span className="text-xs font-normal text-gray-500 mr-2">
                      (Infrastructure Inventory)
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={addInventoryItem}
                    className="btn btn-primary text-sm"
                  >
                    + إضافة جهاز
                  </button>
                </div>

                {formData.inventory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>النوع / Type</th>
                          <th>العلامة التجارية / Brand</th>
                          <th>الطراز / Model</th>
                          <th>الكمية / Quantity</th>
                          <th>سعة التخزين / Storage</th>
                          <th>إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.inventory.map((item, index) => (
                          <tr key={index}>
                            <td>
                              <select
                                value={item.type}
                                onChange={(e) => updateInventoryItem(index, 'type', e.target.value)}
                                className="input"
                              >
                                <option value="">اختر النوع</option>
                                {inventoryTypes.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                              {item.type === 'Other - أخرى' && (
                                <input
                                  type="text"
                                  value={item.type_other || ''}
                                  onChange={(e) => updateInventoryItem(index, 'type_other', e.target.value)}
                                  className="input mt-2"
                                  placeholder="حدد نوع الجهاز الآخر..."
                                  required={item.type === 'Other - أخرى'}
                                />
                              )}
                            </td>
                            <td>
                              <input
                                type="text"
                                value={item.brand}
                                onChange={(e) => updateInventoryItem(index, 'brand', e.target.value)}
                                className="input"
                                placeholder="Cisco, HP, Dell..."
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={item.model}
                                onChange={(e) => updateInventoryItem(index, 'model', e.target.value)}
                                className="input"
                                placeholder="Model number"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateInventoryItem(index, 'quantity', e.target.value)}
                                className="input"
                                placeholder="0"
                                min="1"
                              />
                            </td>
                            <td>
                              {(item.type === 'Storage - تخزين' || item.type === 'Server - خادم' || item.type === 'VMs - أجهزة افتراضية' || item.type === 'PC - حواسيب') ? (
                                <div className="flex gap-3 items-center">
                                  <input
                                    type="text"
                                    value={item.storage_amount || ''}
                                    onChange={(e) => updateInventoryItem(index, 'storage_amount', e.target.value)}
                                    className="input flex-1"
                                    placeholder="أدخل السعة"
                                    style={{ fontSize: '16px', padding: '10px 14px', minWidth: '150px' }}
                                  />
                                  <select
                                    value={item.storage_unit || 'TB'}
                                    onChange={(e) => updateInventoryItem(index, 'storage_unit', e.target.value)}
                                    className="input"
                                    style={{ fontSize: '16px', padding: '10px', width: '90px' }}
                                  >
                                    <option value="TB">TB</option>
                                    <option value="PB">PB</option>
                                  </select>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => removeInventoryItem(index)}
                                className="text-red-600 hover:text-red-800 font-semibold"
                              >
                                حذف
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-100 rounded-lg">
                    <p className="text-gray-500">لم يتم إضافة أي أجهزة بعد</p>
                    <p className="text-sm text-gray-400 mt-1">
                      انقر على "إضافة جهاز" لبدء الجرد
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {formData.has_infrastructure === 'no' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                ℹ️ لا توجد بنية تحتية رقمية حالياً. يمكنك الانتقال إلى الخطوة التالية.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
