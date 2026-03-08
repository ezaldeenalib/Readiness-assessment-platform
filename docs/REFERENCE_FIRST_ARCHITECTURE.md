# 🧩 Reference-First Re-Architecture — Implementation Guide

## Overview

This document describes the **Reference-First** data model for **composite**, **multi-select**, and **attributed answers** in the Digital Maturity Assessment System.

**Scope:** Only questions with multiple elements or attributes. Single-value answers (Yes/No, Manual, Single choice) remain unchanged.

---

## Golden Rule

> **If an answer contains multiple elements, or attributes that can be counted, filtered, compared, or repeated → every element and attribute MUST be stored as a Reference and linked via FK.**

---

## Architecture

### 1. Central Dictionary (`reference_dictionary`)

```sql
reference_dictionary
---------------------
id
type            -- asset_type, vendor, server_model, network_type, security_tool
code
name_en
name_ar
is_active
display_order
created_at
updated_at
```

### 2. Main Composite Link (`assessment_reference_values`)

```sql
assessment_reference_values
----------------------------
id
assessment_answer_id   -- FK → question_answers.id
reference_id          -- FK → reference_dictionary.id (main type, e.g. Server)
quantity
extra_json
created_at
updated_at
```

### 3. Attribute Link (`assessment_reference_attributes`)

```sql
assessment_reference_attributes
--------------------------------
id
assessment_reference_value_id   -- FK → assessment_reference_values.id
attribute_type                 -- vendor, server_model
reference_id                   -- FK → reference_dictionary.id
created_at
```

---

## API Endpoints

### Get References by Type

```http
GET /api/references?type=asset_type
GET /api/references?type=vendor
GET /api/references?type=server_model
```

**Response:**
```json
{
  "success": true,
  "count": 6,
  "references": [
    { "id": 1, "type": "asset_type", "code": "server", "name_en": "Server", "name_ar": "خادم", "display_order": 1 },
    { "id": 2, "type": "asset_type", "code": "switch", "name_en": "Switch", "name_ar": "مبدّل", "display_order": 2 }
  ]
}
```

### Get Available Types

```http
GET /api/references/types
```

---

## Submission Format (Frontend → Backend)

**Instead of (❌ forbidden):**
```json
["Server", "Switch"]
```

**Use (✅ mandatory):**
```json
[
  {
    "reference_id": 10,
    "quantity": 5,
    "attributes": [
      { "attribute_type": "vendor", "reference_id": 20 },
      { "attribute_type": "server_model", "reference_id": 30 }
    ]
  }
]
```

---

## Frontend Rules

1. **All multi-selects and repeatable rows load from API** — no static lists.
2. **Attributes appear dynamically** based on main selection.
3. **Example usage (with `src/services/api.js`):**
   ```js
   const { data } = await api.get('/references?type=asset_type');
   const options = data.references; // [{ id, code, name_en, name_ar }, ...]
   ```
4. **Example flow:**
   - Load `asset_type` references for main column.
   - User selects "Server" → show `vendor` and `server_model` attribute dropdowns.
   - Each row submits `reference_id`, `quantity`, `attributes[]`.

---

## Migration

```bash
# Run after migrate_evaluation_engine.js
node server/database/migrate_reference_architecture.js
```

**Creates:**
- `reference_dictionary` (with sample data)
- `assessment_reference_values`
- `assessment_reference_attributes`

---

## Decision Matrix

| Question | Apply Reference Architecture? |
|----------|------------------------------|
| Does it allow multiple answers? | ✅ Yes |
| Is it composite? | ✅ Yes |
| Does each row have attributes (vendor/model)? | ✅ Yes |
| Will it be analyzed or reported? | ✅ Yes |

**If 2+ = YES → normalize + dynamic UI.**

---

## Next Steps for Full Integration

1. **Update CompositeQuestion.jsx**  
   Replace free-text columns with reference-based dropdowns that fetch from `GET /api/references?type=...`.

2. **Update MultiSelect in QuestionRenderer.jsx**  
   Replace `question.options` (JSON) with API-loaded references where applicable.

3. **Add save logic in templateAssessments.js**  
   When saving composite/multi-select answers, parse the new format and insert into `assessment_reference_values` + `assessment_reference_attributes` instead of storing raw JSON in `answer_value`.

4. **Backward compatibility**  
   For existing answers stored as JSON, consider a migration script to convert them to reference-based rows where possible.

---

## Out of Scope

- Yes/No questions
- Free text
- Single choice
- Non-analyzable data

---

**Outcome:** Unified data • Scalable attributes • Accurate analytics • AI-ready system 🚀
