-- Migration 002: Fix expense category CHECK constraint
-- The original schema had a hardcoded CHECK constraint on expenses.category
-- This migration recreates the table without the constraint so dynamic categories work.
-- SQLite doesn't support ALTER TABLE DROP CONSTRAINT, so we must rebuild.

-- Step 1: Rename the old table
ALTER TABLE expenses RENAME TO expenses_old;

-- Step 2: Create new table WITHOUT the CHECK constraint on category
CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'cheque', 'bank_transfer', 'card', 'upi', 'online', 'other')),
    vendor_name VARCHAR(255),
    receipt_number VARCHAR(50),
    invoice_reference VARCHAR(200),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    approver_id INT REFERENCES users(id),
    approval_date TIMESTAMP,
    approval_notes TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    CONSTRAINT positive_expense CHECK (amount > 0)
);

-- Step 3: Copy all data from old table to new table
INSERT INTO expenses (id, expense_date, category, description, amount, payment_method,
    vendor_name, receipt_number, status, approver_id, approval_date, approval_notes,
    notes, created_at, created_by)
SELECT id, expense_date, category, description, amount, payment_method,
    vendor_name, receipt_number, status, approver_id, approval_date, approval_notes,
    notes, created_at, created_by
FROM expenses_old;

-- Step 4: Drop old table
DROP TABLE expenses_old;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
