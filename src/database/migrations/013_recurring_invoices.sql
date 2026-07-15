-- Migration 013: Recurring Invoices System
-- Phase 1 of ERP Implementation Plan
-- Adds recurring invoice templates and auto-generation support

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Create recurring_invoices table
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS recurring_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  
  -- Billing details
  monthly_rate DECIMAL(10,2) NOT NULL,
  tax_type VARCHAR(20) DEFAULT 'cgst_sgst',
  discount_amount DECIMAL(10,2) DEFAULT 0,
  is_rcm_applicable BOOLEAN DEFAULT 0,
  
  -- Frequency & scheduling
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL,
  end_date DATE,
  next_invoice_date DATE NOT NULL,
  last_invoice_date DATE,
  auto_generate BOOLEAN DEFAULT 1,
  
  -- Reminder settings
  reminder_days INTEGER DEFAULT 5,
  
  -- Description & notes
  invoice_description TEXT,
  invoice_notes TEXT,
  
  -- Status: active, paused, expired, cancelled
  status VARCHAR(20) DEFAULT 'active',
  
  -- Audit fields
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Indexes for performance
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_recurring_next_date ON recurring_invoices(next_invoice_date);
CREATE INDEX IF NOT EXISTS idx_recurring_status ON recurring_invoices(status);
CREATE INDEX IF NOT EXISTS idx_recurring_client_id ON recurring_invoices(client_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Add recurring invoice reference to invoices table
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE invoices ADD COLUMN recurring_invoice_id INTEGER REFERENCES recurring_invoices(id);
ALTER TABLE invoices ADD COLUMN is_recurring BOOLEAN DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Recurring invoice generation log (audit trail)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS recurring_invoice_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recurring_invoice_id INTEGER NOT NULL,
  generated_invoice_id INTEGER,
  action VARCHAR(50) NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recurring_invoice_id) REFERENCES recurring_invoices(id),
  FOREIGN KEY (generated_invoice_id) REFERENCES invoices(id)
);
