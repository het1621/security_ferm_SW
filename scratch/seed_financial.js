const Database = require('better-sqlite3');
const db = new Database('database.sqlite');

try {
  db.exec('BEGIN TRANSACTION');

  // Insert Bank Accounts
  const stmtBank = db.prepare(`
    INSERT INTO bank_accounts (account_name, account_type, account_number, bank_name, opening_balance, is_active, created_by)
    VALUES (?, ?, ?, ?, ?, 1, 2)
  `);
  
  // Checking if we already have them to avoid duplicates (just a simple check)
  const existingBanks = db.prepare("SELECT count(*) as cnt FROM bank_accounts WHERE account_type = 'bank'").get();
  if (existingBanks.cnt === 0) {
    stmtBank.run('HDFC Current A/c', 'bank', '0000123456789', 'HDFC Bank', 50000.00);
    stmtBank.run('SBI Savings A/c', 'bank', '9876543210000', 'State Bank of India', 120000.00);
  }

  // Get the bank IDs
  const hdfcIdRow = db.prepare("SELECT id FROM bank_accounts WHERE bank_name = 'HDFC Bank' LIMIT 1").get();
  const sbiIdRow = db.prepare("SELECT id FROM bank_accounts WHERE bank_name = 'State Bank of India' LIMIT 1").get();
  const cashIdRow = db.prepare("SELECT id FROM bank_accounts WHERE account_type = 'cash' LIMIT 1").get();

  const hdfcId = hdfcIdRow ? hdfcIdRow.id : null;
  const sbiId = sbiIdRow ? sbiIdRow.id : null;
  const cashId = cashIdRow ? cashIdRow.id : null;

  // Insert Vouchers
  const stmtVoucher = db.prepare(`
    INSERT INTO vouchers (
      voucher_number, voucher_type, voucher_date, amount, 
      debit_account_id, credit_account_id, party_type, party_name, 
      narration, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2)
  `);

  if (hdfcId && sbiId && cashId) {
    const existingVouchers = db.prepare("SELECT count(*) as cnt FROM vouchers").get();
    if (existingVouchers.cnt === 0) {
      // 1. Bank Receipt (Client Payment)
      const v1 = stmtVoucher.run(
        'BR-2627-001', 'bank_receipt', '2026-07-01', 45000.00,
        hdfcId, null, 'client', 'Shanti Apartment Society',
        'Received payment for June 2026 invoice', 'posted'
      );

      // 2. Bank Payment (Vendor)
      const v2 = stmtVoucher.run(
        'BP-2627-001', 'bank_payment', '2026-07-02', 12500.00,
        null, sbiId, 'vendor', 'Office Supplies Co.',
        'Payment for office chairs', 'posted'
      );

      // 3. Cash Payment (Misc Expense)
      const v3 = stmtVoucher.run(
        'CP-2627-001', 'cash_payment', '2026-07-03', 1500.00,
        null, cashId, 'other', 'Local Stationery',
        'Stationery items', 'posted'
      );

      // 4. Contra (Cash Deposit to HDFC)
      const v4 = stmtVoucher.run(
        'CO-2627-001', 'contra', '2026-07-04', 10000.00,
        hdfcId, cashId, null, null,
        'Cash deposited into HDFC bank', 'posted'
      );

      // 5. Journal (Adjusting Entry)
      const v5 = stmtVoucher.run(
        'JV-2627-001', 'journal', '2026-07-05', 2000.00,
        null, null, 'other', 'Depreciation Account',
        'Depreciation on computers', 'posted'
      );

      // 6. Draft Voucher (Pending)
      const v6 = stmtVoucher.run(
        'BP-2627-002', 'bank_payment', '2026-07-08', 5000.00,
        null, hdfcId, 'vendor', 'Internet Provider',
        'Internet bill July', 'draft'
      );

      // Insert Bank Reconciliation entries
      const stmtRecon = db.prepare(`
        INSERT INTO bank_reconciliation (
          bank_account_id, voucher_id, reconciliation_date, 
          bank_statement_date, bank_amount, is_reconciled, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      // Reconcile BR-2627-001 in HDFC
      stmtRecon.run(
        hdfcId, v1.lastInsertRowid, '2026-07-09',
        '2026-07-05', 45000.00, 1, 'Matched with statement'
      );

      // Reconcile CO-2627-001 in HDFC
      stmtRecon.run(
        hdfcId, v4.lastInsertRowid, '2026-07-09',
        '2026-07-05', 10000.00, 1, 'Matched with statement'
      );

      // Unreconciled for SBI
      stmtRecon.run(
        sbiId, v2.lastInsertRowid, null,
        null, null, 0, 'Pending clearance in bank'
      );
    }
  }

  db.exec('COMMIT');
  console.log('Successfully seeded financial data (Bank Accounts, Vouchers, Bank Reconciliation).');

} catch (err) {
  db.exec('ROLLBACK');
  console.error('Error seeding data:', err);
}
