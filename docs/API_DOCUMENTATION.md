# API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Authentication Endpoints

### POST /auth/login
Login to the system

**Request Body:**
```json
{
  "email": "admin@modt.gov",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@modt.gov",
    "full_name": "Ministry Admin",
    "role": "ministry_admin",
    "entity_id": 1,
    "entity_name": "Ministry of Digital Transformation",
    "entity_name_ar": "وزارة التحول الرقمي"
  }
}
```

### POST /auth/register
Register a new user

**Request Body:**
```json
{
  "email": "user@entity.gov",
  "password": "secure_password",
  "full_name": "User Name",
  "role": "entity_user",
  "entity_id": 3
}
```

### GET /auth/me
Get current user info (requires authentication)

---

## Entities Endpoints

### GET /entities
Get all entities (filtered by user role)

**Query Parameters:**
- `parent_id` (optional): Filter by parent entity
- `include_children` (optional): Include hierarchical data

**Response:**
```json
{
  "entities": [
    {
      "id": 1,
      "name": "Ministry of Digital Transformation",
      "name_ar": "وزارة التحول الرقمي",
      "activity_type": "government",
      "parent_entity_id": null,
      "contact_email": "info@modt.gov.iq"
    }
  ]
}
```

### GET /entities/:id
Get entity details by ID

### POST /entities
Create new entity (admin only)

**Request Body:**
```json
{
  "name": "New Department",
  "name_ar": "دائرة جديدة",
  "activity_type": "government",
  "parent_entity_id": 1,
  "contact_email": "contact@dept.gov.iq",
  "contact_phone": "+964 1234567",
  "address": "Baghdad, Iraq"
}
```

### PUT /entities/:id
Update entity (admin only)

### GET /entities/:id/children
Get child entities

### GET /entities/:id/dashboard
Get entity dashboard statistics

---

## Assessments Endpoints

### GET /assessments
Get all assessments (filtered by user role)

**Query Parameters:**
- `status`: Filter by status (draft, submitted, approved, rejected)
- `year`: Filter by year
- `entity_id`: Filter by entity

**Response:**
```json
{
  "assessments": [
    {
      "id": 1,
      "entity_id": 3,
      "entity_name": "National Cybersecurity Center",
      "entity_name_ar": "المركز الوطني للأمن السيبراني",
      "status": "approved",
      "maturity_score": 75.5,
      "risk_level": "medium",
      "year": 2026,
      "quarter": 1,
      "created_at": "2026-01-11T10:00:00Z",
      "submitted_at": "2026-01-11T12:00:00Z"
    }
  ]
}
```

### GET /assessments/:id
Get assessment details with all step data

**Response:**
```json
{
  "assessment": {
    "id": 1,
    "entity_id": 3,
    "entity_name": "National Cybersecurity Center",
    "status": "approved",
    "maturity_score": 75.5,
    "risk_level": "medium",
    "year": 2026,
    "quarter": 1
  },
  "data": {
    "step1": {
      "total_employees": 500,
      "it_staff": 50,
      "cybersecurity_staff": 10
    },
    "step2": {
      "has_infrastructure": "yes",
      "data_center_count": 2,
      "physical_servers": 20,
      "virtual_servers": 50,
      "storage_tb": 100,
      "network_types": ["lan", "wan", "cloud"],
      "inventory": [
        {
          "type": "Router - موجه",
          "brand": "Cisco",
          "model": "ISR4451",
          "quantity": 5
        }
      ]
    },
    "step3": {
      "services": ["government", "portal", "mobile_app"],
      "website_management": "internal",
      "domain_type": ".gov.iq",
      "email_infrastructure": "internal",
      "email_users": 500,
      "security_gateway": "yes"
    },
    "step4": {
      "compliance": ["ISO 27001", "NIST"],
      "security_tools": ["firewall", "ids_ips", "backup", "mfa", "siem"]
    },
    "step5": {
      "security_approval": "yes",
      "nda_signed": "yes",
      "reporting_frequency": "quarterly",
      "has_subsidiaries": "no"
    },
    "step6": {
      "uses_virtualization": "yes",
      "virtualization_type": "vmware",
      "has_vpn": "yes",
      "vpn_type": "both",
      "api_integration": "yes",
      "api_count": 10,
      "pentesting_frequency": "quarterly",
      "has_soc": "yes",
      "has_noc": "yes",
      "disaster_recovery": "yes"
    }
  }
}
```

### POST /assessments
Create new assessment

**Request Body:**
```json
{
  "entity_id": 3,
  "year": 2026,
  "quarter": 1
}
```

### PUT /assessments/:id/step/:stepNumber
Update assessment step data (1-6)

**Request Body:**
```json
{
  "data": {
    "total_employees": 500,
    "it_staff": 50,
    "cybersecurity_staff": 10
  }
}
```

### POST /assessments/:id/submit
Submit assessment for review

### POST /assessments/:id/review
Approve or reject assessment (admin only)

**Request Body:**
```json
{
  "action": "approve",
  "comments": "Looks good"
}
```

### DELETE /assessments/:id
Delete draft assessment

---

## Analytics Endpoints

### GET /analytics/maturity-score/:assessmentId
Calculate and get maturity score for an assessment

**Response:**
```json
{
  "score": 75.5,
  "maxScore": 100,
  "percentage": 76,
  "riskLevel": "medium",
  "risks": [
    "No penetration testing performed",
    "Insufficient cybersecurity staffing (< 1% of total employees)"
  ]
}
```

### GET /analytics/entity-summary/:entityId
Get entity summary statistics

**Response:**
```json
{
  "summary": {
    "total_assessments": 5,
    "avg_maturity_score": 72.3,
    "approved_count": 4,
    "critical_risk_count": 0,
    "high_risk_count": 1,
    "last_assessment_date": "2026-01-11T12:00:00Z"
  },
  "trend": [
    { "year": 2026, "quarter": 1, "avg_score": 75.5 },
    { "year": 2025, "quarter": 4, "avg_score": 70.2 }
  ]
}
```

### GET /analytics/comparison
Compare entities

**Query Parameters:**
- `parent_entity_id` (optional): Filter by parent entity

**Response:**
```json
{
  "comparison": [
    {
      "id": 3,
      "name": "National Cybersecurity Center",
      "name_ar": "المركز الوطني للأمن السيبراني",
      "assessment_count": 5,
      "avg_maturity_score": 75.5,
      "max_maturity_score": 82.0,
      "min_maturity_score": 68.0,
      "critical_count": 0,
      "high_count": 1
    }
  ]
}
```

### GET /analytics/ministry-dashboard/:ministryId
Get ministry-wide dashboard data

**Response:**
```json
{
  "entities": [
    {
      "id": 3,
      "name": "National Cybersecurity Center",
      "name_ar": "المركز الوطني للأمن السيبراني",
      "activity_type": "government",
      "maturity_score": 75.5,
      "risk_level": "medium",
      "last_assessment_status": "approved",
      "last_assessment_date": "2026-01-11T12:00:00Z",
      "total_assessments": 5
    }
  ],
  "ministry_statistics": {
    "entities_with_assessments": 3,
    "total_assessments": 15,
    "avg_maturity_score": 70.2,
    "critical_count": 0,
    "high_count": 2,
    "medium_count": 8,
    "low_count": 5
  }
}
```

---

## Export Endpoints

### GET /exports/pdf/:assessmentId
Export assessment as PDF

**Response:** PDF file download

### GET /exports/excel
Export multiple assessments as Excel

**Query Parameters:**
- `entity_id` (optional)
- `year` (optional)
- `status` (optional)

**Response:** Excel file download with multiple sheets:
- Assessment Summary
- General Information
- Infrastructure
- Digital Services
- Cybersecurity
- Monitoring & Advanced
- Risk Analysis

### GET /exports/comparison-excel
Export entity comparison as Excel

**Query Parameters:**
- `parent_entity_id` (optional)

**Response:** Excel file download

---

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "error": "Access token required"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Maturity Score Calculation

The maturity score is calculated based on the following criteria (total 100 points):

### Step 1: General Information (10 points)
- IT staff ratio ≥ 5%: 5 points
- Cybersecurity staff ratio ≥ 1%: 5 points

### Step 2: Infrastructure (20 points)
- Has data centers: 5 points
- Has network types defined: 5 points
- Has adequate inventory (≥3 items): 10 points

### Step 3: Digital Services (20 points)
- Provides digital services: 5 points
- Internal website management: 5 points
- Uses .gov.iq domain: 5 points
- Internal email infrastructure: 5 points

### Step 4: Cybersecurity (30 points) - MOST CRITICAL
- ISO 27001 compliance: 5 points
- NIST framework compliance: 5 points
- Critical security tools (Firewall, IDS/IPS, Backup, MFA): 2.5 points each (10 total)
- Other security tools (IAM, SIEM, DLP, Endpoint): 2.5 points each (10 total)

### Step 5: Monitoring & Approvals (10 points)
- Security approval obtained: 5 points
- NDA signed: 2 points
- Quarterly reporting: 3 points

### Step 6: Advanced Technical (10 points)
- Uses virtualization: 2 points
- Has VPN: 2 points
- API integration: 2 points
- Performs pentesting: 2 points
- Has SOC/NOC: 2 points

### Risk Levels:
- **Critical**: Score < 40
- **High**: Score 40-59
- **Medium**: Score 60-79
- **Low**: Score ≥ 80
