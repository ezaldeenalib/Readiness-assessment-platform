# 🚀 Quick Start Guide - Digital Maturity Assessment System

## ⚡ 5-Minute Setup

### 1. Install Dependencies
```bash
cd project_2
npm install
```

### 2. Setup Database
```bash
# Create database
createdb maturity_assessment

# Run migrations (creates tables + sample data)
node server/database/migrate.js
```

### 3. Configure Environment
```bash
# Copy example
cp .env.example .env

# Edit .env with your database password
# DB_PASSWORD=your_postgres_password
```

### 4. Start Application
```bash
npm run dev
```

**🌐 Access:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

---

## 👤 Login Credentials

| User | Email | Password | Access |
|------|-------|----------|--------|
| Super Admin | admin@system.gov | password123 | Full system |
| Ministry Admin | admin@modt.gov | password123 | Ministry + children |
| Entity User | user@ncc.gov | password123 | Own entity only |

---

## 📋 Key Features at a Glance

### ✅ 6-Step Assessment Wizard
1. **General Info** - Employees and staffing
2. **Infrastructure** - Servers, networks, inventory (conditional)
3. **Digital Services** - Website, email, services
4. **Cybersecurity** - Compliance and security tools (30 points!)
5. **Monitoring** - Approvals, reporting, subsidiaries
6. **Advanced** - Virtualization, VPN, APIs, SOC/NOC

### 🎯 Maturity Scoring
- **Total:** 100 points
- **Risk Levels:** Critical (<40), High (40-59), Medium (60-79), Low (≥80)
- **Auto-calculated** based on 30+ criteria

### 📊 Ministry Dashboard
- View all child entities
- Compare maturity scores
- Risk distribution charts
- Export to Excel

### 📄 Exports
- **PDF:** Mirror of paper form
- **Excel:** Multi-sheet master report

---

## 🗂️ Project Structure

```
project_2/
├── server/           # Backend (Node.js + Express)
│   ├── index.js
│   ├── database/     # PostgreSQL schema & migrations
│   ├── routes/       # API endpoints
│   └── utils/        # PDF & Excel generators
├── src/              # Frontend (React + Tailwind)
│   ├── components/   # Wizard steps, Layout
│   ├── pages/        # Dashboard, Lists, etc.
│   └── services/     # API client
├── docs/             # Documentation
└── package.json
```

---

## 🔑 Critical Files

| File | Purpose |
|------|---------|
| `server/database/schema.sql` | Complete database structure |
| `server/routes/analytics.js` | Scoring algorithm |
| `src/components/wizard/` | All 6 assessment steps |
| `src/pages/MinistryDashboard.jsx` | Analytics dashboard |
| `docs/SYSTEM_PROMPT.md` | Full system specification |

---

## 🎨 UI Highlights

- **RTL Support:** Full Arabic interface
- **Fonts:** Tajawal, Almarai
- **Responsive:** Desktop, tablet, mobile
- **Conditional Logic:** Infrastructure section shows/hides
- **Dynamic Tables:** Add/remove inventory rows
- **Real-time Feedback:** Security assessment in Step 4

---

## 🔒 Security Features

- JWT authentication
- bcrypt password hashing
- Role-based access control (RBAC)
- Parameterized SQL queries
- CORS configuration
- HTTPS ready

---

## 📊 Database Schema Overview

### Key Tables
- `users` - Authentication & roles
- `entities` - Parent-child hierarchy
- `assessments` - Main assessment records
- `assessment_data` - JSONB step data (flexible)

### Views
- `assessment_summary` - Joined assessment info
- `entity_hierarchy` - Recursive entity tree

---

## 🛠️ Common Commands

```bash
# Development
npm run dev         # Start both backend + frontend
npm run server      # Backend only
npm run client      # Frontend only

# Production
npm run build       # Build React app
node server/index.js # Start production server

# Database
node server/database/migrate.js  # Run migrations
pg_dump maturity_assessment > backup.sql  # Backup

# Process Management (PM2)
pm2 start server/index.js --name maturity
pm2 logs maturity
pm2 restart maturity
```

---

## 📈 Maturity Score Breakdown

| Category | Points | Key Items |
|----------|--------|-----------|
| General Info | 10 | Staff ratios |
| Infrastructure | 20 | Servers, networks |
| Services | 20 | Website, email |
| **Cybersecurity** | **30** | **MFA, Firewall, Backup** |
| Monitoring | 10 | Approvals, reporting |
| Advanced | 10 | SOC, NOC, pentesting |

---

## 🚨 Critical Security Tools (Step 4)

**Must Have (10 points each):**
- ✅ Firewall
- ✅ IDS/IPS
- ✅ Backup Solution
- ✅ MFA (Multi-Factor Auth)

**Missing any?** → High/Critical risk!

---

## 📱 API Quick Reference

### Authentication
```bash
POST /api/auth/login
POST /api/auth/register
```

### Assessments
```bash
GET  /api/assessments
POST /api/assessments
GET  /api/assessments/:id
PUT  /api/assessments/:id/step/:stepNumber
POST /api/assessments/:id/submit
```

### Analytics
```bash
GET /api/analytics/maturity-score/:assessmentId
GET /api/analytics/ministry-dashboard/:ministryId
```

### Exports
```bash
GET /api/exports/pdf/:assessmentId
GET /api/exports/excel
```

**Full API docs:** `docs/API_DOCUMENTATION.md`

---

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify connection
psql -U postgres -d maturity_assessment
```

### Port Already in Use
```bash
# Find and kill process on port 3000
lsof -i :3000
kill -9 <PID>
```

### Reset Database
```bash
dropdb maturity_assessment
createdb maturity_assessment
node server/database/migrate.js
```

---

## 📚 Documentation Index

1. **README.md** - Project overview
2. **API_DOCUMENTATION.md** - All endpoints with examples
3. **DEPLOYMENT_GUIDE.md** - Production deployment steps
4. **SYSTEM_PROMPT.md** - Complete system specification

---

## 🎯 User Journeys

### Entity User
1. Login → Dashboard
2. Click "New Assessment"
3. Complete 6 steps (auto-saves)
4. Submit for approval
5. Export PDF

### Ministry Admin
1. Login → Ministry Dashboard
2. View all child entities
3. Review maturity scores & risks
4. Export comparison Excel
5. Approve/reject assessments

---

## 💡 Pro Tips

1. **Save Often:** Each step auto-saves when you click "Next"
2. **Step 4 is Critical:** Focus on security tools (30% of score)
3. **Conditional Fields:** Infrastructure section adapts to your answer
4. **Inventory Table:** Click "Add Device" multiple times for full inventory
5. **Risk Warnings:** Red warnings indicate critical issues
6. **Ministry View:** Admins see all children in one dashboard

---

## 🔄 Update Workflow

```bash
git pull origin main
npm install              # Update dependencies
npm run build            # Rebuild frontend
pm2 restart maturity     # Restart server
```

---

## 📞 Support

- **Technical Issues:** Check logs in `~/.pm2/logs/`
- **Database Issues:** Review PostgreSQL logs
- **API Errors:** Check browser console + network tab
- **Email:** support@modt.gov.iq

---

## ⚖️ License

Proprietary - Government Use Only

---

## 🎉 You're Ready!

- ✅ Application running
- ✅ Database configured
- ✅ Sample data loaded
- ✅ Ready to create assessments

**Next Steps:**
1. Login with test credentials
2. Create a new assessment
3. Complete all 6 steps
4. View maturity score
5. Export PDF/Excel

**Need help?** Check `docs/` folder for detailed guides.

---

Made with ❤️ for Digital Transformation
