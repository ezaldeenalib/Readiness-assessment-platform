# Central Category System Documentation
# نظام الفئات المركزي

## 📋 Overview

This document describes the centralized category system that replaces free-text category fields with a master table (`master_categories`) used across Questions, Templates, and Template Sections.

---

## 🎯 Goals

1. **Single Source of Truth**: All categories stored in one table
2. **Data Integrity**: Foreign key constraints prevent invalid categories
3. **Consistency**: Same category names across the entire platform
4. **Maintainability**: Easy to add/edit/disable categories

---

## 🗄️ Database Schema

### Master Categories Table

```sql
CREATE TABLE master_categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,        -- e.g., "SECURITY", "GENERAL"
    name_en VARCHAR(255) NOT NULL,            -- English name
    name_ar VARCHAR(255) NOT NULL,           -- Arabic name
    description_en TEXT,                      -- Optional English description
    description_ar TEXT,                     -- Optional Arabic description
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Updated Tables

#### Questions Table
- **Old**: `category VARCHAR(100)`
- **New**: `category_id INTEGER REFERENCES master_categories(id)`

#### Templates Table
- **Old**: `category VARCHAR(100)`
- **New**: `category_id INTEGER REFERENCES master_categories(id)`

#### Template Questions Table
- **Old**: `section_name VARCHAR(255)`, `section_name_ar VARCHAR(255)`
- **New**: `section_id INTEGER REFERENCES master_categories(id)`
- **Note**: `section_name_ar` kept for backward compatibility but should reference `master_categories.name_ar`

---

## 🔄 Migration Process

### Step 1: Run Migration Script

```bash
node server/database/migrate_master_categories.js
```

This will:
1. Create `master_categories` table
2. Extract unique categories from existing data
3. Insert them into `master_categories`
4. Add `category_id` and `section_id` columns
5. Migrate existing data
6. Create indexes

### Step 2: Verify Migration

```sql
-- Check categories created
SELECT COUNT(*) FROM master_categories;

-- Check questions with category_id
SELECT COUNT(*) FROM Questions WHERE category_id IS NOT NULL;

-- Check templates with category_id
SELECT COUNT(*) FROM templates WHERE category_id IS NOT NULL;

-- Check template_questions with section_id
SELECT COUNT(*) FROM template_questions WHERE section_id IS NOT NULL;
```

### Step 3: Update Application Code

Update all code to use `category_id`/`section_id` instead of text fields.

### Step 4: Drop Old Columns (After Verification)

```bash
# Run this SQL file after verifying everything works
psql -d your_database -f server/database/migrate_drop_old_category_columns.sql
```

---

## 📡 API Endpoints

### GET /api/categories
Get all categories

**Query Parameters:**
- `is_active` (optional): Filter by active status
- `search` (optional): Search by code, name_en, or name_ar

**Response:**
```json
{
  "success": true,
  "count": 10,
  "categories": [
    {
      "id": 1,
      "code": "SECURITY",
      "name_en": "Security",
      "name_ar": "الأمن",
      "description_en": "Security-related questions",
      "description_ar": "أسئلة متعلقة بالأمن",
      "is_active": true,
      "questions_count": 15,
      "templates_count": 3,
      "sections_count": 5
    }
  ]
}
```

### GET /api/categories/:id
Get category by ID

### POST /api/categories
Create new category

**Request Body:**
```json
{
  "code": "SECURITY",
  "name_en": "Security",
  "name_ar": "الأمن",
  "description_en": "Security-related",
  "description_ar": "متعلق بالأمن",
  "is_active": true
}
```

**Validation:**
- `code` must be uppercase alphanumeric with underscores only
- `name_en` and `name_ar` are required

### PUT /api/categories/:id
Update category

### PATCH /api/categories/:id/toggle
Toggle active status

**Note**: Cannot disable if category is in use

### DELETE /api/categories/:id
Soft delete (set `is_active = false`)

**Note**: Cannot delete if category is in use

### GET /api/categories/:id/usage
Get usage statistics for a category

---

## 🔐 Permissions

- **GET**: All authenticated users
- **POST/PUT/PATCH/DELETE**: `super_admin`, `ministry_admin` only

---

## 💻 Frontend Integration

### Fetching Categories

```javascript
import api from './services/api';

// Get all active categories
const categories = await api.get('/categories', { params: { is_active: true } });

// Use in dropdown
<select>
  {categories.data.categories.map(cat => (
    <option key={cat.id} value={cat.id}>
      {cat.name_ar} / {cat.name_en}
    </option>
  ))}
</select>
```

### Creating Category

```javascript
await api.post('/categories', {
  code: 'SECURITY',
  name_en: 'Security',
  name_ar: 'الأمن',
  description_en: 'Security-related',
  description_ar: 'متعلق بالأمن'
});
```

---

## 🔄 Code Updates Required

### Backend Routes

1. **questions_new.js**:
   - Update SELECT queries to JOIN with `master_categories`
   - Change `category` filter to `category_id`
   - Update INSERT/UPDATE to use `category_id`

2. **templates.js**:
   - Update SELECT queries to JOIN with `master_categories`
   - Change `category` filter to `category_id`
   - Update INSERT/UPDATE to use `category_id`

3. **templateAssessments.js**:
   - Update queries that reference `section_name` to use `section_id` with JOIN

### Frontend Components

1. **QuestionBankNew.jsx**:
   - Change category input from text to dropdown
   - Fetch categories from `/api/categories`

2. **TemplateBuilder.jsx**:
   - Change category input from text to dropdown
   - Change section input from text to dropdown

3. **Category Management Page** (New):
   - Create admin page for managing categories

---

## ✅ Validation Rules

1. **Code Format**: Must be uppercase alphanumeric with underscores (e.g., `SECURITY`, `GENERAL_INFO`)
2. **Required Fields**: `code`, `name_en`, `name_ar`
3. **Unique Code**: No duplicate codes allowed
4. **Cannot Delete**: If category is referenced by Questions, Templates, or Template Questions
5. **Cannot Disable**: If category is in use (can be changed later)

---

## 📊 Benefits

1. **Data Consistency**: Same category names everywhere
2. **Easy Updates**: Change category name in one place
3. **Better Filtering**: Can filter by category_id efficiently
4. **Audit Trail**: Can track category changes
5. **Multilingual**: Supports English and Arabic names
6. **Soft Delete**: Categories can be disabled without losing data

---

## 🚀 Next Steps

1. ✅ Create migration scripts
2. ✅ Create API routes
3. ⏭️ Update backend routes (questions_new.js, templates.js, templateAssessments.js)
4. ⏭️ Create frontend category management page
5. ⏭️ Update frontend forms to use dropdowns
6. ⏭️ Run migration on production
7. ⏭️ Drop old columns after verification

---

**Date Created**: 2026-02-02  
**Status**: In Progress
