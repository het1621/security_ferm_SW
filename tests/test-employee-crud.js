/**
 * Test Script 2: Employee CRUD
 * Tests create → read → update → verify update → delete → verify deleted.
 */
const { loginOnce, authGet, authPost, authPut, authDelete, logResult, printSummary, waitForServer } = require('./helpers');

async function run() {
  console.log('\n👤 Test Suite: Employee CRUD\n');
  const results = [];
  let cookie, employeeId;

  await waitForServer();
  cookie = await loginOnce();

  // ── Test 1: Create employee ──────────────────────────────────────
  try {
    const res = await authPost('/employees', {
      full_name: 'Rajesh Kumar Sharma',
      phone: '9876543210',
      email: 'rajesh.automation.test@example.com',
      date_of_joining: '2026-01-15',
      designation: 'Security Guard',
      aadhar_number: '123456789012',
      pan_number: 'ABCDE1234F',
      bank_account_number: '1234567890123456',
      bank_ifsc_code: 'SBIN0001234',
      bank_name: 'State Bank of India',
      address: '123 Test Colony, Navrangpura',
      city: 'Ahmedabad',
    }, cookie);

    const ok = res.data.success === true && res.data.data && res.data.data.id;
    employeeId = res.data.data?.id;
    results.push({ passed: ok });
    logResult('POST /employees creates employee', ok, ok ? '' : JSON.stringify(res.data));
  } catch (e) {
    results.push({ passed: false });
    logResult('POST /employees creates employee', false, e.message);
  }

  // ── Test 2: Read employee ────────────────────────────────────────
  try {
    const res = await authGet(`/employees/${employeeId}`, cookie);
    const ok = res.data.success === true && res.data.data.full_name === 'Rajesh Kumar Sharma';
    results.push({ passed: ok });
    logResult('GET /employees/:id returns correct data', ok, ok ? '' : JSON.stringify(res.data));
  } catch (e) {
    results.push({ passed: false });
    logResult('GET /employees/:id returns correct data', false, e.message);
  }

  // ── Test 3: Update employee ──────────────────────────────────────
  try {
    const res = await authPut(`/employees/${employeeId}`, {
      full_name: 'Rajesh Kumar Sharma',
      phone: '9876543210',
      date_of_joining: '2026-01-15',
      designation: 'Senior Security Guard',
    }, cookie);
    const ok = res.data.success === true;
    results.push({ passed: ok });
    logResult('PUT /employees/:id updates designation', ok, ok ? '' : JSON.stringify(res.data));
  } catch (e) {
    results.push({ passed: false });
    logResult('PUT /employees/:id updates designation', false, e.message);
  }

  // ── Test 4: Verify update ────────────────────────────────────────
  try {
    const res = await authGet(`/employees/${employeeId}`, cookie);
    const ok = res.data.data.designation === 'Senior Security Guard';
    results.push({ passed: ok });
    logResult('Re-fetch confirms updated designation', ok, ok ? '' : `Got: ${res.data.data.designation}`);
  } catch (e) {
    results.push({ passed: false });
    logResult('Re-fetch confirms updated designation', false, e.message);
  }

  // ── Test 5: Delete (soft-deactivate) employee ────────────────────
  try {
    const res = await authDelete(`/employees/${employeeId}`, cookie);
    const ok = res.data.success === true;
    results.push({ passed: ok });
    logResult('DELETE /employees/:id deactivates employee', ok, ok ? '' : JSON.stringify(res.data));
  } catch (e) {
    results.push({ passed: false });
    logResult('DELETE /employees/:id deactivates employee', false, e.message);
  }

  // ── Test 6: Verify deactivation ──────────────────────────────────
  try {
    const res = await authGet(`/employees/${employeeId}`, cookie);
    // Employee is soft-deleted (is_active = false), but record still exists
    const ok = res.data.success === true && (res.data.data.is_active === false || res.data.data.is_active === 0);
    results.push({ passed: ok });
    logResult('Employee is_active = false after delete', ok, ok ? '' : `is_active=${res.data.data?.is_active}`);
  } catch (e) {
    results.push({ passed: false });
    logResult('Employee is_active = false after delete', false, e.message);
  }

  return printSummary('Employee CRUD', results);
}

if (require.main === module) {
  run().then((s) => process.exit(s.allPassed ? 0 : 1)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { run };
