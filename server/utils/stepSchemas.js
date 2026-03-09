import { z } from 'zod';

const safeString = () => z.string().max(2000).optional();
const safeStringArr = () => z.array(z.string().max(500)).max(100).optional();
const safeNum = () => z.number().int().min(0).max(10_000_000).optional();

// Step 1 — General Information
const Step1Schema = z.object({
  total_employees: safeNum(),
  it_staff: safeNum(),
  cybersecurity_staff: safeNum(),
  it_budget: z.number().min(0).max(1e12).optional(),
  cyber_budget: z.number().min(0).max(1e12).optional(),
}).passthrough();

// Step 2 — Infrastructure
const Step2Schema = z.object({
  has_infrastructure: z.enum(['yes', 'no']).optional(),
  data_center_count: safeNum(),
  physical_servers: safeNum(),
  virtual_servers: safeNum(),
  storage_amount: z.number().min(0).max(1e9).optional(),
  storage_unit: z.string().max(10).optional(),
  infrastructure_managed_by: z.enum(['internal', 'third_party', 'hybrid']).optional(),
  third_party_name: safeString(),
  network_types: safeStringArr(),
  network_types_other: safeString(),
  has_accurate_asset_register: z.enum(['yes', 'no']).optional(),
  inventory: z.array(z.object({
    type: z.string().max(200).optional(),
    brand: z.string().max(200).optional(),
    model: z.string().max(200).optional(),
    quantity: safeNum(),
    storage_amount: z.number().min(0).optional(),
    storage_unit: z.string().max(10).optional(),
  }).passthrough()).max(500).optional(),
}).passthrough();

// Step 3 — Digital Services
const Step3Schema = z.object({
  services: safeStringArr(),
  services_other: safeString(),
  service_details: safeString(),
  services_documented: z.enum(['yes', 'no']).optional(),
  has_official_website: z.enum(['yes', 'no']).optional(),
  website_managed_by: z.enum(['internal', 'external', 'hybrid']).optional(),
  website_external_company_name: safeString(),
  domain_type: z.string().max(100).optional(),
  domain_type_other: safeString(),
  has_official_email: z.enum(['yes', 'no']).optional(),
  email_domain_name: safeString(),
  email_type: z.enum(['internal', 'external', 'both']).optional(),
  email_users: safeNum(),
  email_protection: z.enum(['yes', 'no']).optional(),
}).passthrough();

// Step 4 — Cybersecurity
const Step4Schema = z.object({
  compliance: safeStringArr(),
  compliance_levels: z.record(z.string().max(20)).optional(),
  has_cybersecurity_unit: z.enum(['yes', 'no']).optional(),
  security_tools: safeStringArr(),
  security_tools_other: safeString(),
  has_mfa: z.enum(['yes', 'no']).optional(),
  user_permissions_review: z.enum(['yes', 'no']).optional(),
}).passthrough();

// Step 5 — Monitoring & Approvals
const Step5Schema = z.object({
  security_approval: z.enum(['yes', 'no']).optional(),
  nda_signed: z.enum(['yes', 'no']).optional(),
  reporting_frequency: z.enum(['monthly', 'quarterly', 'yearly', 'none']).optional(),
}).passthrough();

// Step 6 — Advanced Technical
const Step6Schema = z.object({
  uses_virtualization: z.enum(['yes', 'no']).optional(),
  has_vpn: z.enum(['yes', 'no']).optional(),
  api_integration: z.enum(['yes', 'no']).optional(),
  pentesting_frequency: z.string().max(50).optional(),
  has_soc: z.enum(['yes', 'no']).optional(),
  has_noc: z.enum(['yes', 'no']).optional(),
}).passthrough();

// Step 7 — Generic / custom
const Step7Schema = z.record(z.unknown()).refine(
  (obj) => JSON.stringify(obj).length <= 50_000,
  'Step data too large'
);

const STEP_SCHEMAS = {
  1: Step1Schema,
  2: Step2Schema,
  3: Step3Schema,
  4: Step4Schema,
  5: Step5Schema,
  6: Step6Schema,
  7: Step7Schema,
};

export function validateStepData(step, data) {
  const schema = STEP_SCHEMAS[step];
  if (!schema) return { success: false, error: `No schema for step ${step}` };
  const result = schema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.flatten() };
  }
  return { success: true, data: result.data };
}
