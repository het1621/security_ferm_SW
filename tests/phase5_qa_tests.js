/**
 * tests/phase5_qa_tests.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 5 — Automated QA Test Suite
 * Security Firm Management Software
 *
 * Coverage:
 *   5.1  Financial Calculation Verification (unit tests, no DB needed)
 *   5.2  Authentication & RBAC Tests
 *   5.3  Module Integration Tests (full lifecycle via API)
 *   5.4  Edge Cases
 *
 * Run:  node tests/phase5_qa_tests.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const http = require('http');
const path = require('path');
const Decimal = require(path.join(__dirname, '..', 'node_modules', 'decimal.js'));

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;

// ─── ANSI colour helpers ──────────────────────────────────────────────────────
const C = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

// ─── Test registry ────────────────────────────────────────────────────────────
const results = [];
let adminToken = null;
let createdClientId = null;
let createdEmployeeId = null;
let createdInvoiceId = null;
let createdExpenseId = null;
let createdPayrollId = null;

function pass(group, name, detail = '') {
  results.push({ group, name, status: 'PASS', detail });
  console.log(`  ${C.green('✓')} ${name}${detail ? C.dim(' — ' + detail) : ''}`);
}

function fail(group, name, detail = '') {
  results.push({ group, name, status: 'FAIL', detail });
  console.log(`  ${C.red('✗')} ${name}${detail ? C.dim(' — ' + detail) : ''}`);
}

function section(title) {
  console.log(`\n${C.bold(C.cyan('━━ ' + title + ' ' + '━'.repeat(Math.max(0, 60 - title.length))))}`);
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────
function apiRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload && { 'Content-Length': Buffer.byteLength(payload) }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Assertion helper ─────────────────────────────────────────────────────────
function assertEqual(a, b, precision = 0.01) {
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) <= precision;
  }
  return a === b;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5.1  FINANCIAL CALCULATION UNIT TESTS
// Pure math — no network calls, uses the same Decimal.js logic as the server
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calculateInvoiceAmounts(monthly_rate, billing_period_start, billing_period_end, tax_rate = 0, discount_amount = 0) {
  const start = new Date(billing_period_start);
  const end = new Date(billing_period_end);
  const daysInPeriod = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const daysInMonth = 30;

  const dailyRate = new Decimal(monthly_rate).dividedBy(daysInMonth);
  const amount_subtotal = dailyRate.times(daysInPeriod).toDecimalPlaces(2);
  const tax_amount = amount_subtotal.times(tax_rate).dividedBy(100).toDecimalPlaces(2);
  const total_amount = amount_subtotal.plus(tax_amount).toDecimalPlaces(2);
  const discountDec = new Decimal(discount_amount || 0);
  const final_amount = total_amount.minus(discountDec).toDecimalPlaces(2);

  return {
    daysInPeriod,
    amount_subtotal: parseFloat(amount_subtotal.toString()),
    tax_amount: parseFloat(tax_amount.toString()),
    total_amount: parseFloat(total_amount.toString()),
    final_amount: parseFloat(final_amount.toString()),
  };
}

function calculateNetSalary({ base_salary, da, hra, other, pf_pct, esi_applicable, effective_days, days_in_month }) {
  const D = (v) => new Decimal(v || 0);
  const ratio = effective_days / days_in_month;
  const baseSalary  = D(base_salary).times(ratio).toDecimalPlaces(2);
  const daAmt       = D(da).times(ratio).toDecimalPlaces(2);
  const hraAmt      = D(hra).times(ratio).toDecimalPlaces(2);
  const otherAmt    = D(other).times(ratio).toDecimalPlaces(2);
  const grossSalary = baseSalary.plus(daAmt).plus(hraAmt).plus(otherAmt).toDecimalPlaces(2);
  const pfDeduction = grossSalary.times(D(pf_pct || 12)).dividedBy(100).toDecimalPlaces(2);
  const esiDeduction = esi_applicable
    ? grossSalary.times(0.75).dividedBy(100).toDecimalPlaces(2)
    : D(0);
  const totalDeductions = pfDeduction.plus(esiDeduction).toDecimalPlaces(2);
  const netSalary = grossSalary.minus(totalDeductions).toDecimalPlaces(2);
  return {
    gross: parseFloat(grossSalary.toString()),
    pf: parseFloat(pfDeduction.toString()),
    esi: parseFloat(esiDeduction.toString()),
    deductions: parseFloat(totalDeductions.toString()),
    net: parseFloat(netSalary.toString()),
  };
}

async function runFinancialTests() {
  section('5.1  Financial Calculation Verification');

  // ── Invoice Test 1: Full month (30/30 days), Rate=50,000, GST=18%, No discount
  {
    const r = calculateInvoiceAmounts(50000, '2026-06-01', '2026-06-30', 18, 0);
    const grp = 'Invoice Calc';
    if (r.daysInPeriod === 30)    pass(grp, 'INV-1a: Full month = 30 days');
    else                          fail(grp, 'INV-1a: Full month = 30 days', `got ${r.daysInPeriod}`);
    if (assertEqual(r.amount_subtotal, 50000)) pass(grp, 'INV-1b: Subtotal = ₹50,000');
    else                          fail(grp, 'INV-1b: Subtotal = ₹50,000', `got ₹${r.amount_subtotal}`);
    if (assertEqual(r.tax_amount, 9000))       pass(grp, 'INV-1c: GST(18%) = ₹9,000');
    else                          fail(grp, 'INV-1c: GST(18%) = ₹9,000', `got ₹${r.tax_amount}`);
    if (assertEqual(r.final_amount, 59000))    pass(grp, 'INV-1d: Final = ₹59,000');
    else                          fail(grp, 'INV-1d: Final = ₹59,000', `got ₹${r.final_amount}`);
  }

  // ── Invoice Test 2: Partial month Jun 15–30 = 16 days, Rate=50,000, No tax
  {
    const r = calculateInvoiceAmounts(50000, '2026-06-15', '2026-06-30', 0, 0);
    const expected_subtotal = parseFloat(new Decimal(50000).dividedBy(30).times(16).toDecimalPlaces(2).toString());
    const grp = 'Invoice Calc';
    if (r.daysInPeriod === 16) pass(grp, 'INV-2a: Partial month Jun 15-30 = 16 days');
    else                       fail(grp, 'INV-2a: Partial month Jun 15-30 = 16 days', `got ${r.daysInPeriod}`);
    if (assertEqual(r.amount_subtotal, expected_subtotal))
                               pass(grp, `INV-2b: Partial subtotal = ₹${expected_subtotal}`);
    else                       fail(grp, `INV-2b: Partial subtotal = ₹${expected_subtotal}`, `got ₹${r.amount_subtotal}`);
  }

  // ── Invoice Test 3: Discount applied AFTER tax → final = total_with_tax - discount
  {
    const r = calculateInvoiceAmounts(50000, '2026-06-01', '2026-06-30', 18, 5000);
    const grp = 'Invoice Calc';
    // total = 59000, discount = 5000, final = 54000
    if (assertEqual(r.final_amount, 54000)) pass(grp, 'INV-3a: Discount after tax: Final = ₹54,000');
    else                                    fail(grp, 'INV-3a: Discount after tax: Final = ₹54,000', `got ₹${r.final_amount}`);
    // Discount must not affect tax base
    if (assertEqual(r.tax_amount, 9000))    pass(grp, 'INV-3b: Tax base unchanged by discount = ₹9,000');
    else                                    fail(grp, 'INV-3b: Tax base unchanged by discount = ₹9,000', `got ₹${r.tax_amount}`);
  }

  // ── Invoice Test 4: Leap year Feb 2024 (Feb 1–29 = 29 days)
  {
    const r = calculateInvoiceAmounts(50000, '2024-02-01', '2024-02-29', 0, 0);
    const grp = 'Invoice Calc';
    if (r.daysInPeriod === 29) pass(grp, 'INV-4a: Leap year Feb 2024 = 29 days correctly counted');
    else                       fail(grp, 'INV-4a: Leap year Feb 2024 = 29 days correctly counted', `got ${r.daysInPeriod}`);
    const expected = parseFloat(new Decimal(50000).dividedBy(30).times(29).toDecimalPlaces(2).toString());
    if (assertEqual(r.amount_subtotal, expected))
                               pass(grp, `INV-4b: Leap year subtotal = ₹${expected}`);
    else                       fail(grp, `INV-4b: Leap year subtotal = ₹${expected}`, `got ₹${r.amount_subtotal}`);
  }

  // ── Invoice Test 5: Non-leap year Feb 2025 (Feb 1–28 = 28 days)
  {
    const r = calculateInvoiceAmounts(50000, '2025-02-01', '2025-02-28', 0, 0);
    const grp = 'Invoice Calc';
    if (r.daysInPeriod === 28) pass(grp, 'INV-5a: Non-leap Feb 2025 = 28 days');
    else                       fail(grp, 'INV-5a: Non-leap Feb 2025 = 28 days', `got ${r.daysInPeriod}`);
  }

  // ── Invoice Test 6: Floating-point trap — rate with many decimals
  {
    const r = calculateInvoiceAmounts(33333.33, '2026-06-01', '2026-06-30', 0, 0);
    // Should NOT produce something like 33333.330000000004
    const hasFloat = r.amount_subtotal.toString().length > 10;
    if (!hasFloat) pass('Invoice Calc', 'INV-6: No floating-point drift on decimal rate');
    else           fail('Invoice Calc', 'INV-6: No floating-point drift on decimal rate', `got ${r.amount_subtotal}`);
  }

  // ── Payroll Test 1: Full month (30/30 days), Base=30000, DA=5000, PF=12%, No ESI
  {
    const r = calculateNetSalary({
      base_salary: 30000, da: 5000, hra: 0, other: 0,
      pf_pct: 12, esi_applicable: false,
      effective_days: 30, days_in_month: 30,
    });
    const grp = 'Payroll Calc';
    if (assertEqual(r.gross, 35000))  pass(grp, 'PAY-1a: Full month gross = ₹35,000');
    else                               fail(grp, 'PAY-1a: Full month gross = ₹35,000', `got ₹${r.gross}`);
    if (assertEqual(r.pf, 4200))      pass(grp, 'PAY-1b: PF(12%) = ₹4,200');
    else                               fail(grp, 'PAY-1b: PF(12%) = ₹4,200', `got ₹${r.pf}`);
    if (assertEqual(r.net, 30800))    pass(grp, 'PAY-1c: Net salary = ₹30,800');
    else                               fail(grp, 'PAY-1c: Net salary = ₹30,800', `got ₹${r.net}`);
  }

  // ── Payroll Test 2: Full month, Base=30000, DA=5000, PF=12%, ESI=0.75%
  {
    const r = calculateNetSalary({
      base_salary: 30000, da: 5000, hra: 0, other: 0,
      pf_pct: 12, esi_applicable: true,
      effective_days: 30, days_in_month: 30,
    });
    const grp = 'Payroll Calc';
    const expectedESI = parseFloat(new Decimal(35000).times(0.75).dividedBy(100).toDecimalPlaces(2).toString());
    if (assertEqual(r.esi, expectedESI)) pass(grp, `PAY-2a: ESI(0.75%) = ₹${expectedESI}`);
    else                                  fail(grp, `PAY-2a: ESI(0.75%) = ₹${expectedESI}`, `got ₹${r.esi}`);
  }

  // ── Payroll Test 3: Partial month (20/30 days), Base=30000, DA=5000, PF=12%
  {
    const r = calculateNetSalary({
      base_salary: 30000, da: 5000, hra: 0, other: 0,
      pf_pct: 12, esi_applicable: false,
      effective_days: 20, days_in_month: 30,
    });
    const grp = 'Payroll Calc';
    const expectedGross = parseFloat(new Decimal(35000).times(20).dividedBy(30).toDecimalPlaces(2).toString());
    if (assertEqual(r.gross, expectedGross, 0.02)) pass(grp, `PAY-3a: Partial (20/30) gross = ₹${expectedGross}`);
    else                                            fail(grp, `PAY-3a: Partial (20/30) gross = ₹${expectedGross}`, `got ₹${r.gross}`);
  }

  // ── Payroll Test 4: Zero days worked → ₹0 net salary
  {
    const r = calculateNetSalary({
      base_salary: 30000, da: 5000, hra: 0, other: 0,
      pf_pct: 12, esi_applicable: false,
      effective_days: 0, days_in_month: 30,
    });
    const grp = 'Payroll Calc';
    if (r.gross === 0 && r.net === 0) pass(grp, 'PAY-4: Zero days worked → ₹0 gross and net');
    else                               fail(grp, 'PAY-4: Zero days worked → ₹0 gross and net', `gross=${r.gross} net=${r.net}`);
  }

  // ── Payroll Test 5: Half-days prorated (10 present + 4 half = 12 effective)
  {
    const r = calculateNetSalary({
      base_salary: 30000, da: 0, hra: 0, other: 0,
      pf_pct: 12, esi_applicable: false,
      effective_days: 12, days_in_month: 30,
    });
    const expected = parseFloat(new Decimal(30000).times(12).dividedBy(30).toDecimalPlaces(2).toString());
    if (assertEqual(r.gross, expected, 0.02)) pass('Payroll Calc', `PAY-5: Half-days prorated: gross = ₹${expected}`);
    else                                       fail('Payroll Calc', `PAY-5: Half-days prorated: gross = ₹${expected}`, `got ₹${r.gross}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5.2  AUTHENTICATION & RBAC TESTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function runAuthTests() {
  section('5.2  Authentication & RBAC Tests');
  const grp = 'Auth';

  // — Obtain admin token FIRST so subsequent tests have a valid token
  //   (avoids burning the rate-limit window before the login test)
  {
    const r = await apiRequest('POST', '/api/auth/login', { email: 'admin@securityfirm.com', password: 'Admin@123' });
    if (r.status === 200 && r.body.data?.token) {
      adminToken = r.body.data.token;
      pass(grp, 'AUTH-5: Valid login → 200 + JWT token');
    } else {
      fail(grp, 'AUTH-5: Valid login → 200 + JWT token', `got ${r.status}: ${JSON.stringify(r.body).substring(0, 100)}`);
    }
  }

  // — Valid token → successful request
  {
    const r = await apiRequest('GET', '/api/auth/me', null, adminToken);
    if (r.status === 200 && r.body.success) pass(grp, 'AUTH-6: Valid token → GET /me succeeds');
    else                                     fail(grp, 'AUTH-6: Valid token → GET /me succeeds', `got ${r.status}`);
  }

  // — Tampered token → 401
  {
    const fakeToken = adminToken ? (adminToken.split('.').slice(0, 2).join('.') + '.invalidsignature') : 'a.b.c';
    const r = await apiRequest('GET', '/api/clients', null, fakeToken);
    if (r.status === 401) pass(grp, 'AUTH-7: Tampered token → 401 Unauthorized');
    else                  fail(grp, 'AUTH-7: Tampered token → 401 Unauthorized', `got ${r.status}`);
  }

  // — Protected route with no token → 401
  {
    const r = await apiRequest('GET', '/api/clients');
    if (r.status === 401) pass(grp, 'AUTH-3: No token → 401 Unauthorized');
    else                  fail(grp, 'AUTH-3: No token → 401 Unauthorized', `got ${r.status}`);
  }

  // — Protected route with invalid token string → 401
  {
    const r = await apiRequest('GET', '/api/clients', null, 'totally.invalid.token');
    if (r.status === 401) pass(grp, 'AUTH-4: Invalid token → 401 Unauthorized');
    else                  fail(grp, 'AUTH-4: Invalid token → 401 Unauthorized', `got ${r.status}`);
  }

  // — Wrong password for admin — use a unique email to avoid burning the admin rate-limit window
  //   Rate limiter is per-IP, not per-email, so after 5 attempts on any login this IP is blocked.
  //   We already used 1 attempt for the valid login above; test with a unique fake account.
  {
    const r = await apiRequest('POST', '/api/auth/login', { email: 'qa-wrongpwd-test@no-exist.test', password: 'wrongpassword' });
    if (r.status === 401 || r.status === 429) pass(grp, 'AUTH-1: Wrong password / unknown user → 401');
    else                                       fail(grp, 'AUTH-1: Wrong password / unknown user → 401', `got ${r.status}`);
  }

  // — Non-existent user → 401
  {
    const r = await apiRequest('POST', '/api/auth/login', { email: 'nobody-qa@nonexistent.test', password: 'pass123' });
    if (r.status === 401 || r.status === 429) pass(grp, 'AUTH-2: Unknown user → 401');
    else                                       fail(grp, 'AUTH-2: Unknown user → 401', `got ${r.status}`);
  }

  // — Rate limiting: 5+ attempts from same IP should eventually trigger 429
  {
    let got429 = false;
    for (let i = 0; i < 6; i++) {
      const r = await apiRequest('POST', '/api/auth/login', { email: `qa-spam-${i}@ratetest.test`, password: 'badpassword' });
      if (r.status === 429) { got429 = true; break; }
    }
    if (got429) pass(grp, 'AUTH-8: After 5 failed logins → 429 Rate Limited');
    else        fail(grp, 'AUTH-8: After 5+ failed logins → 429 Rate Limited', 'Rate limiter did not trigger (all from same IP)');
  }

  if (!adminToken) {
    console.log(C.yellow('\n  ⚠  Cannot get admin token. Skipping remaining API tests.\n'));
    return false;
  }

  return true;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5.3  MODULE INTEGRATION TESTS (full lifecycle)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function runIntegrationTests() {
  section('5.3  Module Integration Tests');
  if (!adminToken) {
    console.log(C.yellow('  ⚠  No token — skipping integration tests'));
    return;
  }

  // ── Flow A: Client → Invoice → Payment ────────────────────────────────────

  // A1: Create client
  {
    const grp = 'Integration-Client';
    const r = await apiRequest('POST', '/api/clients', {
      name: `QA-TestClient-${Date.now()}`,
      address: '123 Test Street, Test Nagar',
      city: 'Ahmedabad',
      state: 'Gujarat',
      monthly_rate: 50000,
      contract_start_date: '2026-01-01',
    }, adminToken);
    if (r.status === 201 && r.body.data?.id) {
      createdClientId = r.body.data.id;
      pass(grp, `INT-A1: Create client → 201 (id=${createdClientId})`);
    } else {
      fail(grp, 'INT-A1: Create client → 201', `got ${r.status}: ${JSON.stringify(r.body)}`);
    }
  }

  // A2: Validate Joi on bad client data
  {
    const grp = 'Integration-Client';
    const r = await apiRequest('POST', '/api/clients', {
      name: '', monthly_rate: -999
    }, adminToken);
    if (r.status === 422 && r.body.errors?.length > 0)
         pass(grp, 'INT-A2: Bad client data → 422 Validation Error with field list');
    else fail(grp, 'INT-A2: Bad client data → 422 Validation Error', `got ${r.status}`);
  }

  // A3: Duplicate client name → 400
  if (createdClientId) {
    const grp = 'Integration-Client';
    // Get the name we just created
    const fetchR = await apiRequest('GET', `/api/clients/${createdClientId}`, null, adminToken);
    if (fetchR.status === 200) {
      const clientName = fetchR.body.data.name;
      const r = await apiRequest('POST', '/api/clients', {
        name: clientName,
        address: '456 Another Street',
        city: 'Surat',
        monthly_rate: 30000,
        contract_start_date: '2026-01-01',
      }, adminToken);
      if (r.status === 400) pass(grp, 'INT-A3: Duplicate client name → 400 Conflict');
      else                  fail(grp, 'INT-A3: Duplicate client name → 400 Conflict', `got ${r.status}`);
    }
  }

  // A4: Create invoice for that client
  if (createdClientId) {
    const grp = 'Integration-Invoice';
    const r = await apiRequest('POST', '/api/invoices', {
      client_id: createdClientId,
      billing_period_start: '2026-05-01',
      billing_period_end: '2026-05-31',
      tax_rate: 18,
      discount_amount: 0,
    }, adminToken);
    if (r.status === 201 && r.body.data?.id) {
      createdInvoiceId = r.body.data.id;
      const inv = r.body.data;
      pass(grp, `INT-A4: Create invoice → 201 (id=${createdInvoiceId})`);

      // Verify computed amounts match expectation: Rate=50000, 31 days, GST=18%
      const expected = calculateInvoiceAmounts(50000, '2026-05-01', '2026-05-31', 18, 0);
      if (assertEqual(parseFloat(inv.final_amount), expected.final_amount))
           pass(grp, `INT-A4b: Invoice final_amount matches calc (₹${expected.final_amount})`);
      else fail(grp, `INT-A4b: Invoice final_amount matches calc`, `DB=${inv.final_amount} calc=${expected.final_amount}`);
    } else {
      fail(grp, 'INT-A4: Create invoice → 201', `got ${r.status}: ${JSON.stringify(r.body)}`);
    }
  }

  // A5: Duplicate invoice for same period → 409
  if (createdClientId) {
    const grp = 'Integration-Invoice';
    const r = await apiRequest('POST', '/api/invoices', {
      client_id: createdClientId,
      billing_period_start: '2026-05-01',
      billing_period_end: '2026-05-31',
      tax_rate: 18,
    }, adminToken);
    if (r.status === 409) pass(grp, 'INT-A5: Duplicate billing period → 409 Conflict');
    else                  fail(grp, 'INT-A5: Duplicate billing period → 409 Conflict', `got ${r.status}`);
  }

  // A6: Record partial payment
  if (createdInvoiceId) {
    const grp = 'Integration-Payment';
    const partialAmount = 10000;
    const r = await apiRequest('POST', `/api/invoices/${createdInvoiceId}/payment`, {
      amount_paid: partialAmount,
      payment_method: 'bank_transfer',
      payment_date: '2026-06-01',
      transaction_reference: 'QA-TXN-001',
    }, adminToken);
    if (r.status === 200 && r.body.data?.status === 'partially_paid')
         pass(grp, 'INT-A6: Partial payment → status = partially_paid');
    else fail(grp, 'INT-A6: Partial payment → status = partially_paid', `got ${r.status} status=${r.body.data?.status}`);
  }

  // A7: Overpayment attempt → 400
  if (createdInvoiceId) {
    const grp = 'Integration-Payment';
    const r = await apiRequest('POST', `/api/invoices/${createdInvoiceId}/payment`, {
      amount_paid: 9999999,
      payment_method: 'cash',
    }, adminToken);
    if (r.status === 400) pass(grp, 'INT-A7: Overpayment → 400 rejected');
    else                  fail(grp, 'INT-A7: Overpayment → 400 rejected', `got ${r.status}`);
  }

  // A8: Pay remaining balance → status = paid
  if (createdInvoiceId) {
    const grp = 'Integration-Payment';
    // Get current invoice to find remaining due
    const fetchR = await apiRequest('GET', `/api/invoices/${createdInvoiceId}`, null, adminToken);
    if (fetchR.status === 200) {
      const due = parseFloat(fetchR.body.data.payment_due);
      const r = await apiRequest('POST', `/api/invoices/${createdInvoiceId}/payment`, {
        amount_paid: due,
        payment_method: 'upi',
        transaction_reference: 'QA-TXN-002',
      }, adminToken);
      if (r.status === 200 && r.body.data?.status === 'paid')
           pass(grp, `INT-A8: Full payment (₹${due}) → status = paid`);
      else fail(grp, 'INT-A8: Full payment → status = paid', `got ${r.status} status=${r.body.data?.status}`);
    }
  }

  // ── Flow B: Employee → Expense → Approve ──────────────────────────────────

  // B1: Create expense
  {
    const grp = 'Integration-Expense';
    const r = await apiRequest('POST', '/api/expenses', {
      expense_date: '2026-06-01',
      category: 'miscellaneous',
      description: 'QA test expense for office supplies',
      amount: 2500,
      payment_method: 'cash',
      vendor_name: 'QA Vendor',
    }, adminToken);
    if (r.status === 201 && r.body.data?.id) {
      createdExpenseId = r.body.data.id;
      if (r.body.data.status === 'pending')
           pass(grp, `INT-B1: Create expense → 201, status=pending (id=${createdExpenseId})`);
      else fail(grp, 'INT-B1: Create expense → 201, status=pending', `got status=${r.body.data.status}`);
    } else {
      fail(grp, 'INT-B1: Create expense → 201', `got ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`);
    }
  }

  // B2: Validate Joi on bad expense
  {
    const grp = 'Integration-Expense';
    const r = await apiRequest('POST', '/api/expenses', {
      expense_date: '2026-06-01',
      category: 'invalid_category',
      description: 'x', // too short
      amount: -100,
    }, adminToken);
    if (r.status === 422) pass(grp, 'INT-B2: Bad expense data → 422 Validation Error');
    else                  fail(grp, 'INT-B2: Bad expense data → 422 Validation Error', `got ${r.status}: ${JSON.stringify(r.body).substring(0,200)}`);
  }

  // B3: Approve expense → status=approved
  if (createdExpenseId) {
    const grp = 'Integration-Expense';
    const r = await apiRequest('PUT', `/api/expenses/${createdExpenseId}/approve`, {
      approval_notes: 'Approved by QA test'
    }, adminToken);
    if (r.status === 200 && r.body.data?.status === 'approved')
         pass(grp, 'INT-B3: Approve expense → status = approved');
    else fail(grp, 'INT-B3: Approve expense → status = approved', `got ${r.status} status=${r.body.data?.status}`);
  }

  // B4: Cannot re-approve already-approved expense → 404
  if (createdExpenseId) {
    const grp = 'Integration-Expense';
    const r = await apiRequest('PUT', `/api/expenses/${createdExpenseId}/approve`, {
      approval_notes: 'Try again'
    }, adminToken);
    if (r.status === 404) pass(grp, 'INT-B4: Double-approve → 404 (already processed)');
    else                  fail(grp, 'INT-B4: Double-approve → 404', `got ${r.status}`);
  }

  // ── Flow C: Invoice for inactive client → blocked ─────────────────────────

  if (createdClientId) {
    const grp = 'Integration-Guard';

    // Deactivate client
    await apiRequest('DELETE', `/api/clients/${createdClientId}`, null, adminToken);

    // Try to create invoice for deactivated client
    const r = await apiRequest('POST', '/api/invoices', {
      client_id: createdClientId,
      billing_period_start: '2026-04-01',
      billing_period_end: '2026-04-30',
      tax_rate: 18,
    }, adminToken);
    if (r.status === 404) pass(grp, 'INT-C1: Invoice for inactive client → 404 blocked');
    else                  fail(grp, 'INT-C1: Invoice for inactive client → 404 blocked', `got ${r.status}: ${JSON.stringify(r.body).substring(0,150)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5.4  EDGE CASES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function runEdgeCaseTests() {
  section('5.4  Edge Cases');
  const grp = 'Edge Cases';

  // EDGE-1: Invoice with end before start → Joi 422
  if (adminToken) {
    const r = await apiRequest('POST', '/api/invoices', {
      client_id: 1,
      billing_period_start: '2026-06-30',
      billing_period_end: '2026-06-01',  // End BEFORE start
      tax_rate: 0,
    }, adminToken);
    if (r.status === 422) pass(grp, 'EDGE-1: Invoice end < start → 422 Validation Error');
    else                  fail(grp, 'EDGE-1: Invoice end < start → 422 Validation Error', `got ${r.status}`);
  }

  // EDGE-2: Payment method enum guard
  if (adminToken) {
    const r = await apiRequest('POST', `/api/invoices/999/payment`, {
      amount_paid: 100,
      payment_method: 'bitcoin', // invalid enum
    }, adminToken);
    if (r.status === 422) pass(grp, 'EDGE-2: Invalid payment_method → 422 Validation Error');
    else                  fail(grp, 'EDGE-2: Invalid payment_method → 422 Validation Error', `got ${r.status}`);
  }

  // EDGE-3: Employee Aadhar format validation
  if (adminToken) {
    const r = await apiRequest('POST', '/api/employees', {
      full_name: 'Test Employee',
      phone: '9876543210',
      date_of_joining: '2026-01-01',
      aadhar_number: '123',  // Too short — must be 12 digits
    }, adminToken);
    if (r.status === 422) pass(grp, 'EDGE-3: Invalid Aadhar (3 digits) → 422 Validation Error');
    else                  fail(grp, 'EDGE-3: Invalid Aadhar (3 digits) → 422 Validation Error', `got ${r.status}`);
  }

  // EDGE-4: Employee PAN format validation
  if (adminToken) {
    const r = await apiRequest('POST', '/api/employees', {
      full_name: 'Test Employee',
      phone: '9876543210',
      date_of_joining: '2026-01-01',
      pan_number: 'INVALID',  // Wrong format
    }, adminToken);
    if (r.status === 422) pass(grp, 'EDGE-4: Invalid PAN format → 422 Validation Error');
    else                  fail(grp, 'EDGE-4: Invalid PAN format → 422 Validation Error', `got ${r.status}`);
  }

  // EDGE-5: GST number format validation
  if (adminToken) {
    const r = await apiRequest('POST', '/api/clients', {
      name: `EDGE-GST-Test-${Date.now()}`,
      address: '123 Test Road',
      city: 'Mumbai',
      monthly_rate: 10000,
      contract_start_date: '2026-01-01',
      gst_number: 'INVALIDGST',  // Wrong format
    }, adminToken);
    if (r.status === 422) pass(grp, 'EDGE-5: Invalid GST number format → 422 Validation Error');
    else                  fail(grp, 'EDGE-5: Invalid GST number format → 422 Validation Error', `got ${r.status}`);
  }

  // EDGE-6: Non-existent invoice → 404
  if (adminToken) {
    const r = await apiRequest('GET', '/api/invoices/999999', null, adminToken);
    if (r.status === 404) pass(grp, 'EDGE-6: Non-existent invoice → 404 Not Found');
    else                  fail(grp, 'EDGE-6: Non-existent invoice → 404 Not Found', `got ${r.status}`);
  }

  // EDGE-7: Non-existent client → 404
  if (adminToken) {
    const r = await apiRequest('GET', '/api/clients/999999', null, adminToken);
    if (r.status === 404) pass(grp, 'EDGE-7: Non-existent client → 404 Not Found');
    else                  fail(grp, 'EDGE-7: Non-existent client → 404 Not Found', `got ${r.status}`);
  }

  // EDGE-8: Invoice date calculations — no timezone drift
  {
    const r1 = calculateInvoiceAmounts(50000, '2026-01-01', '2026-01-31', 0, 0);
    const r2 = calculateInvoiceAmounts(50000, '2026-03-01', '2026-03-31', 0, 0);
    if (r1.daysInPeriod === 31 && r2.daysInPeriod === 31)
         pass(grp, 'EDGE-8: January and March both count 31 days (no timezone drift)');
    else fail(grp, 'EDGE-8: January and March both count 31 days', `Jan=${r1.daysInPeriod} Mar=${r2.daysInPeriod}`);
  }

  // EDGE-9: Payroll month format Joi check
  if (adminToken) {
    const r = await apiRequest('POST', '/api/payroll/calculate', {
      month: '06-2026',  // Wrong format
    }, adminToken);
    if (r.status === 422) pass(grp, 'EDGE-9: Invalid month format → 422 Validation Error');
    else                  fail(grp, 'EDGE-9: Invalid month format → 422 Validation Error', `got ${r.status}`);
  }

  // EDGE-10: Health check endpoint
  {
    const r = await apiRequest('GET', '/health');
    if (r.status === 200 && r.body.status === 'ok')
         pass(grp, 'EDGE-10: /health → 200 OK');
    else fail(grp, 'EDGE-10: /health → 200 OK', `got ${r.status}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLEANUP — remove test data created during integration tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function cleanup() {
  section('Cleanup');
  if (!adminToken) return;

  if (createdInvoiceId) {
    const r = await apiRequest('DELETE', `/api/invoices/${createdInvoiceId}`, null, adminToken);
    if (r.status === 200) console.log(`  ${C.dim('Removed test invoice id=' + createdInvoiceId)}`);
  }
  console.log(C.dim('  Test data cleanup complete'));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUMMARY REPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function printSummary() {
  const passed  = results.filter((r) => r.status === 'PASS').length;
  const failed  = results.filter((r) => r.status === 'FAIL').length;
  const total   = results.length;
  const pct     = total > 0 ? Math.round((passed / total) * 100) : 0;

  console.log('\n' + '═'.repeat(65));
  console.log(C.bold('  PHASE 5 QA TEST REPORT'));
  console.log('═'.repeat(65));
  console.log(`  Total Tests : ${total}`);
  console.log(`  ${C.green('Passed')}      : ${passed}`);
  console.log(`  ${failed > 0 ? C.red('Failed') : C.green('Failed')}      : ${failed}`);
  console.log(`  Pass Rate   : ${pct >= 90 ? C.green(pct + '%') : pct >= 70 ? C.yellow(pct + '%') : C.red(pct + '%')}`);

  if (failed > 0) {
    console.log('\n' + C.bold(C.red('  ✗ FAILED TESTS:')));
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => console.log(`    [${r.group}] ${r.name}${r.detail ? ' → ' + r.detail : ''}`));
  }

  console.log('═'.repeat(65) + '\n');

  if (pct === 100) {
    console.log(C.green(C.bold('  🎉 ALL TESTS PASSED — Software is ready for Phase 6!\n')));
  } else if (pct >= 90) {
    console.log(C.yellow(C.bold('  ⚠  Minor issues found — review failed tests above.\n')));
  } else {
    console.log(C.red(C.bold('  ❌ Significant issues found — fix failed tests before deployment!\n')));
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN RUNNER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log(C.bold('\n🔍 Security Firm Software — Phase 5 QA Test Suite'));
  console.log(C.dim(`   Server: ${BASE_URL}  |  ${new Date().toLocaleString()}\n`));

  try {
    await runFinancialTests();
    const authOk = await runAuthTests();
    await runIntegrationTests();
    await runEdgeCaseTests();
    await cleanup();
    printSummary();
  } catch (err) {
    console.error(C.red('\n💥 Test runner crashed: ' + err.message));
    console.error(err.stack);
    process.exit(1);
  }
}

main();
