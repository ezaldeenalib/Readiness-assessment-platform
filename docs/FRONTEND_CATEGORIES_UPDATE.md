# تحديث الواجهة الأمامية لنظام الفئات المركزي
# Frontend Update for Master Categories System

## ✅ ما تم تحديثه

### 1. صفحة بنك الأسئلة (QuestionBankNew.jsx)

#### التحديثات:
- ✅ استبدال `input` text للفئة بـ `select` dropdown
- ✅ استخدام `categoriesService.getAll()` لجلب الفئات من `master_categories`
- ✅ تحديث `formData` لاستخدام `category_id` بدلاً من `category`
- ✅ إضافة رابط "إدارة الفئات" بجانب حقل الفئة
- ✅ عرض اسم الفئة بالعربية والإنجليزية في القائمة

#### الكود المحدث:

```jsx
// قبل
<input
  type="text"
  value={formData.category}
  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
/>

// بعد
<select
  value={formData.category_id || ''}
  onChange={(e) => {
    const selectedId = e.target.value ? parseInt(e.target.value) : null;
    const selectedCategory = categories.find(c => c.id === selectedId);
    setFormData({ 
      ...formData, 
      category_id: selectedId,
      category: selectedCategory ? (selectedCategory.name_ar || selectedCategory.name_en) : ''
    });
  }}
>
  <option value="">-- اختر التصنيف --</option>
  {categories.map(cat => (
    <option key={cat.id} value={cat.id}>
      {cat.name_ar || cat.name_en} ({cat.name_en})
    </option>
  ))}
</select>
```

---

### 2. صفحة بناء القوالب (TemplateBuilder.jsx)

#### التحديثات:
- ✅ استبدال `input` text للفئة بـ `select` dropdown
- ✅ استبدال `input` text للأقسام (sections) بـ `select` dropdown
- ✅ استخدام `categoriesService.getAll()` لجلب الفئات والأقسام
- ✅ تحديث `formData` لاستخدام `category_id`
- ✅ تحديث `selectedQuestions` لاستخدام `section_id`
- ✅ إضافة روابط "إدارة الفئات" بجانب الحقول

#### الكود المحدث:

**للفئة:**
```jsx
<select
  value={formData.category_id || ''}
  onChange={(e) => {
    const selectedId = e.target.value ? parseInt(e.target.value) : null;
    const selectedCategory = categories.find(c => c.id === selectedId);
    setFormData({ 
      ...formData, 
      category_id: selectedId,
      category: selectedCategory ? (selectedCategory.name_ar || selectedCategory.name_en) : ''
    });
  }}
>
  <option value="">-- اختر التصنيف --</option>
  {categories.map(cat => (
    <option key={cat.id} value={cat.id}>
      {cat.name_ar || cat.name_en}
    </option>
  ))}
</select>
```

**للأقسام:**
```jsx
<select
  value={question.section_id || ''}
  onChange={(e) => {
    const selectedId = e.target.value ? parseInt(e.target.value) : null;
    const selectedSection = sections.find(s => s.id === selectedId);
    handleQuestionUpdate(question.id, 'section_id', selectedId);
    if (selectedSection) {
      handleQuestionUpdate(question.id, 'section_name', selectedSection.name_en || '');
      handleQuestionUpdate(question.id, 'section_name_ar', selectedSection.name_ar || '');
    }
  }}
>
  <option value="">-- اختر القسم --</option>
  {sections.map(section => (
    <option key={section.id} value={section.id}>
      {section.name_ar || section.name_en}
    </option>
  ))}
</select>
```

---

## 🎯 كيفية الاستخدام

### عند إضافة سؤال جديد:

1. افتح صفحة بنك الأسئلة (`/question-bank`)
2. انقر على "إضافة سؤال جديد"
3. في حقل "التصنيف"، اختر من القائمة المنسدلة
4. إذا لم تجد الفئة المطلوبة:
   - انقر على "(إدارة الفئات)" بجانب الحقل
   - أو انتقل إلى `/categories` لإنشاء فئة جديدة
5. احفظ السؤال

### عند إنشاء قالب جديد:

1. افتح صفحة بناء القوالب (`/templates/new`)
2. في حقل "التصنيف"، اختر من القائمة المنسدلة
3. عند إضافة أسئلة للقالب:
   - لكل سؤال، اختر "القسم" من القائمة المنسدلة
   - يمكنك اختيار نفس القسم لعدة أسئلة
4. احفظ القالب

### عند تعديل قالب موجود:

1. افتح صفحة تعديل القالب (`/templates/:id/edit`)
2. ستجد الفئة والأقسام محملة تلقائياً
3. يمكنك تغييرها من القوائم المنسدلة
4. احفظ التغييرات

---

## 🔄 التوافق مع النظام القديم

النظام يدعم كلاً من:
- ✅ **الصيغة الجديدة**: `category_id` (integer)
- ✅ **الصيغة القديمة**: `category` (string) - للتوافق

عند إرسال البيانات:
- إذا تم اختيار فئة من القائمة: يتم إرسال `category_id`
- إذا لم يتم اختيار فئة: يتم إرسال `category` كـ null

---

## 📝 ملاحظات مهمة

1. **إدارة الفئات**: يمكن الوصول إليها من:
   - رابط "(إدارة الفئات)" بجانب حقول الفئة
   - أو الانتقال مباشرة إلى `/categories`

2. **إنشاء فئة جديدة**: 
   - يجب أن يكون الكود (Code) فريداً
   - يجب أن يكون باللغة الإنجليزية، أحرف كبيرة فقط
   - مثال: `SECURITY`, `GENERAL_INFO`

3. **الأقسام**: 
   - الأقسام هي أيضاً فئات في `master_categories`
   - يمكن استخدام نفس الفئة كتصنيف وكقسم

4. **الترجمة**: 
   - كل فئة لها اسم عربي (`name_ar`) واسم إنجليزي (`name_en`)
   - الواجهة تعرض الاسم العربي مع الاسم الإنجليزي بين قوسين

---

## 🐛 استكشاف الأخطاء

### المشكلة: القائمة المنسدلة فارغة

**الحل**: 
1. تأكد من وجود فئات في النظام
2. انتقل إلى `/categories` لإنشاء فئة جديدة
3. تأكد من أن الفئة `is_active = true`

### المشكلة: لا يمكن حفظ السؤال/القالب

**الحل**:
1. تأكد من اختيار فئة من القائمة
2. أو اترك الحقل فارغاً (اختياري)

### المشكلة: الفئة لا تظهر في القائمة

**الحل**:
1. تأكد من أن الفئة `is_active = true`
2. أعد تحميل الصفحة
3. تحقق من API: `GET /api/categories?is_active=true`

---

**تاريخ التحديث**: 2026-02-04  
**الحالة**: ✅ جاهز للاستخدام
