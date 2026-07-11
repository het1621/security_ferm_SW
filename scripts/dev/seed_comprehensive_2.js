const { query } = require('../../src/database/connection');

async function seedRemainingData() {
  console.log('🌱 Starting Phase 2 comprehensive data seeder (Taxes, Payroll, Invoices, etc.)...');

  try {
    // 1. Update Salary Structures
    const structures = await query('SELECT id FROM salary_structures');
    for (let i = 0; i < structures.rows.length; i++) {
      await query(
        `UPDATE salary_structures SET 
          dearness_allowance = base_salary * 0.1, 
          house_rent_allowance = base_salary * 0.15, 
          other_allowances = 500, 
          esi_applicable = 1, 
          income_tax_applicable = 1
         WHERE id = $1`,
        [structures.rows[i].id]
      );
    }
    console.log(`✅ Updated ${structures.rows.length} salary structures with DA, HRA, ESI, Tax settings.`);

    // 2. Update Invoices
    const invoices = await query('SELECT id, amount_subtotal FROM invoices');
    for (let i = 0; i < invoices.rows.length; i++) {
      const inv = invoices.rows[i];
      const cgst = inv.amount_subtotal * 0.09;
      const sgst = inv.amount_subtotal * 0.09;
      const tax = cgst + sgst;
      const discount = 1000;
      const finalAmt = inv.amount_subtotal + tax - discount;
      
      await query(
        `UPDATE invoices SET 
          tax_rate = 18, 
          tax_amount = $1, 
          discount_amount = $2, 
          final_amount = $3,
          tax_type = 'cgst_sgst',
          cgst_amount = $4,
          sgst_amount = $5,
          is_rcm_applicable = 0,
          duty_days_worked = 30,
          notes = 'Monthly recurring security services including GST.'
         WHERE id = $6`,
        [tax, discount, finalAmt, cgst, sgst, inv.id]
      );
    }
    console.log(`✅ Updated ${invoices.rows.length} invoices with detailed taxes, discounts, and CGST/SGST.`);

    // 3. Update Payroll
    const payrolls = await query('SELECT id, base_salary FROM payroll');
    for (let i = 0; i < payrolls.rows.length; i++) {
      const p = payrolls.rows[i];
      const da = p.base_salary * 0.1;
      const hra = p.base_salary * 0.15;
      const other = 500;
      const gross = p.base_salary + da + hra + other;
      
      const pf = gross * 0.12;
      const esi = gross * 0.0075;
      const tax = 200; // Professional tax
      const totalDed = pf + esi + tax;
      const net = gross - totalDed;

      await query(
        `UPDATE payroll SET 
          da_amount = $1,
          hra_amount = $2,
          other_allowances = $3,
          gross_salary = $4,
          pf_deduction = $5,
          esi_deduction = $6,
          tax_deduction = $7,
          total_deductions = $8,
          net_salary = $9,
          payment_method = 'bank_transfer',
          transaction_reference = 'NEFT-${Math.floor(1000000 + Math.random() * 9000000)}',
          notes = 'Salary processed with PF/ESI and DA/HRA allowances.'
         WHERE id = $10`,
        [da, hra, other, gross, pf, esi, tax, totalDed, net, p.id]
      );
    }
    console.log(`✅ Updated ${payrolls.rows.length} payroll records with full allowances and tax deductions.`);

    // 4. Update Expenses
    const expenses = await query('SELECT id FROM expenses');
    for (let i = 0; i < expenses.rows.length; i++) {
      await query(
        `UPDATE expenses SET 
          vendor_name = 'Standard Supplies Pvt Ltd',
          receipt_number = 'REC-${Math.floor(10000 + Math.random() * 90000)}',
          approval_notes = 'Approved by Director. Verified with actual receipt.',
          notes = 'Includes 18% GST. Paid directly via Corporate Credit Card.'
         WHERE id = $1`,
        [expenses.rows[i].id]
      );
    }
    console.log(`✅ Updated ${expenses.rows.length} expense records with vendors, receipts, and approval notes.`);

    // 5. Update Payments
    const payments = await query('SELECT id FROM payments');
    for (let i = 0; i < payments.rows.length; i++) {
      await query(
        `UPDATE payments SET 
          transaction_reference = 'IMPS-${Math.floor(10000000 + Math.random() * 90000000)}',
          notes = 'Payment received and reconciled with bank statement.'
         WHERE id = $1`,
        [payments.rows[i].id]
      );
    }
    console.log(`✅ Updated ${payments.rows.length} payment records with transaction references and notes.`);

    // 6. Update Attendance
    const attendance = await query("SELECT id FROM attendance WHERE status = 'present'");
    for (let i = 0; i < attendance.rows.length; i++) {
      await query(
        `UPDATE attendance SET 
          check_in_time = '08:00',
          check_out_time = '20:00',
          hours_worked = 12,
          notes = '12-hour shift duty. Guard reported on time.'
         WHERE id = $1`,
        [attendance.rows[i].id]
      );
    }
    console.log(`✅ Updated ${attendance.rows.length} attendance records with check-in/out times and notes.`);

    console.log('\n🎉 Phase 2 Comprehensive seeding complete! All tax, allowance, deduction, and metadata fields are fully populated.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedRemainingData();
