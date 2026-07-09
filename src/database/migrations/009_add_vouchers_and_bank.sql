-- ============================================================
-- Migration 009: Add Vouchers, Bank Accounts & related tables
-- ============================================================

-- 1. BANK ACCOUNTS — Track multiple bank/cash accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('bank', 'cash')),
    account_number VARCHAR(50),
    bank_name VARCHAR(255),
    ifsc_code VARCHAR(20),
    branch VARCHAR(255),
    opening_balance REAL DEFAULT 0,
    opening_balance_date DATE,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id)
);

-- 2. VOUCHER COUNTERS — Auto-numbering per type per financial year
CREATE TABLE IF NOT EXISTS voucher_counters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voucher_type VARCHAR(20) NOT NULL,
    financial_year VARCHAR(10) NOT NULL,
    last_number INTEGER DEFAULT 0,
    UNIQUE(voucher_type, financial_year)
);

-- 3. VOUCHERS — Universal transaction recording
CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voucher_number VARCHAR(50) UNIQUE NOT NULL,
    voucher_type VARCHAR(20) NOT NULL CHECK (voucher_type IN (
        'cash_payment', 'cash_receipt',
        'bank_payment', 'bank_receipt',
        'journal', 'contra',
        'debit_note', 'credit_note'
    )),
    voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Financial
    amount REAL NOT NULL CHECK (amount > 0),

    -- Accounts
    debit_account_id INT REFERENCES bank_accounts(id),
    credit_account_id INT REFERENCES bank_accounts(id),

    -- Party reference (optional)
    party_type VARCHAR(20) CHECK (party_type IN ('client', 'employee', 'vendor', 'other', NULL)),
    party_id INT,
    party_name VARCHAR(255),

    -- Link to existing records (optional)
    reference_type VARCHAR(30) CHECK (reference_type IN ('invoice', 'expense', 'payroll', 'none', NULL)),
    reference_id INT,

    -- Details
    narration TEXT,
    cheque_number VARCHAR(50),
    cheque_date DATE,
    transaction_ref VARCHAR(100),

    -- Status & approval
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'posted', 'cancelled')),
    approved_by INT REFERENCES users(id),
    approval_date TIMESTAMP,
    cancelled_by INT REFERENCES users(id),
    cancellation_date TIMESTAMP,
    cancellation_reason TEXT,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_vouchers_type ON vouchers(voucher_type);
CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(voucher_date);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_party ON vouchers(party_type, party_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_debit_account ON vouchers(debit_account_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_credit_account ON vouchers(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_reference ON vouchers(reference_type, reference_id);

-- 4. BANK RECONCILIATION entries
CREATE TABLE IF NOT EXISTS bank_reconciliation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_account_id INT NOT NULL REFERENCES bank_accounts(id),
    voucher_id INT REFERENCES vouchers(id),
    reconciliation_date DATE,
    bank_statement_date DATE,
    bank_statement_ref VARCHAR(100),
    bank_amount REAL,
    is_reconciled INTEGER DEFAULT 0,
    reconciled_at TIMESTAMP,
    reconciled_by INT REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bank_recon_account ON bank_reconciliation(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_recon_voucher ON bank_reconciliation(voucher_id);
CREATE INDEX IF NOT EXISTS idx_bank_recon_status ON bank_reconciliation(is_reconciled);

-- 5. Insert default Cash-in-Hand account
INSERT OR IGNORE INTO bank_accounts (account_name, account_type, opening_balance, opening_balance_date)
VALUES ('Cash-in-Hand', 'cash', 0, date('now'));
