-- Migration 014: Salary Structures Upgrade & Salary Slips
-- Phase 2 of ERP Implementation Plan
-- Adds dynamic salary components, structure-component mapping,
-- salary slips with approval workflow, and predefined templates.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Salary Components (dynamic, user-definable)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS salary_components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('earning', 'deduction')),
  
  -- Calculation method
  calc_type VARCHAR(20) NOT NULL DEFAULT 'fixed' 
    CHECK (calc_type IN ('fixed', 'percentage', 'formula')),
  calc_on VARCHAR(50),
  default_value DECIMAL(10,2) DEFAULT 0,
  
  -- Statutory flags
  is_statutory BOOLEAN DEFAULT 0,
  is_taxable BOOLEAN DEFAULT 1,
  affects_pf BOOLEAN DEFAULT 0,
  affects_esi BOOLEAN DEFAULT 0,
  
  -- Display
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Link salary structures to components (many-to-many)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS salary_structure_components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  salary_structure_id INTEGER NOT NULL,
  salary_component_id INTEGER NOT NULL,
  amount DECIMAL(10,2) DEFAULT 0,
  percentage DECIMAL(5,2),
  
  FOREIGN KEY (salary_structure_id) REFERENCES salary_structures(id) ON DELETE CASCADE,
  FOREIGN KEY (salary_component_id) REFERENCES salary_components(id),
  UNIQUE(salary_structure_id, salary_component_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Salary Slips (with approval workflow)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS salary_slips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  payroll_month VARCHAR(7) NOT NULL,
  salary_structure_id INTEGER,
  
  -- Calculated totals
  days_in_month INTEGER NOT NULL DEFAULT 30,
  days_worked INTEGER NOT NULL DEFAULT 0,
  days_absent INTEGER DEFAULT 0,
  
  total_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Approval workflow: draft > pending > approved > paid > cancelled
  status VARCHAR(20) DEFAULT 'draft' 
    CHECK (status IN ('draft', 'pending', 'approved', 'paid', 'cancelled')),
  
  approved_by INTEGER,
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  payment_method VARCHAR(20),
  transaction_reference VARCHAR(100),
  
  -- Link to legacy payroll (if generated from existing payroll flow)
  payroll_id INTEGER,
  
  notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (salary_structure_id) REFERENCES salary_structures(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (payroll_id) REFERENCES payroll(id),
  UNIQUE(employee_id, payroll_month)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Salary Slip Line Items (component breakdown)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS salary_slip_components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  salary_slip_id INTEGER NOT NULL,
  component_code VARCHAR(30) NOT NULL,
  component_name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('earning', 'deduction')),
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  
  FOREIGN KEY (salary_slip_id) REFERENCES salary_slips(id) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Indexes
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_salary_slips_employee ON salary_slips(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_slips_month ON salary_slips(payroll_month);
CREATE INDEX IF NOT EXISTS idx_salary_slips_status ON salary_slips(status);
CREATE INDEX IF NOT EXISTS idx_salary_components_type ON salary_components(type);
CREATE INDEX IF NOT EXISTS idx_ssc_structure ON salary_structure_components(salary_structure_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Upgrade salary_structures table with new columns
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE salary_structures ADD COLUMN description TEXT;
ALTER TABLE salary_structures ADD COLUMN template_type VARCHAR(30) DEFAULT 'custom';
ALTER TABLE salary_structures ADD COLUMN ctc DECIMAL(12,2) DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Seed standard salary components
-- ═══════════════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO salary_components (code, name, type, calc_type, is_statutory, is_taxable, affects_pf, display_order) VALUES
  ('BASIC', 'Basic Salary', 'earning', 'fixed', 0, 1, 1, 1),
  ('HRA', 'House Rent Allowance', 'earning', 'percentage', 0, 1, 0, 2),
  ('DA', 'Dearness Allowance', 'earning', 'fixed', 0, 1, 1, 3),
  ('SPECIAL', 'Special Allowance', 'earning', 'fixed', 0, 1, 0, 4),
  ('CONV', 'Conveyance Allowance', 'earning', 'fixed', 0, 1, 0, 5),
  ('MEDICAL', 'Medical Allowance', 'earning', 'fixed', 0, 1, 0, 6),
  ('BONUS', 'Performance Bonus', 'earning', 'fixed', 0, 1, 0, 7),
  ('OT', 'Overtime Pay', 'earning', 'fixed', 0, 1, 0, 8),
  ('PF_EE', 'Provident Fund (Employee)', 'deduction', 'percentage', 1, 0, 0, 10),
  ('ESI_EE', 'ESI (Employee)', 'deduction', 'percentage', 1, 0, 0, 11),
  ('PT', 'Professional Tax', 'deduction', 'fixed', 1, 0, 0, 12),
  ('TDS', 'Tax Deducted at Source', 'deduction', 'formula', 1, 0, 0, 13),
  ('LWF', 'Labour Welfare Fund', 'deduction', 'fixed', 1, 0, 0, 14),
  ('ADV', 'Salary Advance Recovery', 'deduction', 'fixed', 0, 0, 0, 15);
