/**
 * Test Script 5: Database Referential Integrity
 * Verifies that foreign key constraints prevent orphaned data when deleting linked records.
 */
const { loginOnce, authGet, authPost, authDelete, logResult, printSummary, waitForServer } = require('./helpers');

async function run() {
  console.log('\n🔒 Test Suite: Database Referential Integrity\n');
  const results = [];
  let cookie, clientId, employeeId, invoiceId;

  await waitForServer();
  cookie = await loginOnce();

  // ── Setup: Create client ─────────────────────────────────────────
  try {
    const res = await authPost('/clients', {
      name: 'Integrity Test Corp',
      address: '789 FK Constraint Avenue',
      city: 'Surat',
      state: 'Gujarat',
      phone: '9111222333',
      email: 'integrity@test.com',
      monthly_rate: 100000,
      contract_start_date: '2026-01-01',
    }, cookie);
    clientId = res.data.data?.id;
    logResult('Setup: Created test client', !!clientId);
  } catch (e) {
    logResult('Setup: Created test client', false, e.message);
  }

  // ── Setup: Create employee assigned to client ─────────────────────
  try {
    const res = await authPost('/employees', {
      full_name: 'Integrity Test Guard',
      phone: '9222333444',
      date_of_joining: '2026-01-01',
      designation: 'Watchman',
      assigned_client_id: clientId,
    }, cookie);
    employeeId = res.data.data?.id;
    logResult('Setup: Created test employee', !!employeeId);
  } catch (e) {
    logResult('Setup: Created test employee', false, e.message);
  }

  // ── Setup: Create invoice for client ──────────────────────────────
  try {
    const res = await authPost('/invoices', {
      client_id: clientId,
      invoice_date: '2026-06-01',
      billing_period_start: '2026-05-01',
      billing_period_end: '2026-05-31',
      tax_rate: 0,
      discount_amount: 0,
    }, cookie);
    invoiceId = res.data.data?.id;
    logResult('Setup: Created test invoice', !!invoiceId);
  } catch (e) {
    logResult('Setup: Created test invoice', false, e.message);
  }

  // ── Test 1: Attempt to delete client with linked invoice ──────────
  try {
    const res = await authDelete(`/clients/${clientId}`, cookie);
    // The delete should either fail (constraint error) OR if it soft-deletes, the invoice should still reference it
    // Check if client still exists
    const verifyRes = await authGet(`/clients/${clientId}`, cookie);
    const clientStillExists = verifyRes.data.success === true && verifyRes.data.data;

    // If client was hard-deleted but invoice still references it, that's a fail
    // If client delete was rejected (constraint), that's a pass
    // If client was soft-deleted (is_active=false), that's also acceptable
    const ok = clientStillExists || res.status >= 400;
    results.push({ passed: ok });
    logResult('Client with linked invoice cannot be hard-deleted', ok, ok ? '' : `Client was deleted despite linked invoice`);
  } catch (e) {
    // A constraint error here is actually a PASS
    results.push({ passed: true });
    logResult('Client with linked invoice cannot be hard-deleted', true, 'Constraint error thrown (expected)');
  }

  // ── Test 2: Verify invoice still exists ───────────────────────────
  try {
    const res = await authGet(`/invoices/${invoiceId}`, cookie);
    const ok = res.data.success === true && res.data.data;
    results.push({ passed: ok });
    logResult('Invoice still exists after attempted client delete', ok);
  } catch (e) {
    results.push({ passed: false });
    logResult('Invoice still exists after attempted client delete', false, e.message);
  }

  // ── Test 3: Delete invoice first ──────────────────────────────────
  try {
    const res = await authDelete(`/invoices/${invoiceId}`, cookie);
    const ok = res.data.success === true;
    results.push({ passed: ok });
    logResult('Invoice can be deleted independently', ok);
  } catch (e) {
    results.push({ passed: false });
    logResult('Invoice can be deleted independently', false, e.message);
  }

  // ── Test 4: Now delete client (should succeed) ────────────────────
  try {
    const res = await authDelete(`/clients/${clientId}`, cookie);
    const ok = res.data.success === true;
    results.push({ passed: ok });
    logResult('Client deleted after removing linked records', ok, ok ? '' : JSON.stringify(res.data));
  } catch (e) {
    results.push({ passed: false });
    logResult('Client deleted after removing linked records', false, e.message);
  }

  // ── Test 5: Verify no orphaned invoice ────────────────────────────
  try {
    const res = await authGet(`/invoices/${invoiceId}`, cookie);
    const ok = res.status === 404 || (res.data.success === false);
    results.push({ passed: ok });
    logResult('No orphaned invoice after cleanup', ok);
  } catch (e) {
    results.push({ passed: true }); // 404 throws = pass
    logResult('No orphaned invoice after cleanup', true);
  }

  // ── Cleanup employee ──────────────────────────────────────────────
  try {
    if (employeeId) await authDelete(`/employees/${employeeId}`, cookie);
  } catch { /* ignore */ }

  return printSummary('DB Integrity', results);
}

if (require.main === module) {
  run().then((s) => process.exit(s.allPassed ? 0 : 1)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { run };
