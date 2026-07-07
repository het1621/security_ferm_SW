const API_BASE = 'http://localhost:5000/api';
let token = '';
let headers = {
  'Content-Type': 'application/json'
};

async function runTest() {
  console.log('--- STARTING PHASE 6 END-TO-END VALIDATION ---');
  let errCount = 0;

  try {
    // 0. Login
    console.log('0. Logging in as admin...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers,
      body: JSON.stringify({ email: 'admin@agency.com', password: 'password123' })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) throw new Error('Login failed');
    token = loginData.token;
    headers['Authorization'] = `Bearer ${token}`;
    console.log('✅ Logged in successfully.');

    // 1. Create a Client
    console.log('1. Creating Client...');
    const clientRes = await fetch(`${API_BASE}/clients`, {
      method: 'POST', headers,
      body: JSON.stringify({
        name: 'Phase6 Test Client',
        email: 'test@phase6.com',
        phone: '9999999999',
        address: '123 Test St',
        city: 'Ahmedabad',
        state: 'Gujarat',
        contract_start_date: '2026-06-01',
        contract_end_date: '2027-05-31',
        billing_rate_per_guard: 25000,
        gst_number: '24AAAAA1234A1Z5'
      })
    });
    const clientData = await clientRes.json();
    if (!clientData.success) throw new Error('Failed to create client: ' + JSON.stringify(clientData));
    const clientId = clientData.data.id;
    console.log(`✅ Client created (ID: ${clientId})`);

    // 2. Create an Employee
    console.log('2. Creating Employee...');
    const empRes = await fetch(`${API_BASE}/employees`, {
      method: 'POST', headers,
      body: JSON.stringify({
        full_name: 'Phase6 Guard',
        email: 'guard@phase6.com',
        phone: '8888888888',
        role: 'guard',
        base_salary: 15000,
        assigned_site_id: clientId,
        joining_date: '2026-06-01',
        aadhaar_number: '123412341234',
        pf_number: 'PF1234567890123'
      })
    });
    const empData = await empRes.json();
    if (!empData.success) throw new Error('Failed to create employee: ' + JSON.stringify(empData));
    const empId = empData.data.id;
    console.log(`✅ Employee created (ID: ${empId})`);

    // 4. Generate Payroll
    console.log('3. Generating Payroll...');
    const payRes = await fetch(`${API_BASE}/payroll/generate`, {
      method: 'POST', headers,
      body: JSON.stringify({
        employee_id: empId,
        payroll_month: '2026-06-01',
        days_worked: 30,
        total_days: 30
      })
    });
    const payData = await payRes.json();
    if (!payData.success) throw new Error('Failed to generate payroll: ' + JSON.stringify(payData));
    console.log(`✅ Payroll generated. Net Salary: ${payData.data.net_salary}`);

    // 5. Generate Invoice
    console.log('4. Generating Invoice...');
    const invRes = await fetch(`${API_BASE}/invoices`, {
      method: 'POST', headers,
      body: JSON.stringify({
        client_id: clientId,
        invoice_date: '2026-06-30',
        due_date: '2026-07-15',
        month: 6,
        year: 2026,
        subtotal: 25000,
        cgst_amount: 2250,
        sgst_amount: 2250,
        igst_amount: 0,
        final_amount: 29500
      })
    });
    const invData = await invRes.json();
    if (!invData.success) throw new Error('Failed to generate invoice: ' + JSON.stringify(invData));
    const invId = invData.data.id;
    console.log(`✅ Invoice generated (ID: ${invId})`);

    // 6. Record Payment
    console.log('5. Recording Invoice Payment...');
    const payRecRes = await fetch(`${API_BASE}/invoices/${invId}/payments`, {
      method: 'POST', headers,
      body: JSON.stringify({
        amount_paid: 29500,
        payment_date: '2026-07-05',
        payment_method: 'bank_transfer',
        tds_deducted: 500,
        reference_number: 'PHASE6-REF'
      })
    });
    const payRecData = await payRecRes.json();
    if (!payRecData.success) throw new Error('Failed to record payment: ' + JSON.stringify(payRecData));
    console.log(`✅ Payment recorded.`);

    // 7. Check P&L
    console.log('6. Validating P&L Account...');
    const plRes = await fetch(`${API_BASE}/pl-account?from_date=2026-06-01&to_date=2026-06-30&compare=false`, {
      headers
    });
    const plData = await plRes.json();
    if (!plData.success) throw new Error('Failed to fetch P&L');
    console.log(`✅ P&L fetched successfully.`);

    // 8. Final Check: Ensure zero new errors logged
    console.log('7. Verifying zero errors in Developer Console...');
    const { query } = require('./src/database/connection');
    const errCheck = await query('SELECT COUNT(*) as c FROM error_logs');
    const c = parseInt(errCheck.rows[0].c);
    if (c > 0) {
      console.error(`❌ FAILURE: ${c} errors were caught during execution!`);
      const allErrs = await query('SELECT * FROM error_logs');
      console.log(allErrs.rows);
      errCount += c;
    } else {
      console.log('✅ Developer Console is completely clean. Zero silent errors.');
    }

  } catch (err) {
    console.error('❌ E2E Test Failed:', err.message);
    errCount++;
  }

  console.log(`\n--- PHASE 6 VALIDATION COMPLETE ---`);
  if (errCount === 0) {
    console.log('🏆 SUCCESS! Software is stable and error-free.');
  } else {
    console.log('⚠️ Failed due to errors.');
  }
}

runTest();
