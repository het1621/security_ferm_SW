const { query } = require('../../src/database/connection');

async function seedComprehensiveData() {
  console.log('🌱 Starting comprehensive data seeder...');

  try {
    // 1. Update Clients with all optional fields
    const clients = await query('SELECT id, name FROM clients');
    for (let i = 0; i < clients.rows.length; i++) {
      const c = clients.rows[i];
      const gst = `24AAACA${Math.floor(1000 + Math.random() * 9000)}B1Z${Math.floor(1 + Math.random() * 9)}`;
      const email = `admin@${c.name.toLowerCase().replace(/[^a-z]/g, '')}.com`;
      const postalCode = `38005${i}`;
      const notes = 'Premium enterprise client. Requires monthly MIS reports and dedicated site supervisor.';
      
      await query(
        `UPDATE clients SET 
          email = $1, 
          postal_code = $2, 
          gst_number = $3, 
          billing_cycle = 1, 
          notes = $4 
         WHERE id = $5 AND (email IS NULL OR gst_number IS NULL)`,
        [email, postalCode, gst, notes, c.id]
      );
    }
    console.log(`✅ Updated ${clients.rows.length} clients with full data (GST, Email, Notes, etc.)`);

    // 2. Update Employees with all optional fields
    const employees = await query('SELECT id, full_name FROM employees');
    for (let i = 0; i < employees.rows.length; i++) {
      const e = employees.rows[i];
      
      // Generate realistic fake data
      const aadhar = `${Math.floor(1000 + Math.random() * 9000)}${Math.floor(1000 + Math.random() * 9000)}${Math.floor(1000 + Math.random() * 9000)}`;
      const pan = `ABCDE${Math.floor(1000 + Math.random() * 9000)}F`;
      const bankAcc = `0000${Math.floor(10000000 + Math.random() * 90000000)}`;
      const ifsc = i % 2 === 0 ? 'HDFC0001234' : 'SBIN0005678';
      const bankName = i % 2 === 0 ? 'HDFC Bank' : 'State Bank of India';
      const email = `${e.full_name.toLowerCase().replace(/[^a-z]/g, '')}${i}@gmail.com`;
      const dob = `19${Math.floor(70 + Math.random() * 30)}-0${Math.floor(1 + Math.random() * 9)}-1${Math.floor(0 + Math.random() * 9)}`;
      const address = `Flat ${100 + i}, Shivam Residency, Bodakdev`;
      const emergencyName = `Relative of ${e.full_name.split(' ')[0]}`;
      const emergencyPhone = `9898${Math.floor(100000 + Math.random() * 900000)}`;
      const notes = 'Verified via local police station. Background check cleared.';

      await query(
        `UPDATE employees SET 
          email = $1,
          date_of_birth = $2,
          address = $3,
          aadhar_number = $4,
          pan_number = $5,
          bank_account_number = $6,
          bank_ifsc_code = $7,
          bank_name = $8,
          bank_account_holder_name = $9,
          emergency_contact_name = $10,
          emergency_contact_phone = $11,
          notes = $12
         WHERE id = $13`,
        [
          email, dob, address, aadhar, pan, bankAcc, ifsc, bankName, e.full_name,
          emergencyName, emergencyPhone, notes, e.id
        ]
      );
    }
    console.log(`✅ Updated ${employees.rows.length} employees with full data (Aadhar, PAN, Bank Details, Emergency Contacts, etc.)`);

    console.log('\n🎉 Comprehensive seeding complete! All optional fields are now populated.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedComprehensiveData();
