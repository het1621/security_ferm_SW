-- Migration 017: GST Compliance & GSTR Reports
-- Phase 5 of ERP Implementation Plan
-- Adds HSN/SAC codes, GST configuration, GSTR filing records,
-- and invoice-level GST mapping for return generation.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. GST Configuration (company-level settings)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS gst_configurations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gstin VARCHAR(15) NOT NULL,
  legal_name VARCHAR(200) NOT NULL,
  trade_name VARCHAR(200),
  state_code VARCHAR(2) NOT NULL,
  state_name VARCHAR(50) NOT NULL,
  registration_type VARCHAR(20) DEFAULT 'regular' CHECK (
    registration_type IN ('regular', 'composition', 'unregistered')
  ),
  default_tax_rate DECIMAL(4,2) DEFAULT 18.00,
  financial_year VARCHAR(9) NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. HSN/SAC Codes Master
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS hsn_sac_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code VARCHAR(8) NOT NULL,
  type VARCHAR(3) NOT NULL CHECK (type IN ('HSN', 'SAC')),
  description VARCHAR(200) NOT NULL,
  gst_rate DECIMAL(4,2) NOT NULL DEFAULT 18.00,
  cgst_rate DECIMAL(4,2),
  sgst_rate DECIMAL(4,2),
  igst_rate DECIMAL(4,2),
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Invoice GST Mapping (line-level GST detail per invoice)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invoice_gst_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  hsn_sac_code VARCHAR(8),
  hsn_sac_id INTEGER,
  description VARCHAR(200),
  
  taxable_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  gst_rate DECIMAL(4,2) DEFAULT 18.00,
  cgst_rate DECIMAL(4,2) DEFAULT 9.00,
  sgst_rate DECIMAL(4,2) DEFAULT 9.00,
  igst_rate DECIMAL(4,2) DEFAULT 0,
  cgst_amount DECIMAL(10,2) DEFAULT 0,
  sgst_amount DECIMAL(10,2) DEFAULT 0,
  igst_amount DECIMAL(10,2) DEFAULT 0,
  total_gst DECIMAL(10,2) DEFAULT 0,
  
  supply_type VARCHAR(10) DEFAULT 'B2B' CHECK (supply_type IN ('B2B', 'B2C', 'B2CS', 'B2CL', 'EXPORT')),
  place_of_supply VARCHAR(2),
  is_reverse_charge BOOLEAN DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (hsn_sac_id) REFERENCES hsn_sac_codes(id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. GSTR Filings (filing records & status)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS gstr_filings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_type VARCHAR(10) NOT NULL CHECK (return_type IN ('GSTR1', 'GSTR3B', 'GSTR9')),
  return_period VARCHAR(7) NOT NULL,
  financial_year VARCHAR(9) NOT NULL,
  gstin VARCHAR(15) NOT NULL,
  
  -- Summary
  total_taxable_value DECIMAL(14,2) DEFAULT 0,
  total_cgst DECIMAL(12,2) DEFAULT 0,
  total_sgst DECIMAL(12,2) DEFAULT 0,
  total_igst DECIMAL(12,2) DEFAULT 0,
  total_cess DECIMAL(12,2) DEFAULT 0,
  total_invoices INTEGER DEFAULT 0,
  
  -- Filing status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'filed', 'accepted')),
  json_data TEXT,
  filed_date DATE,
  arn_number VARCHAR(30),
  
  generated_by INTEGER,
  generated_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (generated_by) REFERENCES users(id),
  UNIQUE(return_type, return_period, gstin)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Indexes
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_inv_gst_invoice ON invoice_gst_details(invoice_id);
CREATE INDEX IF NOT EXISTS idx_inv_gst_supply ON invoice_gst_details(supply_type);
CREATE INDEX IF NOT EXISTS idx_gstr_period ON gstr_filings(return_type, return_period);
CREATE INDEX IF NOT EXISTS idx_hsn_code ON hsn_sac_codes(code);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Add SAC code and place_of_supply to invoices
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE invoices ADD COLUMN sac_code VARCHAR(8) DEFAULT '998915';
ALTER TABLE invoices ADD COLUMN place_of_supply VARCHAR(2);
ALTER TABLE invoices ADD COLUMN supply_type VARCHAR(10) DEFAULT 'B2B';
ALTER TABLE invoices ADD COLUMN buyer_gstin VARCHAR(15);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Add GSTIN to clients
-- ═══════════════════════════════════════════════════════════════════════════
-- clients already has gst_number, add state_code
ALTER TABLE clients ADD COLUMN state_code VARCHAR(2);

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Seed Security Industry SAC Codes
-- ═══════════════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO hsn_sac_codes (code, type, description, gst_rate, cgst_rate, sgst_rate, igst_rate) VALUES
  ('998915', 'SAC', 'Security Guard Services', 18.00, 9.00, 9.00, 18.00),
  ('998916', 'SAC', 'Investigation and Detective Services', 18.00, 9.00, 9.00, 18.00),
  ('998917', 'SAC', 'Security Consultancy Services', 18.00, 9.00, 9.00, 18.00),
  ('998519', 'SAC', 'Armed Security / Cash-in-Transit', 18.00, 9.00, 9.00, 18.00),
  ('998912', 'SAC', 'Guard Dog Services', 18.00, 9.00, 9.00, 18.00),
  ('999711', 'SAC', 'Manpower Supply Services', 18.00, 9.00, 9.00, 18.00),
  ('998914', 'SAC', 'Electronic Surveillance / CCTV Services', 18.00, 9.00, 9.00, 18.00),
  ('997212', 'SAC', 'Cleaning Services', 18.00, 9.00, 9.00, 18.00);
