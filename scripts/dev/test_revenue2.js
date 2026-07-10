const { app } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const userDataPath = app.getPath('userData');
  process.env.DB_PATH = path.join(userDataPath, 'database.sqlite');
  console.log("Using DB:", process.env.DB_PATH);
  
  const { query } = require('./src/database/connection');
  const from_date = '2026-01-01';
  const to_date = '2026-06-11';
  let conditions = ["i.status != 'cancelled'"];
  let params = [from_date, to_date];

  const result = await query(
    `SELECT c.id, c.name as client_name, c.city,
      COUNT(i.id) as invoice_count,
      COALESCE(SUM(i.final_amount), 0) as total_billed,
      COALESCE(SUM(i.payment_received), 0) as total_paid,
      COALESCE(SUM(i.payment_due), 0) as total_due,
      ROUND(CASE WHEN SUM(i.final_amount) > 0 THEN SUM(i.payment_received) * 100.0 / SUM(i.final_amount) ELSE 0 END, 2) as collection_rate
     FROM clients c
     LEFT JOIN invoices i ON c.id = i.client_id AND i.invoice_date >= $1 AND i.invoice_date <= $2
     WHERE c.is_active = true
     GROUP BY c.id, c.name, c.city
     ORDER BY total_billed DESC`,
    params
  );
  console.log(JSON.stringify(result.rows, null, 2));
  app.quit();
});
