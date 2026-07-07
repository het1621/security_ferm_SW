const { query } = require('../src/database/connection');

async function seedStatements() {
  console.log('Seeding Statement Archive...');

  const statements = [
    {
      domain: 'invoice',
      statement_number: 'INV-2026-001',
      title: 'Invoice for Security Services - June 2026',
      reference_id: 101,
      reference_type: 'invoice_created',
      statement_data: JSON.stringify({
        invoice_number: 'INV-2026-001',
        invoice_date: '2026-06-01',
        due_date: '2026-06-15',
        status: 'paid',
        tax_type: 'cgst_sgst',
        client_name: 'Diamond Skyline',
        client_address: '123 Business Park, Mumbai',
        client_city: 'Mumbai',
        client_gst: '27AADCB2230M1Z2',
        client_phone: '9876543210',
        billing_period_start: '2026-05-01',
        billing_period_end: '2026-05-31',
        amount_subtotal: 100000,
        cgst_amount: 9000,
        sgst_amount: 9000,
        igst_amount: 0,
        discount_amount: 0,
        final_amount: 118000,
        payment_received: 118000,
        tds_deducted: 0,
        payment_due: 0
      }),
      total_amount: 118000,
      tax_amount: 18000,
      period_from: '2026-05-01',
      period_to: '2026-05-31',
      party_name: 'Diamond Skyline',
      party_id: 1,
      generated_by: 1
    },
    {
      domain: 'gst',
      statement_number: 'GST-INV-2026-001',
      title: 'GST Entry: Diamond Skyline - INV-2026-001',
      reference_id: 101,
      reference_type: 'invoice_gst',
      statement_data: JSON.stringify({
        invoice_number: 'INV-2026-001',
        client_name: 'Diamond Skyline',
        client_gst: '27AADCB2230M1Z2',
        tax_type: 'cgst_sgst',
        is_rcm: false,
        taxable_value: 100000,
        cgst: 9000,
        sgst: 9000,
        igst: 0,
        total: 118000
      }),
      total_amount: 118000,
      tax_amount: 18000,
      period_from: '2026-06-01',
      period_to: '2026-06-01',
      party_name: 'Diamond Skyline',
      party_id: 1,
      generated_by: 1
    },
    {
      domain: 'tds',
      statement_number: 'TDS-PAY-2026-001',
      title: 'TDS Deducted by Diamond Skyline',
      reference_id: 201,
      reference_type: 'payment_received',
      statement_data: JSON.stringify({
        client_name: 'Diamond Skyline',
        client_gst: '27AADCB2230M1Z2',
        invoice_number: 'INV-2026-001',
        payment_date: '2026-06-10',
        payment_amount: 116000,
        tds_amount: 2000,
        payment_method: 'bank_transfer',
        transaction_reference: 'HDFC123456789'
      }),
      total_amount: 116000,
      tax_amount: 2000,
      period_from: '2026-06-10',
      period_to: '2026-06-10',
      party_name: 'Diamond Skyline',
      party_id: 1,
      generated_by: 1
    },
    {
      domain: 'vendor',
      statement_number: 'VS-Elite_Uniforms-2026-06-15',
      title: 'Vendor Expense Approved: Elite Uniforms - Summer Uniforms',
      reference_id: 301,
      reference_type: 'expense_approved',
      statement_data: JSON.stringify({
        vendor_name: 'Elite Uniforms',
        category: 'uniforms',
        description: 'Summer Uniforms for 50 guards',
        expense_date: '2026-06-15',
        status: 'approved',
        amount: 50000,
        amount_paid: 0,
        total_paid: 0
      }),
      total_amount: 50000,
      tax_amount: 0,
      period_from: '2026-06-15',
      period_to: '2026-06-15',
      party_name: 'Elite Uniforms',
      party_id: 2,
      generated_by: 1
    },
    {
      domain: 'vendor',
      statement_number: 'VP-Elite_Uniforms-2026-06-20',
      title: 'Vendor Payment: Elite Uniforms - ₹25,000',
      reference_id: 301,
      reference_type: 'vendor_payment',
      statement_data: JSON.stringify({
        expense_id: 301,
        vendor_name: 'Elite Uniforms',
        description: 'Summer Uniforms for 50 guards',
        category: 'uniforms',
        expense_amount: 50000,
        payment_amount: 25000,
        total_paid: 25000,
        payment_method: 'bank_transfer',
        reference_number: 'SBI987654321',
        payment_date: '2026-06-20',
        status: 'partially_paid'
      }),
      total_amount: 25000,
      tax_amount: 0,
      period_from: '2026-06-20',
      period_to: '2026-06-20',
      party_name: 'Elite Uniforms',
      party_id: 2,
      generated_by: 1
    },
    {
      domain: 'payroll',
      statement_number: 'PAY-EMP001-2026-06',
      title: 'Payslip: Rahul Kumar - Jun 2026',
      reference_id: 401,
      reference_type: 'payroll',
      statement_data: JSON.stringify({
        employee_name: 'Rahul Kumar',
        emp_id: 'EMP001',
        payroll_month: '2026-06-01',
        days_worked: 26,
        days_in_month: 30,
        payment_status: 'pending',
        base_salary: 15000,
        da_amount: 2000,
        hra_amount: 1500,
        other_allowances: 500,
        gross_salary: 19000,
        pf_deduction: 1800,
        esi_deduction: 142.5,
        tax_deduction: 0,
        other_deductions: 0,
        total_deductions: 1942.5,
        net_salary: 17057.5
      }),
      total_amount: 17057.5,
      tax_amount: 0,
      period_from: '2026-06-01',
      period_to: '2026-06-01',
      party_name: 'Rahul Kumar',
      party_id: 3,
      generated_by: 1
    },
    {
      domain: 'payroll',
      statement_number: 'PAY-PAID-EMP001-2026-06',
      title: 'Payslip Paid: Rahul Kumar - Jun 2026',
      reference_id: 401,
      reference_type: 'payroll_paid',
      statement_data: JSON.stringify({
        employee_name: 'Rahul Kumar',
        emp_id: 'EMP001',
        payroll_month: '2026-06-01',
        days_worked: 26,
        days_in_month: 30,
        payment_status: 'paid',
        base_salary: 15000,
        da_amount: 2000,
        hra_amount: 1500,
        other_allowances: 500,
        gross_salary: 19000,
        pf_deduction: 1800,
        esi_deduction: 142.5,
        tax_deduction: 0,
        other_deductions: 0,
        total_deductions: 1942.5,
        net_salary: 17057.5
      }),
      total_amount: 17057.5,
      tax_amount: 0,
      period_from: '2026-06-01',
      period_to: '2026-06-01',
      party_name: 'Rahul Kumar',
      party_id: 3,
      generated_by: 1
    },
    {
      domain: 'invoice',
      statement_number: 'INV-2026-002',
      title: 'Invoice for Maintenance - July 2026',
      reference_id: 102,
      reference_type: 'invoice_created',
      statement_data: JSON.stringify({
        invoice_number: 'INV-2026-002',
        invoice_date: '2026-07-01',
        due_date: '2026-07-15',
        status: 'pending',
        tax_type: 'igst',
        client_name: 'Tech Innovators',
        client_address: 'Phase 2, IT Park, Pune',
        client_city: 'Pune',
        client_gst: '27AABCU9603R1ZM',
        client_phone: '9988776655',
        billing_period_start: '2026-06-01',
        billing_period_end: '2026-06-30',
        amount_subtotal: 50000,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 9000,
        discount_amount: 0,
        final_amount: 59000,
        payment_received: 0,
        tds_deducted: 0,
        payment_due: 59000
      }),
      total_amount: 59000,
      tax_amount: 9000,
      period_from: '2026-06-01',
      period_to: '2026-06-30',
      party_name: 'Tech Innovators',
      party_id: 4,
      generated_by: 1
    },
    {
      domain: 'gst',
      statement_number: 'GST-INV-2026-002',
      title: 'GST Entry: Tech Innovators - INV-2026-002',
      reference_id: 102,
      reference_type: 'invoice_gst',
      statement_data: JSON.stringify({
        invoice_number: 'INV-2026-002',
        client_name: 'Tech Innovators',
        client_gst: '27AABCU9603R1ZM',
        tax_type: 'igst',
        is_rcm: false,
        taxable_value: 50000,
        cgst: 0,
        sgst: 0,
        igst: 9000,
        total: 59000
      }),
      total_amount: 59000,
      tax_amount: 9000,
      period_from: '2026-07-01',
      period_to: '2026-07-01',
      party_name: 'Tech Innovators',
      party_id: 4,
      generated_by: 1
    }
  ];

  for (const s of statements) {
    await query(
      `INSERT INTO saved_statements 
      (domain, statement_number, title, reference_id, reference_type, statement_data, total_amount, tax_amount, period_from, period_to, party_name, party_id, generated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        s.domain, s.statement_number, s.title, s.reference_id, s.reference_type, s.statement_data, 
        s.total_amount, s.tax_amount, s.period_from, s.period_to, s.party_name, s.party_id, s.generated_by
      ]
    );
  }

  console.log(`Successfully inserted ${statements.length} mock statements!`);
}

seedStatements().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
