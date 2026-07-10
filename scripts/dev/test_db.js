const { app } = require('electron');
const path = require('path');
const os = require('os');

app.whenReady().then(async () => {
  try {
    // 1. Setup DB path properly so we get the REAL database
    const appData = path.join(os.homedir(), 'AppData', 'Roaming', 'secuirty-agency-software');
    process.env.DB_PATH = path.join(appData, 'database.sqlite');
    console.log("Using DB:", process.env.DB_PATH);
    
    // 2. Load connection
    const { query } = require('./src/database/connection');
    
    // 3. See what invoices actually exist
    const invCount = await query('SELECT COUNT(*) as count FROM invoices');
    console.log(`Total invoices in DB:`, invCount.rows[0].count);

    const invoices = await query('SELECT id, invoice_date, status, final_amount, client_id FROM invoices LIMIT 5');
    console.log('Sample Invoices:', invoices.rows);

    // 4. Run the exact same query as the route
    const from_date = '2026-01-01';
    const to_date = '2026-06-11';
    let conditions = ["i.status != 'cancelled'"];
    let params = [];
    let pc = 1;
    if (from_date) { conditions.push(`i.invoice_date >= $${pc}`); params.push(from_date); pc++; }
    if (to_date) { conditions.push(`i.invoice_date <= $${pc}`); params.push(to_date); pc++; }

    const sql = `SELECT c.id, c.name as client_name, c.city,
      COUNT(i.id) as invoice_count,
      COALESCE(SUM(i.final_amount), 0) as total_billed,
      COALESCE(SUM(i.payment_received), 0) as total_paid,
      COALESCE(SUM(i.payment_due), 0) as total_due,
      ROUND(CASE WHEN SUM(i.final_amount) > 0 THEN SUM(i.payment_received) * 100.0 / SUM(i.final_amount) ELSE 0 END, 2) as collection_rate
     FROM clients c
     LEFT JOIN invoices i ON c.id = i.client_id ${from_date || to_date ? `AND ${conditions.filter(c => c !== "i.status != 'cancelled'").join(' AND ')}` : ''}
     WHERE c.is_active = true
     GROUP BY c.id, c.name, c.city
     ORDER BY total_billed DESC`;
     
    console.log("Executing SQL:", sql);
    console.log("With params:", params);

    const result = await query(sql, params);
    console.log("Query Result:");
    console.log(JSON.stringify(result.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    app.quit();
  }
});
