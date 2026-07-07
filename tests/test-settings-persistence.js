/**
 * Test Script 6: Settings Persistence
 * Tests save/load/overwrite for agency_settings and smtp_settings in the system_settings table.
 */
const { loginOnce, authGet, authPut, logResult, printSummary, waitForServer } = require('./helpers');

async function run() {
  console.log('\n⚙️  Test Suite: Settings Persistence\n');
  const results = [];
  let cookie;

  await waitForServer();
  cookie = await loginOnce();

  // ── Test 1: Save agency settings ─────────────────────────────────
  const testAgency = {
    agency_name: 'Automation Test Security Corp',
    agency_address: '789 Guard Street, Ahmedabad',
    agency_phone: '+91 98765 00000',
    agency_email: 'autotest@security.com',
    agency_gst: '24AUTOTEST1234Z',
  };

  try {
    const res = await authPut('/settings/system/agency_settings', {
      value: JSON.stringify(testAgency),
    }, cookie);
    const ok = res.data.success === true;
    results.push({ passed: ok });
    logResult('PUT agency_settings saves successfully', ok, ok ? '' : JSON.stringify(res.data));
  } catch (e) {
    results.push({ passed: false });
    logResult('PUT agency_settings saves successfully', false, e.message);
  }

  // ── Test 2: Read back agency settings ─────────────────────────────
  try {
    const res = await authGet('/settings/system/agency_settings', cookie);
    const parsed = JSON.parse(res.data.data);
    const ok = parsed.agency_name === testAgency.agency_name && parsed.agency_phone === testAgency.agency_phone;
    results.push({ passed: ok });
    logResult('GET agency_settings returns saved data', ok, ok ? '' : JSON.stringify(parsed));
  } catch (e) {
    results.push({ passed: false });
    logResult('GET agency_settings returns saved data', false, e.message);
  }

  // ── Test 3: Save SMTP settings ───────────────────────────────────
  const testSmtp = {
    host: 'smtp.gmail.com',
    port: 587,
    user: 'autotest@gmail.com',
    password: 'testAppPassword123',
  };

  try {
    const res = await authPut('/settings/system/smtp_settings', {
      value: JSON.stringify(testSmtp),
    }, cookie);
    const ok = res.data.success === true;
    results.push({ passed: ok });
    logResult('PUT smtp_settings saves successfully', ok, ok ? '' : JSON.stringify(res.data));
  } catch (e) {
    results.push({ passed: false });
    logResult('PUT smtp_settings saves successfully', false, e.message);
  }

  // ── Test 4: Read back SMTP settings ───────────────────────────────
  try {
    const res = await authGet('/settings/system/smtp_settings', cookie);
    const parsed = JSON.parse(res.data.data);
    const ok = parsed.host === 'smtp.gmail.com' && parsed.user === 'autotest@gmail.com';
    results.push({ passed: ok });
    logResult('GET smtp_settings returns saved data', ok, ok ? '' : JSON.stringify(parsed));
  } catch (e) {
    results.push({ passed: false });
    logResult('GET smtp_settings returns saved data', false, e.message);
  }

  // ── Test 5: Overwrite agency settings ─────────────────────────────
  const updatedAgency = {
    agency_name: 'Updated Security Corp V2',
    agency_address: '999 New Address, Rajkot',
    agency_phone: '+91 11111 22222',
    agency_email: 'updated@security.com',
    agency_gst: '24UPDATED1234Z',
  };

  try {
    await authPut('/settings/system/agency_settings', {
      value: JSON.stringify(updatedAgency),
    }, cookie);
    const res = await authGet('/settings/system/agency_settings', cookie);
    const parsed = JSON.parse(res.data.data);
    const ok = parsed.agency_name === 'Updated Security Corp V2' && parsed.agency_phone === '+91 11111 22222';
    results.push({ passed: ok });
    logResult('Overwrite replaces old values (no duplication)', ok, ok ? '' : JSON.stringify(parsed));
  } catch (e) {
    results.push({ passed: false });
    logResult('Overwrite replaces old values (no duplication)', false, e.message);
  }

  // ── Test 6: Verify old values are gone ────────────────────────────
  try {
    const res = await authGet('/settings/system/agency_settings', cookie);
    const parsed = JSON.parse(res.data.data);
    const ok = parsed.agency_name !== testAgency.agency_name;
    results.push({ passed: ok });
    logResult('Old agency_name no longer exists after overwrite', ok);
  } catch (e) {
    results.push({ passed: false });
    logResult('Old agency_name no longer exists after overwrite', false, e.message);
  }

  return printSummary('Settings Persistence', results);
}

if (require.main === module) {
  run().then((s) => process.exit(s.allPassed ? 0 : 1)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { run };
