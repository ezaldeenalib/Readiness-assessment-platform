# 🎯 Template-based Evaluation & Scoring Engine

## Overview

A comprehensive, template-driven evaluation system that integrates seamlessly with the existing Digital Maturity & Cybersecurity Assessment platform. This engine provides intelligent, rule-based assessments with automatic scoring, frozen snapshots, and historical tracking.

---

## ✨ Key Features

### 1. **Global Question Bank**
- Reusable question library across all templates
- 5 question types:
  - **StaticDataLinked**: Auto-filled from institutional data
  - **Manual**: User input with validation rules
  - **MultiChoice**: Options with weighted scores
  - **YesNo**: Boolean questions
  - **ParentChild**: Conditional questions based on parent answers

### 2. **Template System**
- Create evaluation scenarios by selecting questions
- Reorder and organize questions into sections
- Override question weights per template
- Version control for templates
- Template duplication for quick creation

### 3. **Static Data Management**
- National form fields with institutional values
- **Versioned history tracking** (never overwrites data)
- Automatic deactivation of old values when updated
- Frozen snapshots at assessment time

### 4. **Intelligent Scoring**
- **Automatic evaluation** based on configurable rules:
  - Greater than / Less than
  - Equals / Not equals
  - Contains / Exists
  - In Range
- Real-time score calculation
- Risk level determination
- Detailed evaluation notes

### 5. **Assessment Workflow**
- Create assessment from template
- Auto-fill StaticDataLinked questions
- Manual completion for other question types
- Save draft and resume later
- Submit for review
- Track scores and compliance

---

## 🗄️ Database Schema

### Core Tables

#### 1. **static_data_fields**
Defines national form fields structure.

```sql
- field_key: Unique identifier
- field_name / field_name_ar: Bilingual labels
- field_type: text, number, date, boolean, select
- field_category: Group fields logically
- validation_rules: JSON validation config
```

#### 2. **static_data_values** (Versioned)
Institutional data with historical tracking.

```sql
- institution_id: Links to entities
- field_key: References static_data_fields
- field_value: The actual data
- is_active: Only one active per institution+field
- valid_from / valid_to: Version timestamps
```

**Important**: When a new value is inserted, the trigger automatically deactivates the old value and sets its `valid_to` timestamp.

#### 3. **questions**
Global reusable question library.

```sql
- question_type: StaticDataLinked | Manual | MultiChoice | YesNo | ParentChild
- linked_static_data_field: For StaticDataLinked questions
- evaluation_rule: How to evaluate (>, <, =, etc.)
- reference_value: Value to compare against
- options: JSON map for MultiChoice (option -> score)
- parent_question_id: For conditional questions
- weight: Points awarded for correct answer
```

#### 4. **templates**
Evaluation scenarios.

```sql
- name / name_ar: Template title
- description: Purpose and use case
- category: Group templates (security, maturity, etc.)
- version: Track template versions
- is_active: Soft delete flag
```

#### 5. **template_questions**
Links questions to templates with ordering.

```sql
- template_id + question_id: Many-to-many
- display_order: Question sequence
- override_weight: Optional weight override
- section_name: Group questions in UI
```

#### 6. **template_assessments**
Links assessments to templates with scores.

```sql
- assessment_id: Main assessment record
- template_id: Which template was used
- total_possible_score: Sum of all question weights
- total_achieved_score: Sum of scores earned
- percentage_score: (achieved / possible) × 100
```

#### 7. **question_answers**
Stores answers with frozen snapshots.

```sql
- template_assessment_id: Links to assessment
- question_id: Which question
- answer_value: User's answer
- linked_static_data_value: Frozen snapshot from static data
- score_achieved: Points earned
- evaluation_passed: Boolean result of evaluation
- evaluation_notes: Human-readable explanation
```

---

## 🔧 API Endpoints

### Question Bank (`/api/questions`)

```
GET    /api/questions                  # List all questions (with filters)
GET    /api/questions/:id              # Get single question with details
POST   /api/questions                  # Create new question
PUT    /api/questions/:id              # Update question
DELETE /api/questions/:id              # Soft delete (deactivate)
GET    /api/questions/meta/categories  # Get question categories
GET    /api/questions/meta/static-fields # Get available static fields
```

### Templates (`/api/templates`)

```
GET    /api/templates                  # List all templates
GET    /api/templates/:id              # Get template with questions
POST   /api/templates                  # Create new template
PUT    /api/templates/:id              # Update template
DELETE /api/templates/:id              # Soft delete
POST   /api/templates/:id/duplicate    # Duplicate template
GET    /api/templates/:id/statistics   # Get usage statistics
GET    /api/templates/meta/categories  # Get template categories
```

### Template Assessments (`/api/template-assessments`)

```
GET    /api/template-assessments                      # List all assessments
GET    /api/template-assessments/:id                  # Get assessment with answers
POST   /api/template-assessments/create               # Create from template
POST   /api/template-assessments/:id/answers          # Submit/update answers
POST   /api/template-assessments/:id/submit           # Final submission
```

### Static Data (`/api/static-data`)

```
GET    /api/static-data/fields                        # List all field definitions
GET    /api/static-data/fields/:fieldKey              # Get single field
POST   /api/static-data/fields                        # Create field definition
PUT    /api/static-data/fields/:fieldKey              # Update field

GET    /api/static-data/values/:institutionId         # Get all values for institution
GET    /api/static-data/values/:institutionId/:fieldKey # Get specific field value
POST   /api/static-data/values                        # Set value (creates new version)
POST   /api/static-data/values/:institutionId/bulk    # Bulk update values
GET    /api/static-data/values/:institutionId/:fieldKey/history # Get value history
```

---

## 🎯 Scoring Logic

### Rule-Based Evaluation

For `StaticDataLinked` and `Manual` questions:

```javascript
if (evaluation_rule === 'greater_than') {
  passed = actualValue > referenceValue;
} else if (evaluation_rule === 'equals') {
  passed = actualValue === referenceValue;
}
// ... other rules

scoreAchieved = passed ? question.weight : 0;
```

### Multi-Choice Evaluation

Questions define options with associated scores:

```json
{
  "options": {
    "None": 0,
    "Basic": 5,
    "Advanced": 10
  }
}
```

Score is directly taken from the selected option.

### Yes/No Evaluation

```javascript
scoreAchieved = answer === 'yes' ? question.weight : 0;
```

### Final Assessment Score

```javascript
TotalPossible = SUM(all question weights in template)
Achieved = SUM(score_achieved for all answers)
PercentageScore = (Achieved / TotalPossible) × 100

// Risk Level Determination
if (PercentageScore >= 80) riskLevel = 'Low';
else if (PercentageScore >= 60) riskLevel = 'Medium';
else if (PercentageScore >= 40) riskLevel = 'High';
else riskLevel = 'Critical';
```

---

## 🎨 Frontend Pages

### 1. **Question Bank** (`/question-bank`)
- List all questions with filters
- Create/edit/delete questions
- Configure evaluation rules
- Set options for multi-choice
- **Access**: Super Admin, Ministry Admin

### 2. **Template List** (`/templates`)
- Browse all templates
- View template details
- Duplicate templates
- **Access**: All authenticated users

### 3. **Template Builder** (`/templates/new`, `/templates/:id/edit`)
- Create/edit templates
- Add questions from question bank
- Reorder questions
- Set sections
- Override weights
- **Access**: Super Admin, Ministry Admin

### 4. **Template Assessments List** (`/template-assessments`)
- View all assessments
- Filter by entity, template, status
- Create new assessments
- **Access**: All authenticated users

### 5. **Template Assessment Wizard** (`/template-assessments/:id`)
- Take assessment
- View pre-filled answers from static data
- Answer manual questions
- Save draft
- Submit for review
- View scores and evaluation
- **Access**: All authenticated users (with entity permissions)

### 6. **Static Data Management** (`/static-data`)
- Manage institutional data
- Update field values
- View history (versioning)
- **Access**: All authenticated users (entity-specific for entity users)

---

## 🔄 Assessment Creation Flow

### Step 1: Admin Creates Template
1. Go to `/templates/new`
2. Enter template details (name, description, category)
3. Add questions from question bank
4. Arrange questions and set sections
5. Save template

### Step 2: User Creates Assessment
1. Go to `/template-assessments`
2. Click "Create New Assessment"
3. Select entity and template
4. System automatically:
   - Creates assessment record
   - Links to template
   - Loads all questions
   - **Pre-fills StaticDataLinked questions** from active static data
   - Creates frozen snapshots

### Step 3: User Completes Assessment
1. Open assessment
2. Static-linked questions are read-only (already scored)
3. Answer manual, multi-choice, and yes/no questions
4. Click "Save Answers" to auto-calculate scores
5. System evaluates each answer based on rules
6. Updates scores and risk level

### Step 4: User Submits
1. Click "Submit Assessment"
2. Status changes to "submitted"
3. Assessment becomes read-only
4. Ready for admin review/approval

---

## 📊 Sample Question Examples

### Example 1: StaticDataLinked with Rule

```json
{
  "question_text": "Does the organization have more than 500 employees?",
  "question_text_ar": "هل لدى المنظمة أكثر من 500 موظف؟",
  "question_type": "StaticDataLinked",
  "linked_static_data_field": "total_employees",
  "evaluation_rule": "greater_than",
  "reference_value": "500",
  "weight": 10.0
}
```

**Evaluation**:
- Reads `total_employees` from static data
- Checks if value > 500
- If true → 10 points, if false → 0 points

### Example 2: MultiChoice

```json
{
  "question_text": "What is the maturity level of your backup strategy?",
  "question_text_ar": "ما مستوى نضج استراتيجية النسخ الاحتياطي؟",
  "question_type": "MultiChoice",
  "options": {
    "None": 0,
    "Basic": 5,
    "Intermediate": 10,
    "Advanced": 15
  },
  "weight": 15.0
}
```

**Evaluation**:
- User selects one option
- Score = value of selected option
- Max possible = 15 (highest option value)

### Example 3: Manual with Validation

```json
{
  "question_text": "How many security incidents were reported last year?",
  "question_text_ar": "كم عدد الحوادث الأمنية المبلغ عنها؟",
  "question_type": "Manual",
  "evaluation_rule": "less_or_equal",
  "reference_value": "5",
  "weight": 10.0
}
```

**Evaluation**:
- User enters number
- Checks if value ≤ 5
- If true → 10 points, if false → 0 points

---

## 🚀 Setup Instructions

### 1. Run Database Migration

```bash
# Apply evaluation engine schema
node server/database/migrate_evaluation_engine.js
```

This will:
- Create all necessary tables
- Add sample data (fields, questions, templates)
- Set up triggers and views

### 2. Start the Server

```bash
npm run dev
```

The server will now include the new evaluation engine routes.

### 3. Access the System

Navigate to:
- **Question Bank**: http://localhost:5173/question-bank
- **Templates**: http://localhost:5173/templates
- **Assessments**: http://localhost:5173/template-assessments
- **Static Data**: http://localhost:5173/static-data

---

## 🔐 Security & Permissions

### Role-Based Access

| Feature | Entity User | Ministry Admin | Super Admin |
|---------|-------------|----------------|-------------|
| View Questions | ❌ | ✅ | ✅ |
| Create/Edit Questions | ❌ | ✅ | ✅ |
| View Templates | ✅ | ✅ | ✅ |
| Create/Edit Templates | ❌ | ✅ | ✅ |
| Create Assessments | ✅ (own entity) | ✅ | ✅ |
| Take Assessments | ✅ (own entity) | ✅ | ✅ |
| Manage Static Data | ✅ (own entity) | ✅ | ✅ |

---

## 📈 Key Benefits

### 1. **No Data Loss**
- Historical versioning preserves all changes
- Assessments use frozen snapshots
- Full audit trail

### 2. **Flexibility**
- Questions reusable across templates
- Easy to create new evaluation scenarios
- Dynamic rule-based scoring

### 3. **Automation**
- Auto-fill from static data
- Automatic scoring
- Real-time compliance tracking

### 4. **Transparency**
- Clear evaluation rules
- Detailed scoring breakdown
- Traceable results

### 5. **Scalability**
- Supports unlimited questions and templates
- Entity-specific data isolation
- Performance-optimized with indexes

---

## 🛠️ Technical Stack

- **Backend**: Node.js, Express, PostgreSQL
- **Frontend**: React, Tailwind CSS
- **Database**: PostgreSQL with JSONB, triggers, views
- **Authentication**: JWT
- **Authorization**: RBAC (Role-Based Access Control)

---

## 📝 Sample Data

The migration includes sample data:

### Static Data Fields (8 fields)
- Total Employees
- IT Staff Count
- Cybersecurity Staff
- Has Data Center
- Website Domain
- ISO 27001 Certified
- Has Firewall
- Annual IT Budget

### Questions (10 questions)
- Examples of all question types
- Configured with rules and weights
- Categorized (general, security, infrastructure)

### Templates (3 templates)
- Basic Security Assessment
- Comprehensive Maturity Assessment
- Infrastructure Readiness Check

### Static Data Values
- Pre-populated for 3 existing entities
- Ready to test assessment creation

---

## 🎯 Next Steps

1. **Run the migration** to set up the schema
2. **Explore the Question Bank** to understand question types
3. **Create a template** using existing questions
4. **Set up static data** for an institution
5. **Create an assessment** and see auto-fill in action
6. **Test the scoring** by submitting answers

---

## 🐛 Troubleshooting

### Issue: Migration Fails

**Solution**: Ensure main schema is applied first:
```bash
node server/database/migrate.js
# Then
node server/database/migrate_evaluation_engine.js
```

### Issue: Static Data Not Auto-Filling

**Solution**: Check:
1. Static data values exist and `is_active = true`
2. Question's `linked_static_data_field` matches field key
3. Entity has values for that field

### Issue: Scoring Not Working

**Solution**: Verify:
1. Question has `evaluation_rule` and `reference_value`
2. Answer value is in correct format (number vs string)
3. Check evaluation notes in `question_answers` table

---

## 📞 Support

For questions or issues:
- Review the code comments in route files
- Check database schema comments
- Examine sample data in migration script

---

**Built with ❤️ to enhance the Digital Maturity & Cybersecurity Assessment System**

---

## 📚 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Evaluation Engine                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Static     │    │   Question   │    │  Templates   │ │
│  │     Data     │    │     Bank     │    │              │ │
│  │  (Versioned) │    │  (Reusable)  │    │  (Scenarios) │ │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘ │
│         │                   │                    │          │
│         └───────────────────┼────────────────────┘          │
│                             │                               │
│                   ┌─────────▼─────────┐                    │
│                   │   Assessments     │                    │
│                   │  (with Answers)   │                    │
│                   │  + Auto-Scoring   │                    │
│                   └───────────────────┘                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Flow:
1. Admin defines Static Data Fields
2. Institutions populate Static Data Values
3. Admin creates Questions (linked to fields or manual)
4. Admin creates Templates (groups of questions)
5. User creates Assessment from Template
6. System auto-fills StaticDataLinked questions
7. User answers remaining questions
8. System auto-scores and calculates compliance
```

---

## ✅ Checklist for Go-Live

- [ ] Run database migration successfully
- [ ] Create at least 3 reusable questions
- [ ] Build a template with those questions
- [ ] Populate static data for test entity
- [ ] Create and complete a test assessment
- [ ] Verify scoring is correct
- [ ] Test draft save and resume
- [ ] Test submission workflow
- [ ] Review permissions for all roles
- [ ] Export assessment results

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**License**: Proprietary - Government Use Only
