-- Migration 006: Add Vendors, Receipt Attachments, and Recurring Expenses

-- 1. Create Vendors Table
CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    contact_info TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Update Expenses Table
-- SQLite doesn't support DROP COLUMN easily, so we add new columns and can leave vendor_name for legacy/fallback.
ALTER TABLE expenses ADD COLUMN vendor_id INTEGER REFERENCES vendors(id);
ALTER TABLE expenses ADD COLUMN receipt_url TEXT;

-- Migrate existing string vendor names to the vendors table if they exist
INSERT INTO vendors (name)
SELECT DISTINCT vendor_name FROM expenses WHERE vendor_name IS NOT NULL AND vendor_name != '';

-- Link existing expenses to the newly created vendors
UPDATE expenses 
SET vendor_id = (SELECT id FROM vendors WHERE vendors.name = expenses.vendor_name)
WHERE vendor_name IS NOT NULL AND vendor_name != '';

-- 3. Create Recurring Expenses Table
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount REAL NOT NULL,
    vendor_id INTEGER REFERENCES vendors(id),
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    frequency VARCHAR(50) DEFAULT 'monthly', -- 'monthly', 'weekly', 'yearly'
    next_run_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
