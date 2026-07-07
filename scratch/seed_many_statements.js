const { query } = require('../src/database/connection');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const clients = [
  { name: 'Diamond Skyline', gst: '27AADCB2230M1Z2' },
  { name: 'Tech Innovators', gst: '27AABCU9603R1ZM' },
  { name: 'Global Logistics', gst: '27XXXZZ1234A1Z5' },
  { name: 'Apex Manufacturing', gst: '27YYYYY9876B1Z2' }
];

const vendors = [
  { name: 'Elite Uniforms', category: 'uniforms' },
  { name: 'SafeTech Equipments', category: 'equipment' },
  { name: 'Office Depot', category: 'office_supplies' },
  { name: 'Quick Repairs', category: 'maintenance' }
];

const employees = [
  { name: 'Rahul Kumar', id: 'EMP001' },
  { name: 'Sanjay Singh', id: 'EMP002' },
  { name: 'Amit Patel', id: 'EMP003' },
  { name: 'Priya Sharma', id: 'EMP004' },
  { name: 'Vikram Das', id: 'EMP005' }
];

async function seedManyStatements() {
  console.log('Seeding lots of statements...');
  let statements = [];
  
  const startDate = new Date(2025, 0, 1);
  const endDate = new Date(2026, 6, 1);

  // Generate 150 invoices + GST + some TDS
  for(let i=1; i<=150; i++) {
    const client = clients[randomInt(0, clients.length - 1)];
    const date = randomDate(startDate, endDate);
    const dateStr = date.toISOString().split('T')[0];
    const baseAmount = randomInt(50, 500) * 1000;
    const cgst = baseAmount * 0.09;
    const sgst = baseAmount * 0.09;
    const total = baseAmount + cgst + sgst;
    
    statements.push({
      domain: 'invoice',
      statement_number: `INV-${date.getFullYear()}-${String(i).padStart(4, '0')}`,
      title: `Invoice for Services - ${date.toLocaleString('default', { month: 'short', year: 'numeric' })}`,
      reference_id: 1000 + i,
      reference_type: 'invoice_created',
      statement_data: JSON.stringify({
        invoice_number: `INV-${date.getFullYear()}-${String(i).padStart(4, '0')}`,
        invoice_date: dateStr,
        client_name: client.name,
        client_gst: client.gst,
        amount_subtotal: baseAmount,
        cgst_amount: cgst,
        sgst_amount: sgst,
        final_amount: total,
        billing_period_start: dateStr,
        billing_period_end: dateStr,
      }),
      total_amount: total,
      tax_amount: cgst + sgst,
      period_from: dateStr,
      period_to: dateStr,
      party_name: client.name,
      party_id: clients.indexOf(client) + 1,
      generated_by: 1,
      generated_at: dateStr + ' 10:00:00'
    });
    
    statements.push({
      domain: 'gst',
      statement_number: `GST-INV-${date.getFullYear()}-${String(i).padStart(4, '0')}`,
      title: `GST Entry: ${client.name}`,
      reference_id: 1000 + i,
      reference_type: 'invoice_gst',
      statement_data: JSON.stringify({
        invoice_number: `INV-${date.getFullYear()}-${String(i).padStart(4, '0')}`,
        client_name: client.name,
        client_gst: client.gst,
        taxable_value: baseAmount,
        cgst: cgst,
        sgst: sgst,
        total: total,
        tax_type: 'cgst_sgst'
      }),
      total_amount: total,
      tax_amount: cgst + sgst,
      period_from: dateStr,
      period_to: dateStr,
      party_name: client.name,
      party_id: clients.indexOf(client) + 1,
      generated_by: 1,
      generated_at: dateStr + ' 10:00:00'
    });
    
    // 30% chance they paid and deducted TDS
    if (Math.random() < 0.3) {
      const tds = baseAmount * 0.02;
      statements.push({
        domain: 'tds',
        statement_number: `TDS-${date.getFullYear()}-${String(i).padStart(4, '0')}`,
        title: `TDS Deducted by ${client.name}`,
        reference_id: 2000 + i,
        reference_type: 'payment_received',
        statement_data: JSON.stringify({
          client_name: client.name,
          invoice_number: `INV-${date.getFullYear()}-${String(i).padStart(4, '0')}`,
          payment_amount: total - tds,
          tds_amount: tds,
          payment_date: dateStr
        }),
        total_amount: total - tds,
        tax_amount: tds,
        period_from: dateStr,
        period_to: dateStr,
        party_name: client.name,
        party_id: clients.indexOf(client) + 1,
        generated_by: 1,
        generated_at: dateStr + ' 14:00:00'
      });
    }
  }

  // Generate 100 Vendor statements
  for(let i=1; i<=100; i++) {
    const vendor = vendors[randomInt(0, vendors.length - 1)];
    const date = randomDate(startDate, endDate);
    const dateStr = date.toISOString().split('T')[0];
    const amount = randomInt(5, 100) * 1000;
    
    statements.push({
      domain: 'vendor',
      statement_number: `VS-${vendor.name.replace(/\s/g, '_')}-${dateStr}`,
      title: `Vendor Expense: ${vendor.name}`,
      reference_id: 3000 + i,
      reference_type: 'expense_approved',
      statement_data: JSON.stringify({
        vendor_name: vendor.name,
        category: vendor.category,
        amount: amount,
        expense_date: dateStr,
        status: 'approved'
      }),
      total_amount: amount,
      tax_amount: 0,
      period_from: dateStr,
      period_to: dateStr,
      party_name: vendor.name,
      party_id: vendors.indexOf(vendor) + 1,
      generated_by: 1,
      generated_at: dateStr + ' 11:00:00'
    });
  }

  // Generate 200 Payroll statements
  for(let i=1; i<=200; i++) {
    const emp = employees[randomInt(0, employees.length - 1)];
    const date = randomDate(startDate, endDate);
    const dateStr = date.toISOString().split('T')[0];
    const gross = randomInt(15, 30) * 1000;
    const pf = gross * 0.12;
    
    statements.push({
      domain: 'payroll',
      statement_number: `PAY-${emp.id}-${dateStr}`,
      title: `Payslip: ${emp.name}`,
      reference_id: 4000 + i,
      reference_type: 'payroll',
      statement_data: JSON.stringify({
        employee_name: emp.name,
        emp_id: emp.id,
        gross_salary: gross,
        net_salary: gross - pf,
        payroll_month: dateStr,
        pf_deduction: pf,
        base_salary: gross * 0.6
      }),
      total_amount: gross - pf,
      tax_amount: 0,
      period_from: dateStr,
      period_to: dateStr,
      party_name: emp.name,
      party_id: employees.indexOf(emp) + 1,
      generated_by: 1,
      generated_at: dateStr + ' 12:00:00'
    });
  }

  for (const s of statements) {
    await query(
      `INSERT INTO saved_statements 
      (domain, statement_number, title, reference_id, reference_type, statement_data, total_amount, tax_amount, period_from, period_to, party_name, party_id, generated_by, generated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        s.domain, s.statement_number, s.title, s.reference_id, s.reference_type, s.statement_data, 
        s.total_amount, s.tax_amount, s.period_from, s.period_to, s.party_name, s.party_id, s.generated_by, s.generated_at
      ]
    );
  }

  console.log(`Successfully inserted ${statements.length} mock statements!`);
}

seedManyStatements().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
