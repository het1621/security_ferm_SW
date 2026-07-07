CREATE TABLE IF NOT EXISTS employee_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INT NOT NULL REFERENCES employees(id),
    transaction_date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('addition', 'deduction')),
    category VARCHAR(100) NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    payroll_id INT REFERENCES payroll(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ledger_employee ON employee_ledger(employee_id);
CREATE INDEX IF NOT EXISTS idx_ledger_payroll ON employee_ledger(payroll_id);
