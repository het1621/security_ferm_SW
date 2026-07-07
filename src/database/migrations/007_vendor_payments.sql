-- 1. Add amount_paid to expenses
ALTER TABLE expenses ADD COLUMN amount_paid REAL DEFAULT 0;

-- Set amount_paid = amount for expenses that are already marked as 'paid'
UPDATE expenses SET amount_paid = amount WHERE status = 'paid';

-- 2. Create vendor_payments table for tracking partial payments
CREATE TABLE IF NOT EXISTS vendor_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER REFERENCES vendors(id),
    expense_id INTEGER REFERENCES expenses(id),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount REAL NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    reference_number VARCHAR(100),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor ON vendor_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_expense ON vendor_payments(expense_id);
