const cron = require('node-cron');
const { db } = require('../database/connection');
const logger = require('../utils/logger');

// Generate the next run date based on frequency
const getNextRunDate = (dateStr, frequency) => {
  const date = new Date(dateStr);
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }
  return date.toISOString().split('T')[0];
};

const processRecurringVouchers = () => {
  logger.info('Running recurring vouchers job...');
  
  try {
    db.exec('BEGIN TRANSACTION');

    const recurring = db.prepare(`
      SELECT rv.*, v.*, rv.id as recurring_id
      FROM recurring_vouchers rv
      JOIN vouchers v ON rv.template_voucher_id = v.id
      WHERE rv.is_active = 1 AND rv.next_run_date <= date('now')
    `).all();

    if (recurring.length === 0) {
      db.exec('COMMIT');
      return;
    }

    logger.info(`Found ${recurring.length} recurring vouchers to process.`);

    for (const rv of recurring) {
      // Create new voucher based on template
      // Generate a new voucher_number based on prefix mapping
      const prefixMap = {
        'cash_payment': 'CP', 'cash_receipt': 'CR',
        'bank_payment': 'BP', 'bank_receipt': 'BR',
        'journal': 'JV', 'contra': 'CT',
        'debit_note': 'DN', 'credit_note': 'CN'
      };
      const prefix = prefixMap[rv.voucher_type] || 'JV';
      const year = new Date().getFullYear();
      
      const lastCounter = db.prepare(`
        SELECT last_number FROM voucher_counters 
        WHERE voucher_type = ? AND financial_year = ?
      `).get(rv.voucher_type, year.toString());

      let nextNum = 1;
      if (lastCounter) {
        nextNum = lastCounter.last_number + 1;
        db.prepare('UPDATE voucher_counters SET last_number = ? WHERE id = ?').run(nextNum, lastCounter.id);
      } else {
        db.prepare(`
          INSERT INTO voucher_counters (voucher_type, financial_year, last_number) 
          VALUES (?, ?, ?)
        `).run(rv.voucher_type, year.toString(), 1);
      }

      const voucher_number = `${prefix}/${year}/${nextNum.toString().padStart(4, '0')}`;

      const insertVoucher = db.prepare(`
        INSERT INTO vouchers (
          voucher_number, voucher_type, voucher_date, amount, debit_account_id, credit_account_id,
          party_type, party_id, party_name, reference_type, reference_id, narration,
          status, due_date, category, created_by
        ) VALUES (
          ?, ?, date('now'), ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          'pending_approval', ?, ?, ?
        )
      `);

      insertVoucher.run(
        voucher_number, rv.voucher_type, rv.amount, rv.debit_account_id, rv.credit_account_id,
        rv.party_type, rv.party_id, rv.party_name, rv.reference_type, rv.reference_id, 
        `(Auto-generated via Recurring #${rv.recurring_id}) ` + rv.narration,
        rv.due_date, rv.category, rv.created_by
      );

      // Update the next_run_date
      const nextRunDate = getNextRunDate(rv.next_run_date, rv.frequency);
      db.prepare('UPDATE recurring_vouchers SET next_run_date = ? WHERE id = ?').run(nextRunDate, rv.recurring_id);
    }

    db.exec('COMMIT');
    logger.info(`Successfully processed ${recurring.length} recurring vouchers.`);
  } catch (err) {
    db.exec('ROLLBACK');
    logger.error('Error processing recurring vouchers:', err);
  }
};

const initCronJobs = () => {
  // Run daily at midnight
  cron.schedule('0 0 * * *', () => {
    processRecurringVouchers();
  });
  logger.info('dY"S Cron jobs initialized (Recurring Vouchers)');
};

module.exports = { initCronJobs, processRecurringVouchers };
