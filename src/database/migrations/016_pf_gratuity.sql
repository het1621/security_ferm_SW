-- Migration 016: PF and Gratuity System
-- Phase 4 of ERP Implementation Plan
-- Adds PF accounts, transactions, employer/employee split,
-- gratuity accruals, and PF loan tracking.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. PF Accounts (one per employee)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pf_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL UNIQUE,
  uan_number VARCHAR(20),
  pf_number VARCHAR(30),
  date_of_enrollment DATE,
  
  -- Running balances
  employee_balance DECIMAL(12,2) DEFAULT 0,
  employer_balance DECIMAL(12,2) DEFAULT 0,
  eps_balance DECIMAL(12,2) DEFAULT 0,
  total_balance DECIMAL(12,2) DEFAULT 0,
  
  -- Interest
  interest_rate DECIMAL(4,2) DEFAULT 8.25,
  interest_accrued DECIMAL(12,2) DEFAULT 0,
  
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. PF Transactions (monthly contributions + withdrawals)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pf_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pf_account_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  payroll_month VARCHAR(7) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (
    transaction_type IN ('contribution', 'withdrawal', 'interest', 'loan', 'loan_repayment')
  ),
  
  -- Contribution breakdown
  basic_salary DECIMAL(10,2) DEFAULT 0,
  employee_contribution DECIMAL(10,2) DEFAULT 0,
  employer_pf_contribution DECIMAL(10,2) DEFAULT 0,
  employer_eps_contribution DECIMAL(10,2) DEFAULT 0,
  admin_charges DECIMAL(10,2) DEFAULT 0,
  
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Running balance after this transaction
  running_balance DECIMAL(12,2) DEFAULT 0,
  
  salary_slip_id INTEGER,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (pf_account_id) REFERENCES pf_accounts(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (salary_slip_id) REFERENCES salary_slips(id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. PF Loans (advances against PF balance)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pf_loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pf_account_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  
  loan_amount DECIMAL(12,2) NOT NULL,
  outstanding_balance DECIMAL(12,2) NOT NULL,
  monthly_repayment DECIMAL(10,2) NOT NULL,
  interest_rate DECIMAL(4,2) DEFAULT 1,
  
  purpose VARCHAR(50) CHECK (purpose IN (
    'medical', 'housing', 'education', 'marriage', 'other'
  )),
  
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'repaid', 'cancelled')),
  approved_by INTEGER,
  approved_at TIMESTAMP,
  start_month VARCHAR(7),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (pf_account_id) REFERENCES pf_accounts(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Gratuity Accruals (monthly provisioning)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS gratuity_accruals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  accrual_month VARCHAR(7) NOT NULL,
  
  basic_plus_da DECIMAL(10,2) NOT NULL DEFAULT 0,
  years_of_service DECIMAL(5,2) NOT NULL DEFAULT 0,
  
  -- Gratuity formula: (Basic + DA) * Years / 26
  gratuity_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  monthly_provision DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Running total
  cumulative_provision DECIMAL(12,2) DEFAULT 0,
  
  is_eligible BOOLEAN DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Gratuity Payouts (when employee leaves after 5+ years)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS gratuity_payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  
  last_drawn_basic DECIMAL(10,2) NOT NULL,
  last_drawn_da DECIMAL(10,2) NOT NULL DEFAULT 0,
  years_of_service DECIMAL(5,2) NOT NULL,
  
  calculated_amount DECIMAL(12,2) NOT NULL,
  capped_amount DECIMAL(12,2) NOT NULL,
  
  payment_date DATE,
  payment_method VARCHAR(20) DEFAULT 'bank_transfer',
  transaction_reference VARCHAR(100),
  
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  approved_by INTEGER,
  approved_at TIMESTAMP,
  
  separation_date DATE NOT NULL,
  separation_reason VARCHAR(50) CHECK (separation_reason IN (
    'resignation', 'retirement', 'termination', 'death', 'disability'
  )),
  
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Indexes
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_pf_txn_account ON pf_transactions(pf_account_id, payroll_month);
CREATE INDEX IF NOT EXISTS idx_pf_txn_emp ON pf_transactions(employee_id, payroll_month);
CREATE INDEX IF NOT EXISTS idx_gratuity_accrual_emp ON gratuity_accruals(employee_id, accrual_month);
CREATE INDEX IF NOT EXISTS idx_pf_loans_emp ON pf_loans(employee_id, status);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Add UAN and PF number fields to employees table
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE employees ADD COLUMN uan_number VARCHAR(20);
ALTER TABLE employees ADD COLUMN pf_number VARCHAR(30);
