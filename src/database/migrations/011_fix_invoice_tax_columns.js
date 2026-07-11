const logger = require('../../utils/logger.js');
/**
 * Migration 010: Fix missing GST tax columns in existing invoices table.
 * Programmatic migration that adds columns only if they do not exist.
 */
function up(db) {
  // Get all current columns of the invoices table
  const columns = db.prepare("PRAGMA table_info(invoices)").all();
  const existingCols = columns.map(c => c.name);

  const missingColumns = [
    { name: 'tax_type', definition: "VARCHAR(20) DEFAULT 'none'" },
    { name: 'cgst_amount', definition: 'REAL DEFAULT 0' },
    { name: 'sgst_amount', definition: 'REAL DEFAULT 0' },
    { name: 'igst_amount', definition: 'REAL DEFAULT 0' },
    { name: 'is_rcm_applicable', definition: 'INTEGER DEFAULT 0' },
    { name: 'duty_days_worked', definition: 'INT' },
    { name: 'is_ad_hoc', definition: 'INTEGER DEFAULT 0' }
  ];

  for (const col of missingColumns) {
    if (!existingCols.includes(col.name)) {
      logger.info(`     -> Adding missing column "${col.name}" to invoices table...`);
      db.exec(`ALTER TABLE invoices ADD COLUMN ${col.name} ${col.definition};`);
    }
  }

  // Check and fix users table
  const userColumns = db.prepare("PRAGMA table_info(users)").all();
  const existingUserCols = userColumns.map(c => c.name);

  if (!existingUserCols.includes('permissions')) {
    logger.info('     -> Adding missing column "permissions" to users table...');
    db.exec('ALTER TABLE users ADD COLUMN permissions TEXT;');
  }
}

module.exports = { up };
