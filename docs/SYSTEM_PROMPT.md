# SYSTEM PROMPT: Digital Maturity & Cybersecurity Assessment System

## Project Overview

Build a comprehensive web-based assessment portal for government entities to track digital transformation and cybersecurity compliance across multiple organizations.

---

## Core Requirements

### 1. Assessment Flow (6-Step Wizard)

Create a multi-step wizard with the following structure:

#### **Step 1: General Information**
- Total employees (required)
- IT staff count (required)
- Cybersecurity staff count (required)
- Calculate and display ratios
- Warning if cybersecurity staff < 1% of total

#### **Step 2: Infrastructure** (Conditional Logic)
- Radio: "Has digital infrastructure?" (Yes/No)
- **IF YES, show:**
  - Data center count
  - Physical servers
  - Virtual servers
  - Storage capacity (TB)
  - Network types (checkboxes: LAN, WAN, Cloud, Hybrid, Other)
  - **Dynamic Inventory Table:**
    - Add/Remove rows functionality
    - Columns: Type (dropdown), Brand, Model, Quantity
    - Dropdown options: Router, Switch, Firewall, Load Balancer, Access Point, Server, Storage, UPS, Other
- **IF NO:** Show informational message and skip to next step

#### **Step 3: Digital Services**
- Service types (multi-select checkboxes): Government Services, Financial, ERP, CRM, Portal, Mobile App
- Website management (dropdown): Internal, External, Hybrid, None
- Domain type (dropdown): .gov.iq, .iq, .com, .org, Other
  - Green checkmark if .gov.iq selected
- Email infrastructure (dropdown): Internal Servers, External Service, Hybrid, None
- Email users count
- Security gateway (dropdown): Yes, No, Planning
  - Warning if "No"

#### **Step 4: Cybersecurity** (Highest Weight)
- **Compliance Standards** (checkboxes with priority badges):
  - ISO 27001 (Recommended)
  - NIST Cybersecurity Framework (Recommended)
  - ISO 27032, PCI DSS, GDPR, None
- **Security Tools** (checkboxes with critical badges):
  - **Critical Tools:** Firewall, IDS/IPS, Backup, MFA (red badge)
  - **Other Tools:** IAM, SIEM, DLP, Endpoint Protection, VPN, WAF
- **Real-time Assessment Display:**
  - Progress bar showing critical tools implemented
  - Warning list of missing critical tools
  - Success message if all critical tools present
  - Summary: Total compliance standards, Total security tools

#### **Step 5: Monitoring & Approvals**
- Security approval obtained (dropdown): Yes, No, In Progress
  - Warning if "No"
- NDA signed (dropdown): Yes, No, N/A
- Reporting frequency (dropdown): Quarterly (recommended), Yearly, Monthly, Ad-hoc, None
- Has subsidiaries (dropdown): Yes, No
  - **IF YES:** Show field for subsidiary count

#### **Step 6: Advanced Technical**
- **Virtualization:**
  - Uses virtualization (dropdown): Yes, No, Planning
  - IF YES: Virtualization type (VMware, Hyper-V, KVM, Citrix, Cloud, Other)
- **Networking:**
  - Has VPN/MPLS (dropdown): Yes, No
  - IF YES: Connection type (VPN, MPLS, Both)
- **API Integration:**
  - Uses APIs (dropdown): Yes, No, Planning
  - IF YES: Approximate API count
- **Security Testing:**
  - Pentesting frequency (dropdown): Quarterly, Semi-Annual, Yearly, Ad-hoc, Never
    - Warning if "Never"
  - Has SOC (dropdown): Yes, No, Outsourced
  - Has NOC (dropdown): Yes, No, Outsourced
  - Disaster recovery plan (dropdown): Yes, No, In Progress

---

### 2. Data Architecture

#### Database Schema (PostgreSQL)

**Users Table:**
- id, email (unique), password_hash, full_name
- role (enum: super_admin, ministry_admin, entity_user)
- entity_id (foreign key), is_active, timestamps

**Entities Table (Parent-Child Hierarchy):**
- id, name, name_ar, activity_type (enum: government, mixed, private)
- parent_entity_id (self-referencing foreign key)
- contact_email, contact_phone, address, is_active, timestamps

**Assessments Table:**
- id, entity_id (FK), created_by (FK to users)
- status (enum: draft, submitted, approved, rejected)
- maturity_score (decimal), risk_level (varchar)
- year, quarter, submitted_at, approved_at, approved_by (FK), timestamps

**Assessment_Data Table (JSONB Storage):**
- id, assessment_id (FK), step_number (1-6)
- data (JSONB - stores step-specific form data)
- timestamps
- UNIQUE constraint on (assessment_id, step_number)

**Views:**
- assessment_summary: Joins assessments, entities, users
- entity_hierarchy: Recursive CTE for parent-child relationships

---

### 3. Maturity Scoring Algorithm

**Total: 100 points**

| Category | Points | Criteria |
|----------|--------|----------|
| General Info | 10 | IT staff ≥5% (5pt), Cyber staff ≥1% (5pt) |
| Infrastructure | 20 | Data centers (5pt), Networks (5pt), Inventory ≥3 items (10pt) |
| Digital Services | 20 | Services exist (5pt), Internal web (5pt), .gov.iq (5pt), Internal email (5pt) |
| **Cybersecurity** | **30** | ISO 27001 (5pt), NIST (5pt), 4 critical tools (10pt), 4 other tools (10pt) |
| Monitoring | 10 | Security approval (5pt), NDA (2pt), Quarterly reports (3pt) |
| Advanced | 10 | Virtualization (2pt), VPN (2pt), APIs (2pt), Pentesting (2pt), SOC/NOC (2pt) |

**Risk Levels:**
- **Critical:** < 40 points (Red)
- **High:** 40-59 points (Orange)
- **Medium:** 60-79 points (Yellow)
- **Low:** ≥ 80 points (Green)

**Risk Identification:**
- Cyber staff < 1%
- No MFA
- No backup solution
- No firewall
- No compliance standards
- No pentesting

---

### 4. User Roles & Permissions

#### Super Admin
- Full system access
- Manage all entities
- View all assessments
- System configuration

#### Ministry Admin
- View ministry and child entities (recursive)
- View/approve assessments for ministry tree
- Access ministry dashboard
- Manage child entities

#### Entity User
- Create/edit assessments for their entity only
- View own entity assessments
- Cannot approve assessments

---

### 5. Key Features

#### Save & Resume
- Auto-save on step navigation
- Draft status allows editing
- Submitted/Approved assessments are read-only

#### Ministry Dashboard
- **Statistics Cards:**
  - Total child entities
  - Total assessments
  - Average maturity score
  - High/Critical risk count
- **Charts:**
  - Risk distribution (Pie chart)
  - Maturity scores comparison (Bar chart - top 10 entities)
- **Entities Table:**
  - Entity name, type, assessment count, maturity score, risk level, last assessment date, status
- **Recommendations:**
  - Critical risk warning (if any critical entities)
  - Improvement suggestions (if avg score < 60)
- Export comparison to Excel

#### PDF Export ("Mirror" Feature)
- Generate PDF that mimics original paper form layout
- Multi-page document with:
  - Header with entity info, year, quarter, status, scores
  - All 6 steps with Arabic/English labels
  - Infrastructure inventory table
  - Summary sections
  - Page numbers and generation timestamp
- Download naming: `assessment_{id}_{timestamp}.pdf`

#### Excel Export ("Master Sheet")
- Multiple worksheets:
  1. Assessment Summary (all assessments)
  2. General Information (Step 1 data)
  3. Infrastructure (Step 2 data)
  4. Digital Services (Step 3 data)
  5. Cybersecurity (Step 4 data - boolean columns for each tool)
  6. Monitoring & Advanced (Steps 5 & 6 data)
  7. Risk Analysis (calculated risks per assessment)
- Filters: Entity, Year, Status
- Download naming: `assessments_export_{timestamp}.xlsx`

---

### 6. UI/UX Requirements

#### RTL (Right-to-Left) Support
- Set `dir="rtl"` on root HTML element
- Use `lang="ar"` attribute
- Import Arabic fonts: Tajawal, Almarai
- Use Tailwind's `space-x-reverse` utility
- Mirror icons where appropriate (`.rtl-mirror` class)

#### Color Scheme
- Primary: Blue (#2196f3)
- Success: Green (#4caf50)
- Warning: Yellow/Orange (#ff9800)
- Danger: Red (#f44336)
- Info: Cyan (#00bcd4)

#### Components
- **Wizard Stepper:** Horizontal with circles, connecting lines, step titles (AR + EN)
- **Form Elements:** Large inputs, clear labels (Arabic + English), inline validation
- **Badges:** Status (draft, submitted, approved), Risk level, Activity type
- **Cards:** Rounded, shadow, white background
- **Buttons:** Primary (blue), Secondary (gray), Success (green), Danger (red), Outline
- **Tables:** Striped rows, hover effect, sticky header
- **Modal:** Overlay with centered content, click-outside to close

#### Responsive Design
- Desktop: Full wizard horizontal
- Tablet: Maintain horizontal layout
- Mobile: Stack wizard vertically, smaller fonts, full-width cards

---

### 7. Technical Stack

#### Backend
- **Runtime:** Node.js 18+ with ES Modules
- **Framework:** Express.js
- **Database:** PostgreSQL 14+ with JSONB
- **Authentication:** JWT (Bearer tokens)
- **Password Hashing:** bcryptjs
- **PDF Generation:** jsPDF with jspdf-autotable
- **Excel Generation:** xlsx (SheetJS)
- **Date Handling:** date-fns

#### Frontend
- **Framework:** React 18 with Hooks
- **Routing:** React Router v6
- **HTTP Client:** Axios with interceptors
- **Styling:** Tailwind CSS 3
- **Charts:** Recharts
- **Build Tool:** Vite
- **Fonts:** Google Fonts (Tajawal, Almarai)

#### DevOps
- **Process Manager:** PM2 (production)
- **Reverse Proxy:** Nginx (optional)
- **Database Backup:** pg_dump (automated cron)
- **Deployment:** Docker or traditional server

---

### 8. API Endpoints Structure

```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/auth/me
PUT    /api/auth/change-password

GET    /api/entities
POST   /api/entities
GET    /api/entities/:id
PUT    /api/entities/:id
GET    /api/entities/:id/children
GET    /api/entities/:id/dashboard

GET    /api/assessments
POST   /api/assessments
GET    /api/assessments/:id
PUT    /api/assessments/:id/step/:stepNumber
POST   /api/assessments/:id/submit
POST   /api/assessments/:id/review
DELETE /api/assessments/:id

GET    /api/analytics/maturity-score/:assessmentId
GET    /api/analytics/entity-summary/:entityId
GET    /api/analytics/comparison
GET    /api/analytics/ministry-dashboard/:ministryId

GET    /api/exports/pdf/:assessmentId
GET    /api/exports/excel
GET    /api/exports/comparison-excel
```

---

### 9. Security Requirements

- **Authentication:** JWT with secure secret (min 32 chars)
- **Authorization:** Role-based middleware (checkEntityAccess)
- **Password:** bcrypt with salt rounds = 10
- **SQL Injection:** Parameterized queries only
- **CORS:** Whitelist specific origins
- **HTTPS:** Enforce in production
- **Rate Limiting:** Optional (express-rate-limit)
- **Input Validation:** Server-side validation on all endpoints
- **Session Management:** Token expiry (7 days default)

---

### 10. File Structure

```
project_2/
├── server/
│   ├── index.js (Express app)
│   ├── database/
│   │   ├── schema.sql
│   │   ├── migrate.js
│   │   └── db.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── entities.js
│   │   ├── assessments.js
│   │   ├── analytics.js
│   │   └── exports.js
│   └── utils/
│       ├── pdfGenerator.js
│       └── excelGenerator.js
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── components/
│   │   ├── Layout.jsx
│   │   ├── WizardStepper.jsx
│   │   └── wizard/
│   │       ├── Step1GeneralInfo.jsx
│   │       ├── Step2Infrastructure.jsx
│   │       ├── Step3DigitalServices.jsx
│   │       ├── Step4Cybersecurity.jsx
│   │       ├── Step5Monitoring.jsx
│   │       └── Step6Advanced.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── AssessmentWizard.jsx
│   │   ├── AssessmentList.jsx
│   │   ├── EntityManagement.jsx
│   │   └── MinistryDashboard.jsx
│   └── services/
│       ├── api.js
│       └── index.js
├── docs/
│   ├── API_DOCUMENTATION.md
│   └── DEPLOYMENT_GUIDE.md
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .env.example
├── .gitignore
└── README.md
```

---

### 11. Sample Data Seeds

**Default Users:**
1. Super Admin: admin@system.gov / password123
2. Ministry Admin: admin@modt.gov / password123
3. Entity User: user@ncc.gov / password123

**Sample Entities:**
1. Ministry of Digital Transformation (parent)
   - National Cybersecurity Center (child)
   - Government IT Services (child)
2. Ministry of Interior (parent)
   - Public Safety Department (child)

---

### 12. Critical Success Factors

✅ **Conditional Logic:** Infrastructure section must hide/show based on "has_infrastructure"
✅ **Dynamic Table:** Inventory table with add/remove rows functionality
✅ **Real-time Feedback:** Step 4 shows critical tools progress and warnings
✅ **Maturity Calculation:** Accurate scoring algorithm with risk identification
✅ **Parent-Child Hierarchy:** Recursive entity queries for ministry access
✅ **RTL Support:** Full Arabic interface with proper text alignment
✅ **Save & Resume:** Draft functionality with JSONB step storage
✅ **PDF Mirror:** Export matches original paper form layout
✅ **Excel Master:** Comprehensive multi-sheet export with all data points
✅ **Ministry Dashboard:** Analytics with charts and entity comparison
✅ **Role-Based Access:** Proper permission checks at API and UI levels

---

### 13. Testing Scenarios

1. **Wizard Flow:**
   - Complete all 6 steps
   - Navigate back and forth (data persists)
   - Submit assessment (all steps required)
   - Try to edit after submission (should be blocked)

2. **Conditional Logic:**
   - Select "No infrastructure" → fields hidden
   - Change to "Yes" → fields appear with previous data

3. **Inventory Table:**
   - Add 5 rows
   - Delete middle row
   - Edit cell values
   - Submit and verify in database

4. **Scoring:**
   - Create assessment with no security tools → Critical risk
   - Add MFA, Firewall, Backup → Risk improves
   - Complete all fields optimally → Low risk (score ≥80)

5. **Permissions:**
   - Entity user tries to access another entity → 403 error
   - Ministry admin views child entity → Success
   - Entity user tries to approve → 403 error

6. **Exports:**
   - PDF includes all 6 steps with proper Arabic text
   - Excel has 7 sheets with correct data
   - Ministry comparison Excel filters by parent

---

### 14. Future Enhancements (Optional)

- Email notifications on assessment submission/approval
- Audit log for all changes
- Multi-language support (add English full interface)
- Advanced analytics (trends over time, predictive insights)
- Mobile app (React Native)
- API rate limiting
- Two-factor authentication (2FA)
- Custom report templates
- Integration with external systems (API endpoints)
- Real-time collaboration (WebSockets)

---

## Implementation Checklist

- [ ] Set up project structure
- [ ] Create PostgreSQL database and schema
- [ ] Implement authentication (JWT)
- [ ] Build all 6 wizard step components with conditional logic
- [ ] Create dynamic inventory table with add/remove functionality
- [ ] Implement maturity scoring algorithm
- [ ] Build ministry dashboard with charts
- [ ] Create PDF export (mirror paper form)
- [ ] Create Excel export (master sheet)
- [ ] Add RTL support and Arabic UI
- [ ] Implement role-based access control
- [ ] Add save & resume functionality
- [ ] Test all conditional logic paths
- [ ] Verify parent-child entity hierarchy
- [ ] Test all user roles and permissions
- [ ] Create documentation (API, Deployment)
- [ ] Set up production environment
- [ ] Deploy and configure

---

## Delivery Package

1. **Source Code:** Complete project with all files
2. **Documentation:**
   - README.md (overview, features, installation)
   - API_DOCUMENTATION.md (all endpoints with examples)
   - DEPLOYMENT_GUIDE.md (step-by-step deployment)
3. **Database:**
   - schema.sql (full schema with indexes, views)
   - migrate.js (automated setup with sample data)
4. **Configuration:**
   - .env.example (all required environment variables)
   - package.json (all dependencies with versions)
5. **Docker Files:** (optional)
   - Dockerfile
   - docker-compose.yml

---

## Key Differentiators

🔹 **Conditional Logic:** Infrastructure section adapts based on user input
🔹 **Dynamic Tables:** Add/remove inventory items on the fly
🔹 **Real-time Scoring:** Immediate feedback on security posture in Step 4
🔹 **Hierarchical Access:** Ministry sees all children, entity sees only self
🔹 **Mirror PDF:** Exact replica of original paper form
🔹 **Master Excel:** Single file with all data points across sheets
🔹 **RTL-First:** Built for Arabic from the ground up
🔹 **JSONB Flexibility:** Schema-less step data storage for easy extensions

---

This system prompt provides everything needed to build or extend the Digital Maturity & Cybersecurity Assessment System. Use it as a comprehensive guide for AI code generation, team briefing, or project documentation.
