const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log('Running Phase 2 Database Migrations...');

try {
  // 1. Add permissions to users
  db.exec('ALTER TABLE users ADD COLUMN permissions TEXT;');
  console.log('Added permissions to users table.');
} catch (e) {
  if (!e.message.includes('duplicate column name')) console.error(e);
}

try {
  // 2. Add columns to invoices
  db.exec("ALTER TABLE invoices ADD COLUMN tax_type VARCHAR(20) DEFAULT 'none';");
  db.exec('ALTER TABLE invoices ADD COLUMN cgst_amount REAL DEFAULT 0;');
  db.exec('ALTER TABLE invoices ADD COLUMN sgst_amount REAL DEFAULT 0;');
  db.exec('ALTER TABLE invoices ADD COLUMN igst_amount REAL DEFAULT 0;');
  db.exec('ALTER TABLE invoices ADD COLUMN is_rcm_applicable INTEGER DEFAULT 0;');
  db.exec('ALTER TABLE invoices ADD COLUMN duty_days_worked INT;');
  db.exec('ALTER TABLE invoices ADD COLUMN is_ad_hoc INTEGER DEFAULT 0;');
  console.log('Added tax and ad-hoc columns to invoices table.');
} catch (e) {
  if (!e.message.includes('duplicate column name')) console.error(e);
}

try {
  // 3. Create expense_categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) UNIQUE NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Seed initial categories if empty
  const count = db.prepare('SELECT count(*) as count FROM expense_categories').get().count;
  if (count === 0) {
    const insert = db.prepare('INSERT INTO expense_categories (name) VALUES (?)');
    ['Office Supplies', 'Travel', 'Meals', 'Equipment Maintenance', 'Uniforms', 'Miscellaneous'].forEach(cat => {
      insert.run(cat);
    });
    console.log('Seeded default expense categories.');
  }
} catch (e) {
  console.error(e);
}

console.log('Migration completed successfully.');
db.close();
