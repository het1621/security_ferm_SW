/**
 * Test Script 4: Invoice PDF Generation
 * Creates a client, creates an invoice, then fetches the PDF and validates the binary output.
 */
const { loginOnce, authGet, authPost, authDelete, authGetBinary, logResult, printSummary, waitForServer } = require('./helpers');

async function run() {
  console.log('\n📄 Test Suite: Invoice PDF Generation\n');
  const results = [];
  let cookie, clientId, invoiceId;

  await waitForServer();
  cookie = await loginOnce();

  // ── Setup: Create test client ────────────────────────────────────
  try {
    const res = await authPost('/clients', {
      name: 'PDF Test Security Solutions Pvt. Ltd.',
      address: '456 Business Park, SG Highway',
      city: 'Ahmedabad',
      state: 'Gujarat',
      phone: '9988776655',
      email: 'pdftest@example.com',
      gst_number: '24PDFTS1234F1Z5',
      monthly_rate: 150000,
      contract_start_date: '2026-01-01',
    }, cookie);
    clientId = res.data.data?.id;
    const ok = res.data.success === true && clientId;
    results.push({ passed: ok });
    logResult('Create test client', ok, ok ? '' : JSON.stringify(res.data));
  } catch (e) {
    results.push({ passed: false });
    logResult('Create test client', false, e.message);
  }

  // ── Test 1: Create invoice ───────────────────────────────────────
  try {
    const res = await authPost('/invoices', {
      client_id: clientId,
      invoice_date: '2026-06-01',
      billing_period_start: '2026-05-01',
      billing_period_end: '2026-05-31',
      tax_rate: 18,
      discount_amount: 0,
      notes: 'Automation test invoice',
    }, cookie);
    invoiceId = res.data.data?.id;
    const ok = res.data.success === true && invoiceId && res.data.data.invoice_number;
    results.push({ passed: ok });
    logResult(`Invoice created: ${res.data.data?.invoice_number || 'N/A'}`, ok, ok ? '' : JSON.stringify(res.data));
  } catch (e) {
    results.push({ passed: false });
    logResult('Create invoice', false, e.message);
  }

  // ── Test 2: Fetch PDF ────────────────────────────────────────────
  try {
    const res = await authGetBinary(`/invoices/${invoiceId}/pdf`, cookie);
    const contentType = res.headers['content-type'] || '';
    const isPdf = contentType.includes('application/pdf');
    const hasSize = res.buffer.length > 1000;
    const hasHeader = res.buffer.slice(0, 5).toString() === '%PDF-';

    results.push({ passed: isPdf });
    logResult('PDF Content-Type is application/pdf', isPdf, isPdf ? '' : `Got: ${contentType}`);

    results.push({ passed: hasSize });
    logResult(`PDF size > 1000 bytes (got ${res.buffer.length})`, hasSize);

    results.push({ passed: hasHeader });
    logResult('PDF starts with %PDF- magic bytes', hasHeader, hasHeader ? '' : `Got: ${res.buffer.slice(0, 10).toString()}`);
  } catch (e) {
    results.push({ passed: false });
    results.push({ passed: false });
    results.push({ passed: false });
    logResult('Fetch PDF', false, e.message);
  }

  // ── Cleanup ───────────────────────────────────────────────────────
  try {
    if (invoiceId) await authDelete(`/invoices/${invoiceId}`, cookie);
  } catch { /* ignore */ }
  try {
    if (clientId) await authDelete(`/clients/${clientId}`, cookie);
  } catch { /* ignore */ }

  return printSummary('Invoice PDF', results);
}

if (require.main === module) {
  run().then((s) => process.exit(s.allPassed ? 0 : 1)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { run };
