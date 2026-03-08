# دليل إضافة الأسئلة - How to Add Questions

## 📋 الطرق المتاحة

### 1️⃣ من خلال الواجهة (Frontend) - الأسهل

#### الوصول إلى صفحة بنك الأسئلة:
```
http://localhost:5173/question-bank
```

#### الخطوات:
1. اضغط على زر "إضافة سؤال جديد"
2. اتبع المعالج المكون من 4 خطوات:
   - **الخطوة 1**: اختر نوع السؤال
   - **الخطوة 2**: اكتب نص السؤال
   - **الخطوة 3**: الإعدادات
   - **الخطوة 4**: المراجعة والحفظ

---

### 2️⃣ من خلال API (النظام الجديد) - للمطورين

#### Endpoint:
```
POST /api/questions-new
```

#### Headers:
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

---

## 📝 أمثلة عملية

### مثال 1: سؤال نعم/لا (YesNo)

```javascript
// من خلال API
const question = {
  code: "Q001",
  text_en: "Do you have a data center?",
  text_ar: "هل لديك مركز بيانات؟",
  question_type: "YesNo",
  weight: 5,
  category: "Infrastructure"
};

// POST request
await fetch('http://localhost:3000/api/questions-new', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(question)
});
```

### مثال 2: سؤال إدخال يدوي (Manual)

```javascript
const question = {
  code: "Q002",
  text_en: "How many employees do you have?",
  text_ar: "كم عدد الموظفين لديك؟",
  question_type: "Manual",
  weight: 10,
  category: "General"
};

await fetch('http://localhost:3000/api/questions-new', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(question)
});
```

### مثال 3: سؤال اختيار متعدد (MultiChoice)

```javascript
const question = {
  code: "Q003",
  text_en: "What is your backup level?",
  text_ar: "ما مستوى النسخ الاحتياطي لديك؟",
  question_type: "MultiChoice",
  weight: 10,
  category: "Infrastructure",
  options: {
    "لا يوجد": 0,
    "أساسي": 5,
    "متقدم": 10
  }
};

await fetch('http://localhost:3000/api/questions-new', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(question)
});
```

### مثال 4: سؤال مركب (Composite) ⭐ جديد

```javascript
const question = {
  code: "Q004",
  text_en: "List your data centers",
  text_ar: "اذكر مراكز البيانات الخاصة بك",
  question_type: "Composite",
  weight: 15,
  category: "Infrastructure",
  composite_columns: [
    {
      key: "name",
      label_en: "Data Center Name",
      label_ar: "اسم مركز البيانات"
    },
    {
      key: "location",
      label_en: "Location",
      label_ar: "الموقع"
    },
    {
      key: "capacity",
      label_en: "Capacity",
      label_ar: "السعة"
    }
  ]
};

await fetch('http://localhost:3000/api/questions-new', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(question)
});
```

### مثال 5: سؤال فرعي (Parent/Child) ⭐ جديد

#### أولاً: إنشاء السؤال الأب
```javascript
const parentQuestion = {
  code: "Q005",
  text_en: "Do you have data centers?",
  text_ar: "هل لديك مراكز بيانات؟",
  question_type: "YesNo",
  weight: 5,
  category: "Infrastructure"
};

const parentResponse = await fetch('http://localhost:3000/api/questions-new', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(parentQuestion)
});

const parentData = await parentResponse.json();
const parentId = parentData.question.id;
```

#### ثانياً: إنشاء السؤال الفرعي
```javascript
const childQuestion = {
  code: "Q006",
  text_en: "How many data centers do you have?",
  text_ar: "كم عدد مراكز البيانات لديك؟",
  question_type: "Manual",
  parent_question_id: parentId, // ID السؤال الأب
  trigger_answer_value: "Yes", // القيمة المطلوبة لإظهار السؤال الفرعي
  weight: 10,
  category: "Infrastructure"
};

await fetch('http://localhost:3000/api/questions-new', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(childQuestion)
});
```

---

## 📋 أنواع الأسئلة المدعومة

| النوع | الوصف | مثال |
|------|-------|------|
| **Manual** | إدخال يدوي | "كم عدد الموظفين؟" |
| **YesNo** | نعم/لا | "هل لديك مركز بيانات؟" |
| **MultiChoice** | اختيار متعدد | "ما مستوى النسخ الاحتياطي؟" |
| **StaticData** | بيانات ثابتة | يُعبأ تلقائياً من بيانات المؤسسة |
| **Composite** | سؤال مركب | جدول ديناميكي (مثل قائمة مراكز البيانات) |

---

## 🔑 الحقول المطلوبة

### الحقول الأساسية (مطلوبة):
- `code` - كود فريد للسؤال (مثل: "Q001")
- `text_en` - نص السؤال بالإنجليزية
- `text_ar` - نص السؤال بالعربية
- `question_type` - نوع السؤال

### الحقول الاختيارية:
- `weight` - النقاط (افتراضي: 1)
- `category` - التصنيف
- `parent_question_id` - ID السؤال الأب (للأسئلة الفرعية)
- `trigger_answer_value` - القيمة المطلوبة لإظهار السؤال الفرعي
- `composite_columns` - رؤوس الأعمدة للأسئلة المركبة

---

## 💡 نصائح مهمة

1. **الكود يجب أن يكون فريداً**: استخدم نظام تسمية واضح مثل "Q001", "Q002", إلخ
2. **للأسئلة المركبة**: تأكد من أن `composite_columns` هو array من objects
3. **للأسئلة الفرعية**: يجب إنشاء السؤال الأب أولاً للحصول على `parent_question_id`
4. **التصنيفات**: استخدم تصنيفات واضحة مثل "Infrastructure", "Security", "General"

---

## 🧪 اختبار السؤال

بعد إضافة السؤال، يمكنك:

1. **عرضه في بنك الأسئلة**: `http://localhost:5173/question-bank`
2. **استخدامه في الإجابات**: `http://localhost:5173/answers`
3. **التحقق من API**:
   ```bash
   GET http://localhost:3000/api/questions-new
   ```

---

## 📚 المزيد من المعلومات

- دليل النظام الجديد: `docs/NEW_SYSTEM_GUIDE.md`
- API Documentation: راجع ملفات التوثيق في `docs/`

---

**جاهز للبدء! 🚀**
