process.env.DB_PATH = require('os').homedir() + '\\AppData\\Roaming\\secuirty-agency-software\\database.sqlite';
const {query} = require('./src/database/connection');

async function test() {
  try {
    // Test basic table counts
    const inv = await query('SELECT COUNT(*) as cnt FROM invoices');
    console.log('Invoices:', inv.rows[0].cnt);

    const emp = await query('SELECT COUNT(*) as cnt FROM employees');
    console.log('Employees:', emp.rows[0].cnt);

    const pay = await query('SELECT COUNT(*) as cnt FROM payroll');
    console.log('Payroll:', pay.rows[0].cnt);

    const exp = await query('SELECT COUNT(*) as cnt FROM expenses');
    console.log('Expenses:', exp.rows[0].cnt);

    // Test the profit-loss query
    const fromDate = '2026-01-01';
    const toDate = '2026-06-10';

    console.log('\n--- Testing profit-loss revenue query ---');
    const revenue = await query(
      `SELECT COALESCE(SUM(payment_received), 0) as total_revenue,
              COALESCE(SUM(final_amount),     0) as total_billed
       FROM invoices
       WHERE status != 'cancelled'
         AND invoice_date >= date($1)
         AND invoice_date <= date($2)`,
      [fromDate, toDate]
    );
    console.log('Revenue result:', JSON.stringify(revenue.rows));

    console.log('\n--- Testing expense-summary query ---');
    const expenses = await query(
      `SELECT COALESCE(SUM(amount), 0) as total_expenses
       FROM expenses
       WHERE status IN ('approved', 'paid')
         AND expense_date >= date($1)
         AND expense_date <= date($2)`,
      [fromDate, toDate]
    );
    console.log('Expenses result:', JSON.stringify(expenses.rows));

    console.log('\n--- Testing payroll query ---');
    const payroll = await query(
      `SELECT COALESCE(SUM(net_salary), 0) as total_payroll
       FROM payroll
       WHERE date(payroll_month, 'start of month') <= date($1)
         AND (date(payroll_month, 'start of month', '+1 month', '-1 day')) >= date($2)`,
      [toDate, fromDate]
    );
    console.log('Payroll result:', JSON.stringify(payroll.rows));

    console.log('\n--- Testing dashboard query (overdue_count) ---');
    const monthStart = new Date().toISOString().slice(0, 7) + '-01';
    const dashboard = await query(
      `SELECT 
        COALESCE(SUM(final_amount), 0) as total_billed,
        COALESCE(SUM(payment_received), 0) as total_collected,
        COUNT(*) as invoice_count,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_count
       FROM invoices WHERE invoice_date >= $1 AND status != 'cancelled'`,
      [monthStart]
    );
    console.log('Dashboard result:', JSON.stringify(dashboard.rows));

    console.log('\nAll tests passed!');
  } catch (error) {
    console.error('TEST ERROR:', error.message);
    console.error('Stack:', error.stack);
  }
  process.exit(0);
}

test();
