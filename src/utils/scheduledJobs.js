const cron = require('node-cron');
const { query } = require('../database/connection');

// Auto-generate invoices on the 1st of every month at 00:01 AM
const startScheduledJobs = () => {
  cron.schedule('1 0 1 * *', async () => {
    console.log('⏳ [CRON] Running monthly auto-invoice generation...');
    try {
      // 1. Fetch active clients
      const clientsResult = await query('SELECT * FROM clients WHERE is_active = true');
      const activeClients = clientsResult.rows;

      if (activeClients.length === 0) {
        console.log('⏳ [CRON] No active clients found.');
        return;
      }

      const today = new Date();
      const billingMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const nextMonthEnd = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);
      
      let createdCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const client of activeClients) {
        try {
          const checkExists = await query(
            'SELECT id FROM invoices WHERE client_id = $1 AND billing_period_start >= $2',
            [client.id, billingMonth]
          );

          if (checkExists.rows.length > 0) {
            skippedCount++;
            continue;
          }

          const baseAmount = parseFloat(client.monthly_rate) || 0;
          const taxRate = 18;
          const taxAmount = (baseAmount * taxRate) / 100;
          const finalAmount = baseAmount + taxAmount;

          const invoiceNumber = `INV-${today.getFullYear().toString().slice(-2)}${String(today.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
          
          await query(
            `INSERT INTO invoices 
            (client_id, invoice_number, invoice_date, due_date, billing_period_start, billing_period_end, amount_subtotal, tax_rate, tax_amount, final_amount, payment_due, status, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              client.id,
              invoiceNumber,
              today.toISOString().split('T')[0],
              new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Net 15
              nextMonth.toISOString().split('T')[0],
              nextMonthEnd.toISOString().split('T')[0],
              baseAmount,
              taxRate,
              taxAmount,
              finalAmount,
              finalAmount,
              'draft',
              null // created by system
            ]
          );
          createdCount++;
        } catch (err) {
          console.error(`⏳ [CRON] Error creating invoice for client ${client.id}:`, err);
          errorCount++;
        }
      }

      console.log(`✅ [CRON] Invoice generation completed: ${createdCount} created, ${skippedCount} skipped (already exist), ${errorCount} errors.`);
    } catch (error) {
      console.error('⏳ [CRON] Failed to run monthly invoice generation:', error);
    }
  });
  
  console.log('⏰ Scheduled jobs initialized');
};

module.exports = { startScheduledJobs };
