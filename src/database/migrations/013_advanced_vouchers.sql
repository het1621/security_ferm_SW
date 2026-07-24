-- Migration 013: Advanced Vouchers Features (Budgets, Recurring, Payment Terms)

-- 1. Budgets Table
CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('global', 'client', 'vendor', 'site')),
    entity_id INT,
    budget_category VARCHAR(100),
    amount REAL NOT NULL CHECK (amount > 0),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Recurring Vouchers Table
CREATE TABLE IF NOT EXISTS recurring_vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_voucher_id INT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    next_run_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id)
);

-- 3. Vendors Alter
ALTER TABLE vendors ADD COLUMN payment_terms_days INTEGER DEFAULT 0;

-- 4. Vouchers Alter
ALTER TABLE vouchers ADD COLUMN due_date DATE;
ALTER TABLE vouchers ADD COLUMN category VARCHAR(100);
