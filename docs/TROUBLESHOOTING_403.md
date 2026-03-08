# حل مشكلة 403 Forbidden

## 🔍 الأسباب المحتملة

### 1. المستخدم غير مسجل دخول
- **السبب**: لا يوجد token في `localStorage`
- **الحل**: سجل دخول من صفحة `/login`

### 2. Token منتهي الصلاحية
- **السبب**: Token قديم أو منتهي
- **الحل**: سجل دخول مرة أخرى

### 3. المستخدم غير موجود في قاعدة البيانات
- **السبب**: المستخدم محذوف أو غير موجود
- **الحل**: أنشئ مستخدم جديد أو تحقق من قاعدة البيانات

### 4. المستخدم غير نشط (is_active = false)
- **السبب**: حساب المستخدم معطل
- **الحل**: فعّل المستخدم في قاعدة البيانات:
  ```sql
  UPDATE users SET is_active = true WHERE email = 'user@example.com';
  ```

### 5. Token غير صالح
- **السبب**: Token تالف أو تم تعديله
- **الحل**: امسح `localStorage` وسجل دخول مرة أخرى:
  ```javascript
  localStorage.clear();
  ```

## 🛠️ خطوات التشخيص

### 1. تحقق من وجود Token
افتح Console في المتصفح (F12) واكتب:
```javascript
console.log('Token:', localStorage.getItem('token'));
console.log('User:', localStorage.getItem('user'));
```

### 2. تحقق من الـ Server Logs
افحص الـ terminal الذي يعمل فيه الـ server. يجب أن ترى:
- `❌ No token provided` - إذا لم يكن هناك token
- `❌ User not found` - إذا كان المستخدم غير موجود
- `❌ User inactive` - إذا كان المستخدم معطل
- `❌ Authentication error` - إذا كان هناك خطأ آخر

### 3. تحقق من قاعدة البيانات
```sql
-- تحقق من وجود المستخدم
SELECT id, email, full_name, role, entity_id, is_active 
FROM users 
WHERE email = 'your-email@example.com';

-- تحقق من أن المستخدم نشط
SELECT * FROM users WHERE is_active = false;
```

## ✅ الحل السريع

1. **امسح localStorage:**
   ```javascript
   localStorage.clear();
   ```

2. **سجل دخول مرة أخرى:**
   - اذهب إلى `/login`
   - أدخل البريد الإلكتروني وكلمة المرور
   - تأكد من أن الـ token يتم حفظه

3. **تحقق من الـ Server:**
   - تأكد من أن الـ server يعمل على المنفذ 3000
   - تأكد من وجود `JWT_SECRET` في ملف `.env`

4. **تحقق من قاعدة البيانات:**
   - تأكد من وجود المستخدم
   - تأكد من أن `is_active = true`

## 🔐 إنشاء مستخدم جديد (إذا لزم)

### من خلال SQL:
```sql
INSERT INTO users (email, password_hash, full_name, role, entity_id, is_active)
VALUES (
  'user@example.com',
  '$2a$10$YourHashedPasswordHere', -- استخدم bcrypt hash
  'User Name',
  'entity_user',
  1, -- entity_id
  true
);
```

### من خلال API (إذا كان لديك super_admin):
```bash
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "User Name",
  "role": "entity_user",
  "entity_id": 1
}
```

## 📝 ملاحظات

- الـ token يتم حفظه تلقائياً عند تسجيل الدخول
- الـ token يتم إرساله تلقائياً مع كل طلب API
- إذا حصلت على 403، سيتم توجيهك تلقائياً إلى صفحة `/login`
