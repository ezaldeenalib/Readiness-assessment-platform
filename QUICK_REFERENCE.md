# ⚡ Quick Reference Card - Evaluation Engine

## 🚀 Installation (30 seconds)

```bash
# 1. Run migration
node server/database/migrate_evaluation_engine.js

# 2. Start server
npm run dev

# 3. Login at http://localhost:5173
# Email: admin@modt.gov | Password: password123
```

---

## 📍 Page URLs

| Page | URL | Access |
|------|-----|--------|
| Question Bank | `/question-bank` | Admin only |
| Templates List | `/templates` | All users |
| Create Template | `/templates/new` | Admin only |
| Assessments List | `/template-assessments` | All users |
| Static Data | `/static-data` | All users |

---

## 🎯 Question Types

| Type | Purpose | Example | Auto-Score |
|------|---------|---------|------------|
| **StaticDataLinked** | Auto-filled from data | "Has >500 employees?" | ✅ Yes |
| **Manual** | User enters value | "Security incidents?" | ✅ Yes |
| **MultiChoice** | Select from options | "Backup maturity level?" | ✅ Yes |
| **YesNo** | Boolean question | "Has firewall?" | ✅ Yes |
| **ParentChild** | Conditional follow-up | If "Yes" → show child | ✅ Yes |

---

## ⚖️ Evaluation Rules

| Rule | Symbol | Example |
|------|--------|---------|
| `greater_than` | > | Value > 500 |
| `less_than` | < | Value < 100 |
| `equals` | = | Value = "true" |
| `not_equals` | ≠ | Value ≠ "none" |
| `greater_or_equal` | ≥ | Value ≥ 50 |
| `less_or_equal` | ≤ | Value ≤ 10 |
| `contains` | ⊃ | Value contains ".gov" |
| `exists` | ∃ | Value is not empty |
| `in_range` | ⊆ | 50 ≤ Value ≤ 100 |

---

## 📊 Scoring Formula

```
For each question:
  if (evaluation passes) → score = question.weight
  else → score = 0

Total Score = SUM(all scores)
Total Possible = SUM(all weights)
Percentage = (Total Score / Total Possible) × 100

Risk Level:
  ≥ 80% = Low
  60-79% = Medium
  40-59% = High
  < 40% = Critical
```

---

## 🔄 Common Workflows

### Create Question
1. Go to `/question-bank`
2. Click "Add Question"
3. Fill form (text, type, rule, weight)
4. Save

### Build Template
1. Go to `/templates/new`
2. Enter template details
3. Click "Add Question"
4. Select questions from list
5. Arrange and set sections
6. Save

### Set Static Data
1. Go to `/static-data`
2. Select entity
3. Fill form fields
4. Click "Save Data"
5. **New version created!**

### Create Assessment
1. Go to `/template-assessments`
2. Click "Create New"
3. Select entity + template
4. **Auto-fill happens!**
5. Answer remaining questions
6. Save → Submit

---

## 🗄️ Key Database Tables

| Table | Purpose | Key Feature |
|-------|---------|-------------|
| `static_data_fields` | Field definitions | National form structure |
| `static_data_values` | Institutional data | **Versioned history** |
| `questions` | Question bank | Reusable across templates |
| `templates` | Evaluation scenarios | Groups of questions |
| `template_questions` | Link table | Ordering + sections |
| `template_assessments` | Assessment + scores | Automatic calculation |
| `question_answers` | Answers + snapshots | **Frozen at creation** |

---

## 🔧 API Quick Reference

### Questions
```bash
GET    /api/questions              # List
POST   /api/questions              # Create
PUT    /api/questions/:id          # Update
DELETE /api/questions/:id          # Delete
```

### Templates
```bash
GET    /api/templates              # List
POST   /api/templates              # Create
PUT    /api/templates/:id          # Update
POST   /api/templates/:id/duplicate # Copy
```

### Assessments
```bash
GET    /api/template-assessments           # List
POST   /api/template-assessments/create    # Create
POST   /api/template-assessments/:id/answers # Save
POST   /api/template-assessments/:id/submit # Submit
```

### Static Data
```bash
GET    /api/static-data/values/:entityId   # Get values
POST   /api/static-data/values             # Set value
POST   /api/static-data/values/:entityId/bulk # Bulk update
```

---

## 🎨 Color Codes (UI)

### Question Types
- 🔵 Blue = StaticDataLinked
- 🟣 Purple = MultiChoice
- 🟢 Green = YesNo
- 🟡 Yellow = Manual
- ⚫ Gray = ParentChild

### Status
- 🟡 Yellow = Draft
- 🔵 Blue = Submitted
- 🟢 Green = Approved
- 🔴 Red = Rejected

### Risk Level
- 🟢 Green = Low (≥80%)
- 🟡 Yellow = Medium (60-79%)
- 🟠 Orange = High (40-59%)
- 🔴 Red = Critical (<40%)

---

## 💡 Pro Tips

### Tip 1: Question Reuse
Create questions once, use unlimited times across templates.

### Tip 2: Weight Strategy
Distribute 100 points across template:
- Critical items: 20 points
- Important: 10 points
- Nice-to-have: 5 points

### Tip 3: Section Organization
Group related questions:
```
📁 Personnel (3 questions)
📁 Infrastructure (4 questions)
📁 Security (5 questions)
```

### Tip 4: Static Data First
Always set static data before creating assessments for auto-fill.

### Tip 5: Versioning
Each static data update creates a new version. Old assessments keep their snapshots.

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Migration fails | Run main schema first: `migrate.js` |
| Cannot access Question Bank | Login as Admin (not entity user) |
| No auto-fill | Check static data exists and is active |
| Score is 0 | Verify evaluation rule and reference value |
| Page not found | Check URL and role permissions |

---

## 🔑 Sample Credentials

```
Super Admin:
  Email: admin@modt.gov
  Password: password123
  Access: All pages

Entity User:
  Email: user@ncc.gov
  Password: password123
  Access: Limited (own entity only)
```

---

## 📦 Sample Data Included

- ✅ 8 static data fields
- ✅ 24 static data values (3 entities)
- ✅ 10 questions (all types)
- ✅ 3 templates
- ✅ 24 template-question links

**Ready to test immediately!**

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `EVALUATION_ENGINE_README.md` | Complete guide (800+ lines) |
| `QUICK_SETUP_EVALUATION_ENGINE.md` | Step-by-step setup |
| `IMPLEMENTATION_SUMMARY.md` | What was built |
| `QUICK_REFERENCE.md` | This file! |

---

## 🎯 One-Minute Test

```bash
# 1. Run migration
node server/database/migrate_evaluation_engine.js

# 2. Start server
npm run dev

# 3. Login
Open http://localhost:5173
Login as admin@modt.gov

# 4. View templates
Go to /templates
See 3 pre-loaded templates

# 5. View static data
Go to /static-data
Select "National Cybersecurity Center"
See pre-filled data

# 6. Create assessment
Go to /template-assessments
Click "Create New"
Select entity + template
See auto-filled answers!
```

---

## ⚡ Key Commands

```bash
# Run migration
node server/database/migrate_evaluation_engine.js

# Start dev server
npm run dev

# Check database
psql maturity_assessment -c "SELECT * FROM questions LIMIT 5;"

# View logs
# Check terminal for error messages
```

---

## 🎉 Success Checklist

After setup, you should be able to:

- [x] Login to system
- [x] Access Question Bank
- [x] View Templates
- [x] See Static Data
- [x] Create Assessment
- [x] See Auto-fill
- [x] Submit Answers
- [x] View Score

---

**Print this page for quick reference! 📄**

**Last Updated**: January 2026  
**Version**: 1.0.0
