# Digital Maturity & Cybersecurity Assessment System

A comprehensive web-based portal for tracking digital transformation and cybersecurity compliance across government entities and enterprises.

## Features

- 📊 **6-Step Wizard Assessment** - Structured data collection flow
- 🏢 **Multi-Entity Hierarchy** - Parent-child organization structure
- 📈 **Analytics Dashboard** - Automated maturity scoring and insights
- 📄 **PDF Export** - Generate reports matching original paper forms
- 📊 **Excel Export** - Comprehensive data export for analysis
- 🔒 **RBAC Security** - Role-based access control
- 🌐 **RTL Support** - Full Arabic interface support
- 💾 **Save & Resume** - Draft functionality for incomplete assessments

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL with JSONB
- **Authentication**: JWT
- **Charts**: Recharts
- **Exports**: jsPDF + xlsx

## Installation

1. **Clone and Install Dependencies**
```bash
npm install
```

2. **Setup Database**
```bash
# Create PostgreSQL database
createdb maturity_assessment

# Run migrations
node server/database/migrate.js
```

3. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start Development Server**
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Database Schema

See `server/database/schema.sql` for complete schema.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Assessments
- `GET /api/assessments` - List all assessments
- `POST /api/assessments` - Create new assessment
- `GET /api/assessments/:id` - Get assessment details
- `PUT /api/assessments/:id` - Update assessment
- `DELETE /api/assessments/:id` - Delete assessment
- `GET /api/assessments/:id/pdf` - Export as PDF
- `GET /api/assessments/export/excel` - Export all as Excel

### Entities
- `GET /api/entities` - List entities
- `POST /api/entities` - Create entity
- `GET /api/entities/:id` - Get entity details
- `GET /api/entities/:id/children` - Get child entities
- `GET /api/entities/:id/dashboard` - Get entity dashboard

### Analytics
- `GET /api/analytics/maturity-score/:assessmentId` - Calculate maturity score
- `GET /api/analytics/entity-summary/:entityId` - Entity summary statistics
- `GET /api/analytics/comparison` - Cross-entity comparison

## Project Structure

```
project_2/
├── server/
│   ├── index.js              # Express server
│   ├── database/
│   │   ├── schema.sql        # Database schema
│   │   ├── migrate.js        # Migration runner
│   │   └── db.js            # Database connection
│   ├── middleware/
│   │   └── auth.js          # Authentication middleware
│   ├── routes/
│   │   ├── auth.js
│   │   ├── assessments.js
│   │   ├── entities.js
│   │   └── analytics.js
│   └── utils/
│       ├── maturityScore.js  # Scoring engine
│       ├── pdfGenerator.js   # PDF export
│       └── excelGenerator.js # Excel export
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── components/
│   │   ├── Wizard/
│   │   ├── Dashboard/
│   │   └── Common/
│   ├── pages/
│   ├── services/
│   └── styles/
├── public/
└── package.json
```

## Default Users

After running migrations, you can use these test credentials:

- **Ministry Admin**: admin@ministry.gov / password123
- **Entity User**: user@entity.gov / password123

## License

Proprietary - Government Use Only
