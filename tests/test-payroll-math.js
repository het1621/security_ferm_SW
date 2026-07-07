/**
 * Test Script 3: Payroll Math Accuracy
 * Creates salary structure + employee + attendance, then verifies payroll math with Decimal.js precision.
 */
const { loginOnce, authGet, authPost, authDelete, logResult, printSummary, waitForServer } = require('./helpers');
const Decimal = require('decimal.js');

async function run() {
  console.log('\n💰 Test Suite: Payroll Math Accuracy\n');
  const results = [];
  let cookie;
  let salaryStructureId, employeeId, payrollId;

  await waitForServer();
  cookie = await loginOnce();

  // ── Setup: Create salary structure ───────────────────────────────
  try {
    const res = await authPost('/settings/salary-structures', {
      name: 'TEST_PAYROLL_STRUCTURE',
      base_salary: 30000,
      dearness_allowance: 1500,
      house_rent_allowance: 3000,
      other_allowances: 500,
      pf_percentage: 12,
      esi_applicable: true,
    }, cookie);
    salaryStructureId = res.data.data?.id;
    const ok = res.data.success === true && salaryStructureId;
    results.push({ passed: ok });
    logResult('Create test salary structure', ok, ok ? '' : JSON.stringify(res.data));
  } catch (e) {
    results.push({ passed: false });
    logResult('Create test salary structure', false, e.message);
  }

  // ── Setup: Create employee linked to structure ────────────────────
  try {
    const res = await authPost('/employees', {
      full_name: 'Payroll Test Guard',
      phone: '9000000001',
      date_of_joining: '2026-01-01',
      designation: 'Watchman',
      salary_structure_id: salaryStructureId,
    }, cookie);
    employeeId = res.data.data?.id;
    const ok = res.data.success === true && employeeId;
    results.push({ passed: ok });
    logResult('Create test employee with salary structure', ok, ok ? '' : JSON.stringify(res.data));
  } catch (e) {
    results.push({ passed: false });
    logResult('Create test employee with salary structure', false, e.message);
  }

  // ── Setup: Create attendance records for June 2026 ────────────────
  // June has 30 days. We set 22 present, 2 half-days, 6 absent.
  try {
    const records = [];
    for (let day = 1; day <= 30; day++) {
      const date = `2026-06-${String(day).padStart(2, '0')}`;
      let status = 'absent';
      if (day <= 22) status = 'present';
      else if (day <= 24) status = 'half_day';
      // days 25-30 are absent

      records.push({
        employee_id: employeeId,
        attendance_date: date,
        status,
      });
    }
    const res = await authPost('/attendance/bulk', { records }, cookie);
    const ok = res.data.success === true;
    results.push({ passed: ok });
    logResult('Create 30 attendance records (22P + 2HD + 6A)', ok, ok ? '' : JSON.stringify(res.data));
  } catch (e) {
    results.push({ passed: false });
    logResult('Create 30 attendance records', false, e.message);
  }

  // ── Test: Run payroll calculation ─────────────────────────────────
  try {
    const res = await authPost('/payroll/calculate', {
      employee_ids: [employeeId],
      month: '2026-06-01',
    }, cookie);

    const ok = res.data.success === true && res.data.data.length > 0;
    const payroll = res.data.data?.[0];
    payrollId = payroll?.id;

    if (ok && payroll) {
      // ── Manual verification using Decimal.js ────────────
      // Payroll logic: PF is on BASE salary only, ESI is on GROSS
      const daysInMonth = 30;
      const effectiveDays = 22 + (2 * 0.5); // 23
      const ratio = effectiveDays / daysInMonth;

      const D = (v) => new Decimal(v || 0);
      const expectedBase = D(30000).times(ratio).toDecimalPlaces(2);
      const expectedDA = D(1500).times(ratio).toDecimalPlaces(2);
      const expectedHRA = D(3000).times(ratio).toDecimalPlaces(2);
      const expectedOther = D(500).times(ratio).toDecimalPlaces(2);
      const expectedGross = expectedBase.plus(expectedDA).plus(expectedHRA).plus(expectedOther).toDecimalPlaces(2);

      // PF is on BASE salary, not gross (per the actual code)
      const expectedPF = expectedBase.times(12).dividedBy(100).toDecimalPlaces(2);
      const expectedESI = expectedGross.times(0.75).dividedBy(100).toDecimalPlaces(2);
      const expectedNet = expectedGross.minus(expectedPF).minus(expectedESI);

      const tolerance = 1; // ±1 rupee tolerance

      const grossOk = Math.abs(payroll.gross_salary - parseFloat(expectedGross)) <= tolerance;
      const pfOk = Math.abs(payroll.pf_deduction - parseFloat(expectedPF)) <= tolerance;
      const netOk = Math.abs(payroll.net_salary - parseFloat(expectedNet)) <= tolerance;

      results.push({ passed: grossOk });
      logResult(
        `Gross salary: expected ₹${expectedGross} got ₹${payroll.gross_salary}`,
        grossOk,
        grossOk ? '' : `Diff: ${Math.abs(payroll.gross_salary - parseFloat(expectedGross))}`
      );

      results.push({ passed: pfOk });
      logResult(
        `PF deduction: expected ₹${expectedPF} got ₹${payroll.pf_deduction}`,
        pfOk,
        pfOk ? '' : `Diff: ${Math.abs(payroll.pf_deduction - parseFloat(expectedPF))}`
      );

      results.push({ passed: netOk });
      logResult(
        `Net salary:   expected ₹${expectedNet.toDecimalPlaces(2)} got ₹${payroll.net_salary}`,
        netOk,
        netOk ? '' : `Diff: ${Math.abs(payroll.net_salary - parseFloat(expectedNet))}`
      );
    } else {
      results.push({ passed: false });
      logResult('Payroll calculation returned data', false, JSON.stringify(res.data));
      results.push({ passed: false });
      results.push({ passed: false });
    }
  } catch (e) {
    results.push({ passed: false });
    logResult('Payroll calculation', false, e.message);
    results.push({ passed: false });
    results.push({ passed: false });
  }

  // ── Cleanup ───────────────────────────────────────────────────────
  try {
    if (payrollId) await authDelete(`/payroll/${payrollId}`, cookie);
  } catch { /* ignore cleanup errors */ }
  try {
    if (employeeId) await authDelete(`/employees/${employeeId}`, cookie);
  } catch { /* ignore */ }
  try {
    if (salaryStructureId) await authDelete(`/settings/salary-structures/${salaryStructureId}`, cookie);
  } catch { /* ignore */ }

  return printSummary('Payroll Math', results);
}

if (require.main === module) {
  run().then((s) => process.exit(s.allPassed ? 0 : 1)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { run };
