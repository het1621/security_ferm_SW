const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath, { verbose: console.log });

console.log('Adding performance indexes...');

const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_employees_client_id ON employees(assigned_client_id)',
  'CREATE INDEX IF NOT EXISTS idx_employees_salary_struct ON employees(salary_structure_id)',
  'CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by)',
  'CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by)',
  'CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by)',
  'CREATE INDEX IF NOT EXISTS idx_payroll_created_by ON payroll(created_by)',
  'CREATE INDEX IF NOT EXISTS idx_expenses_approver_id ON expenses(approver_id)',
  'CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by)',
  'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)'
];

for (const q of indexes) {
  try {
    db.exec(q);
  } catch (err) {
    console.error(`Error on index: ${err.message}`);
  }
}

console.log('Indexes added successfully!');
db.close();
