-- Digital Maturity & Cybersecurity Assessment System
-- PostgreSQL Database Schema

-- Drop existing tables (for clean migration)
DROP TABLE IF EXISTS assessment_data CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS entities CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS entity_activity_type;
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS assessment_status;

-- Create ENUM types
CREATE TYPE entity_activity_type AS ENUM ('government', 'mixed', 'private');
CREATE TYPE user_role AS ENUM ('super_admin', 'ministry_admin', 'entity_user');
CREATE TYPE assessment_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'entity_user',
    entity_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entities table (supports parent-child hierarchy)
CREATE TABLE entities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    activity_type entity_activity_type NOT NULL,
    parent_entity_id INTEGER REFERENCES entities(id) ON DELETE SET NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assessments table
CREATE TABLE assessments (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status assessment_status NOT NULL DEFAULT 'draft',
    maturity_score DECIMAL(5,2),
    risk_level VARCHAR(20),
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    year INTEGER NOT NULL,
    quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assessment Data table (stores all form data as JSONB for flexibility)
CREATE TABLE assessment_data (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL CHECK (step_number BETWEEN 1 AND 7),
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_id, step_number)
);

-- Add foreign key for users.entity_id after entities table is created
ALTER TABLE users ADD CONSTRAINT fk_users_entity 
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_entity_id ON users(entity_id);
CREATE INDEX idx_entities_parent ON entities(parent_entity_id);
CREATE INDEX idx_assessments_entity ON assessments(entity_id);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_year ON assessments(year);
CREATE INDEX idx_assessment_data_assessment ON assessment_data(assessment_id);
CREATE INDEX idx_assessment_data_step ON assessment_data(step_number);
CREATE INDEX idx_assessment_data_jsonb ON assessment_data USING GIN (data);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_data_updated_at BEFORE UPDATE ON assessment_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
-- Sample parent entity (Ministry)
INSERT INTO entities (name, name_ar, activity_type, parent_entity_id, contact_email)
VALUES 
    ('Ministry of Digital Transformation', 'وزارة التحول الرقمي', 'government', NULL, 'info@modt.gov.iq'),
    ('Ministry of Interior', 'وزارة الداخلية', 'government', NULL, 'contact@moi.gov.iq');

-- Sample child entities (Companies/Departments)
INSERT INTO entities (name, name_ar, activity_type, parent_entity_id, contact_email)
VALUES 
    ('National Cybersecurity Center', 'المركز الوطني للأمن السيبراني', 'government', 1, 'ncc@modt.gov.iq'),
    ('Government IT Services', 'خدمات تقنية المعلومات الحكومية', 'government', 1, 'gits@modt.gov.iq'),
    ('Public Safety Department', 'دائرة السلامة العامة', 'government', 2, 'psd@moi.gov.iq');

-- Sample users (password: password123, hashed with bcrypt)
INSERT INTO users (email, password_hash, full_name, role, entity_id)
VALUES 
    ('admin@system.gov', '$2a$10$YourHashedPasswordHere', 'System Administrator', 'super_admin', NULL),
    ('admin@modt.gov', '$2a$10$YourHashedPasswordHere', 'Ministry Admin', 'ministry_admin', 1),
    ('user@ncc.gov', '$2a$10$YourHashedPasswordHere', 'NCC Manager', 'entity_user', 3);

-- Create view for assessment summary
CREATE OR REPLACE VIEW assessment_summary AS
SELECT 
    a.id,
    a.status,
    a.maturity_score,
    a.risk_level,
    a.year,
    a.quarter,
    e.name as entity_name,
    e.name_ar as entity_name_ar,
    e.activity_type,
    u.full_name as created_by_name,
    a.created_at,
    a.submitted_at,
    (SELECT COUNT(*) FROM assessment_data ad WHERE ad.assessment_id = a.id) as completed_steps
FROM assessments a
JOIN entities e ON a.entity_id = e.id
JOIN users u ON a.created_by = u.id;

-- Create view for entity hierarchy
CREATE OR REPLACE VIEW entity_hierarchy AS
WITH RECURSIVE entity_tree AS (
    SELECT 
        id, 
        name, 
        name_ar,
        parent_entity_id, 
        0 as level,
        ARRAY[id] as path
    FROM entities 
    WHERE parent_entity_id IS NULL
    
    UNION ALL
    
    SELECT 
        e.id, 
        e.name, 
        e.name_ar,
        e.parent_entity_id, 
        et.level + 1,
        et.path || e.id
    FROM entities e
    JOIN entity_tree et ON e.parent_entity_id = et.id
)
SELECT * FROM entity_tree;

COMMENT ON TABLE users IS 'System users with role-based access';
COMMENT ON TABLE entities IS 'Government entities in parent-child hierarchy';
COMMENT ON TABLE assessments IS 'Main assessment records';
COMMENT ON TABLE assessment_data IS 'Flexible JSONB storage for form data';
COMMENT ON COLUMN assessment_data.data IS 'JSONB field storing step-specific form data';
