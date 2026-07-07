process.env.DB_PATH = require('os').homedir() + '\\AppData\\Roaming\\secuirty-agency-software\\database.sqlite';
const { query, db } = require('./src/database/connection');

async function seedEmployees() {
  try {
    const adminRes = await query('SELECT id FROM users LIMIT 1');
    const adminId = adminRes.rows.length > 0 ? adminRes.rows[0].id : null;

    const employees = [
      { full_name: 'Amit Sharma', phone: '9876543210', date_of_joining: '2026-01-15', designation: 'Watchman', is_active: true },
      { full_name: 'Priya Singh', phone: '8765432109', date_of_joining: '2026-02-10', designation: 'Supervisor', is_active: true },
      { full_name: 'Rajesh Kumar', phone: '7654321098', date_of_joining: '2026-03-05', designation: 'Security Guard', is_active: true },
      { full_name: 'Vikram Verma', phone: '6543210987', date_of_joining: '2026-04-20', designation: 'Head Guard', is_active: true },
      { full_name: 'Suresh Patel', phone: '5432109876', date_of_joining: '2026-05-12', designation: 'Watchman', is_active: true }
    ];

    const crypto = require('crypto');
    for (const emp of employees) {
      const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
      const employee_id = `EMP-${randomHex}`;
      
      await query(
        `INSERT INTO employees (employee_id, full_name, phone, date_of_joining, designation, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [employee_id, emp.full_name, emp.phone, emp.date_of_joining, emp.designation, emp.is_active]
      );
    }
    
    console.log('Successfully added 5 employees!');
  } catch (error) {
    console.error('Error seeding employees:', error);
  } finally {
    process.exit(0);
  }
}

seedEmployees();
