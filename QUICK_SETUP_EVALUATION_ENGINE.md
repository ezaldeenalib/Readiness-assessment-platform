# ⚡ Quick Setup Guide - Template-based Evaluation Engine

## 🚀 5-Minute Setup

### Step 1: Apply Database Schema (2 minutes)

```bash
# Navigate to project directory
cd c:\Users\Abo aliz\Desktop\work\projectes\project_2

# Run the evaluation engine migration
node server/database/migrate_evaluation_engine.js
```

**Expected Output:**
```
🚀 Starting Evaluation Engine Migration...

📊 Creating evaluation engine tables...
✅ Evaluation engine schema created successfully!

📋 Created Tables:
   ✓ static_data_fields
   ✓ static_data_values
   ✓ questions
   ✓ templates
   ✓ template_questions
   ✓ template_assessments
   ✓ question_answers

📈 Sample Data Loaded:
   • Static Data Fields: 8
   • Static Data Values: 24
   • Questions: 10
   • Templates: 3
   • Template Questions: 24

✨ Migration completed successfully!
```

### Step 2: Start the Application (1 minute)

```bash
# Start the development server
npm run dev
```

The server will start on:
- **Backend API**: http://localhost:3000
- **Frontend**: http://localhost:5173

### Step 3: Login and Explore (2 minutes)

1. **Open browser**: http://localhost:5173
2. **Login** with credentials:
   - Email: `admin@modt.gov`
   - Password: `password123`

3. **Access new features** from the menu or URLs:

---

## 📍 Quick Navigation

### For Administrators

| Page | URL | Purpose |
|------|-----|---------|
| Question Bank | `/question-bank` | Manage reusable questions |
| Templates | `/templates` | View all templates |
| Create Template | `/templates/new` | Build new evaluation template |
| Static Data Fields | `/static-data` | Manage national form fields |

### For All Users

| Page | URL | Purpose |
|------|-----|---------|
| Template Assessments | `/template-assessments` | List all template-based assessments |
| Static Data | `/static-data` | Manage institutional static data |

---

## 🎯 Quick Test Workflow

### Test 1: Create a Simple Template (3 minutes)

1. Go to **Question Bank** (`/question-bank`)
2. Browse existing questions (10 sample questions loaded)
3. Go to **Templates** (`/templates`)
4. Click **"Create New Template"**
5. Fill in:
   - Name: "Test Security Assessment"
   - Name (Arabic): "تقييم أمني تجريبي"
   - Category: "security"
6. Click **"Add Question"**
7. Select 3-5 questions from the list
8. Click on each question to set section names (optional)
9. Click **"Create Template"**

✅ **Success**: Template created with selected questions!

---

### Test 2: Set Static Data for an Entity (2 minutes)

1. Go to **Static Data Management** (`/static-data`)
2. Select an entity (e.g., "National Cybersecurity Center")
3. Fill in the form fields:
   - Total Employees: `650`
   - IT Staff: `50`
   - Cybersecurity Staff: `30`
   - Has Data Center: `Yes`
   - Website Domain: `ncc.gov.iq`
   - ISO 27001 Certified: `Yes`
   - Has Firewall: `Yes`
   - Annual Budget: `6000000`
4. Click **"Save Data"**

✅ **Success**: Static data saved with historical version!

---

### Test 3: Create and Complete an Assessment (5 minutes)

1. Go to **Template Assessments** (`/template-assessments`)
2. Click **"Create New Assessment"**
3. Select:
   - Entity: "National Cybersecurity Center"
   - Template: "Comprehensive Maturity Assessment"
   - Year: 2026
   - Quarter: Q1
4. Click **"Create Assessment"**

The assessment page will load with:
- ✅ Auto-filled answers from static data (read-only)
- 📝 Manual questions awaiting your input
- 🎯 Initial score based on auto-filled data

5. Answer the manual questions:
   - For Yes/No: Select Yes or No
   - For Multi-Choice: Select an option
   - For Manual Input: Enter a value

6. Click **"Save Answers"** to calculate score
7. Review the updated score and risk level
8. Click **"Submit Assessment"** when ready

✅ **Success**: Assessment completed with automatic scoring!

---

## 🎓 Sample Data Overview

### Pre-loaded Questions (10)

1. **More than 500 employees?** (StaticDataLinked)
2. **Adequate IT staff?** (StaticDataLinked)
3. **Has cybersecurity staff?** (StaticDataLinked)
4. **Owns data center?** (StaticDataLinked)
5. **ISO 27001 certified?** (StaticDataLinked)
6. **Regular security audits?** (YesNo)
7. **Incident response plan?** (YesNo)
8. **Backup strategy maturity?** (MultiChoice)
9. **Security awareness training level?** (MultiChoice)
10. **Security incidents last year?** (Manual)

### Pre-loaded Templates (3)

1. **Basic Security Assessment**
   - 5 questions
   - 80 total points
   - Focus: Fundamental security controls

2. **Comprehensive Maturity Assessment**
   - 10 questions
   - 145 total points
   - Coverage: All aspects

3. **Infrastructure Readiness Check**
   - 4 questions
   - 50 total points
   - Focus: Scale and facilities

### Pre-loaded Static Data

Data for 3 entities:
- National Cybersecurity Center (610 employees)
- Government IT Services (420 employees)
- Public Safety Department (280 employees)

---

## 🔍 Verification Checklist

After setup, verify:

- [ ] Database tables created (7 new tables)
- [ ] Sample data loaded (questions, templates, static data)
- [ ] Can login to the system
- [ ] Can access Question Bank page
- [ ] Can access Templates page
- [ ] Can create a new template
- [ ] Can manage static data for an entity
- [ ] Can create a template-based assessment
- [ ] Can view auto-filled answers from static data
- [ ] Can save and score answers
- [ ] Can submit an assessment

---

## 🐛 Common Issues & Quick Fixes

### Issue 1: Migration Script Fails

**Error**: `relation "entities" does not exist`

**Fix**: Run the main schema first:
```bash
node server/database/migrate.js
node server/database/migrate_evaluation_engine.js
```

---

### Issue 2: Cannot Access Question Bank

**Error**: "Access denied" or redirected to dashboard

**Fix**: Ensure you're logged in as:
- `admin@modt.gov` (Ministry Admin), OR
- Super Admin account

Entity users cannot access Question Bank.

---

### Issue 3: Static Data Not Auto-Filling

**Problem**: Assessment created but questions are empty

**Check**:
1. Does the entity have static data values?
   - Go to `/static-data`
   - Select the entity
   - Verify fields are filled

2. Are the questions properly linked?
   - Go to `/question-bank`
   - Check question type is `StaticDataLinked`
   - Verify `linked_static_data_field` is set

---

### Issue 4: Scoring Shows 0

**Problem**: Submitted answers but score remains 0

**Debug**:
1. Check evaluation rules in question:
   - Does it have `evaluation_rule`?
   - Does it have `reference_value`?

2. Check answer format:
   - Numbers should be numeric (not strings with commas)
   - Booleans should be "true" or "false"

3. View evaluation notes:
   - In assessment wizard, check "Evaluation Notes" under each question
   - It explains why score was 0

---

## 📚 Next Steps

After quick setup:

1. **Explore Question Types**
   - Create a question of each type
   - Test evaluation rules

2. **Build Custom Template**
   - Create your own template
   - Group questions into sections
   - Override weights

3. **Test Complete Workflow**
   - Create assessment for different entities
   - Compare scores
   - View historical data

4. **Review Documentation**
   - Read `EVALUATION_ENGINE_README.md`
   - Understand scoring logic
   - Learn API endpoints

---

## 💡 Pro Tips

### Tip 1: Question Naming
Use clear, specific question text:
- ✅ "Does organization have >500 employees?"
- ❌ "Staff count check"

### Tip 2: Template Organization
Group questions logically:
```
Section: Personnel
- Question 1
- Question 2

Section: Infrastructure
- Question 3
- Question 4
```

### Tip 3: Weight Assignment
Distribute weights based on importance:
- Critical security controls: 15-20 points
- Important practices: 10 points
- Good-to-have features: 5 points

### Tip 4: Static Data Updates
Update static data regularly:
- Each update creates a new historical version
- Old assessments keep their frozen snapshots
- No data is lost

---

## 🎉 Success Indicators

You've successfully set up the Evaluation Engine when you can:

✅ Create a question in the Question Bank  
✅ Build a template with selected questions  
✅ Set static data for an entity  
✅ Create an assessment from a template  
✅ See auto-filled answers from static data  
✅ Submit answers and get automatic scores  
✅ View percentage score and risk level  
✅ Review historical versions of static data  

---

## 📞 Need Help?

- **Check logs**: Server console shows detailed error messages
- **Database queries**: Use pgAdmin or psql to inspect data
- **API testing**: Use Postman or curl to test endpoints
- **Code inspection**: All routes have detailed comments

---

**You're all set! 🚀**

Start creating intelligent, template-based assessments with automatic scoring!

---

**Setup Time**: ~5 minutes  
**Difficulty**: Easy  
**Prerequisites**: Existing Digital Maturity Assessment System running
