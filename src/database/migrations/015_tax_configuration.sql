-- Migration 015: Tax Configuration & Employee Tax Declarations
-- Phase 3 of ERP Implementation Plan
-- Adds tax regime configuration, employee tax declarations (80C/80D/HRA),
-- professional tax state rates, and tax computation logs.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Employee Tax Declarations (Section 80C, 80D, HRA, etc.)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS employee_tax_declarations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  financial_year VARCHAR(9) NOT NULL,

  -- Tax Regime Choice
  tax_regime VARCHAR(5) NOT NULL DEFAULT 'new' CHECK (tax_regime IN ('old', 'new')),

  -- Section 80C (max ₹1,50,000)
  sec_80c_ppf DECIMAL(10,2) DEFAULT 0,
  sec_80c_elss DECIMAL(10,2) DEFAULT 0,
  sec_80c_lic DECIMAL(10,2) DEFAULT 0,
  sec_80c_nsc DECIMAL(10,2) DEFAULT 0,
  sec_80c_tuition DECIMAL(10,2) DEFAULT 0,
  sec_80c_home_loan_principal DECIMAL(10,2) DEFAULT 0,
  sec_80c_others DECIMAL(10,2) DEFAULT 0,

  -- Section 80D (Health Insurance)
  sec_80d_self DECIMAL(10,2) DEFAULT 0,
  sec_80d_parents DECIMAL(10,2) DEFAULT 0,
  sec_80d_senior_parents DECIMAL(10,2) DEFAULT 0,

  -- Section 80E (Education Loan)
  sec_80e_education_loan DECIMAL(10,2) DEFAULT 0,

  -- Section 24b (Home Loan Interest)
  sec_24b_home_loan_interest DECIMAL(10,2) DEFAULT 0,

  -- HRA Exemption (Old Regime)
  hra_rent_paid_annual DECIMAL(10,2) DEFAULT 0,
  hra_city_type VARCHAR(10) DEFAULT 'non_metro' CHECK (hra_city_type IN ('metro', 'non_metro')),

  -- NPS - Section 80CCD(1B) additional ₹50,000
  sec_80ccd_nps DECIMAL(10,2) DEFAULT 0,

  -- Professional Tax (annual)
  professional_tax_annual DECIMAL(10,2) DEFAULT 0,

  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'verified')),
  verified_by INTEGER,
  verified_at TIMESTAMP,
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (verified_by) REFERENCES users(id),
  UNIQUE(employee_id, financial_year)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Tax Computation Log (monthly TDS snapshots)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tax_computation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  payroll_month VARCHAR(7) NOT NULL,
  financial_year VARCHAR(9) NOT NULL,
  tax_regime VARCHAR(5) NOT NULL,

  -- Income components
  gross_annual_income DECIMAL(12,2) DEFAULT 0,
  standard_deduction DECIMAL(10,2) DEFAULT 0,
  hra_exemption DECIMAL(10,2) DEFAULT 0,
  sec_80c_total DECIMAL(10,2) DEFAULT 0,
  sec_80d_total DECIMAL(10,2) DEFAULT 0,
  other_deductions DECIMAL(10,2) DEFAULT 0,
  taxable_income DECIMAL(12,2) DEFAULT 0,

  -- Tax breakdown
  tax_on_income DECIMAL(10,2) DEFAULT 0,
  education_cess DECIMAL(10,2) DEFAULT 0,
  surcharge DECIMAL(10,2) DEFAULT 0,
  total_annual_tax DECIMAL(10,2) DEFAULT 0,
  
  -- Monthly TDS
  months_remaining INTEGER DEFAULT 12,
  tds_already_deducted DECIMAL(10,2) DEFAULT 0,
  monthly_tds DECIMAL(10,2) DEFAULT 0,

  -- Professional Tax
  professional_tax_monthly DECIMAL(10,2) DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Professional Tax State Rates
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS professional_tax_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  state VARCHAR(50) NOT NULL,
  min_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_salary DECIMAL(10,2),
  monthly_tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  effective_from DATE DEFAULT CURRENT_DATE
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Indexes
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_tax_decl_emp_fy ON employee_tax_declarations(employee_id, financial_year);
CREATE INDEX IF NOT EXISTS idx_tax_log_emp_month ON tax_computation_log(employee_id, payroll_month);
CREATE INDEX IF NOT EXISTS idx_pt_rates_state ON professional_tax_rates(state);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Add tax regime preference to employees table
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE employees ADD COLUMN tax_regime VARCHAR(5) DEFAULT 'new';
ALTER TABLE employees ADD COLUMN state VARCHAR(50) DEFAULT 'Gujarat';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Seed Professional Tax Rates (Gujarat + Key States)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO professional_tax_rates (state, min_salary, max_salary, monthly_tax) VALUES
  ('Gujarat', 0, 5999, 0),
  ('Gujarat', 6000, 8999, 80),
  ('Gujarat', 9000, 11999, 150),
  ('Gujarat', 12000, NULL, 200),
  ('Maharashtra', 0, 7499, 0),
  ('Maharashtra', 7500, 9999, 175),
  ('Maharashtra', 10000, NULL, 200),
  ('Karnataka', 0, 14999, 0),
  ('Karnataka', 15000, NULL, 200),
  ('Tamil Nadu', 0, 21000, 0),
  ('Tamil Nadu', 21001, NULL, 208);
