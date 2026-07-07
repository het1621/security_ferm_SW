/**
 * Test Script 1: Authentication Flow
 * Tests login, session validation, invalid credentials, logout, and post-logout access.
 */
const { login, authGet, authPost, logResult, printSummary, waitForServer, request } = require('./helpers');

async function run() {
  console.log('\n🔐 Test Suite: Authentication Flow\n');
  const results = [];

  await waitForServer();

  // ── Test 1: Valid login ───────────────────────────────────────────
  let cookie;
  try {
    cookie = await login();
    results.push({ passed: true });
    logResult('Valid admin login returns success + cookie', true);
  } catch (e) {
    results.push({ passed: false });
    logResult('Valid admin login returns success + cookie', false, e.message);
  }

  // ── Test 2: GET /auth/me with valid cookie ────────────────────────
  try {
    const res = await authGet('/auth/me', cookie);
    const ok = res.data.success === true && res.data.data.role === 'admin' && res.data.data.email === 'admin@admin.com';
    results.push({ passed: ok });
    logResult('GET /auth/me returns admin profile', ok, ok ? '' : JSON.stringify(res.data));
  } catch (e) {
    results.push({ passed: false });
    logResult('GET /auth/me returns admin profile', false, e.message);
  }

  // ── Test 3: Invalid credentials ──────────────────────────────────
  try {
    const res = await request('POST', '/auth/login', { email: 'admin@admin.com', password: 'wrongpassword' });
    const ok = res.data.success === false && res.status === 401;
    results.push({ passed: ok });
    logResult('Invalid password returns 401 + success: false', ok, ok ? '' : `status=${res.status} body=${JSON.stringify(res.data)}`);
  } catch (e) {
    results.push({ passed: false });
    logResult('Invalid password returns 401 + success: false', false, e.message);
  }

  // ── Test 4: Logout ───────────────────────────────────────────────
  try {
    const res = await authPost('/auth/logout', {}, cookie);
    const ok = res.data.success === true;
    results.push({ passed: ok });
    logResult('POST /auth/logout returns success', ok);
  } catch (e) {
    results.push({ passed: false });
    logResult('POST /auth/logout returns success', false, e.message);
  }

  // ── Test 5: Access after logout ──────────────────────────────────
  try {
    // Use a cleared cookie to simulate post-logout state
    const res = await authGet('/auth/me', 'token=invalidtoken');
    const ok = res.status === 401;
    results.push({ passed: ok });
    logResult('GET /auth/me after logout returns 401', ok, ok ? '' : `status=${res.status}`);
  } catch (e) {
    results.push({ passed: false });
    logResult('GET /auth/me after logout returns 401', false, e.message);
  }

  return printSummary('Auth Flow', results);
}

if (require.main === module) {
  run().then((s) => process.exit(s.allPassed ? 0 : 1)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { run };
