const http = require('http');

const BASE_URL = 'http://localhost:5000/api';
const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'password123';

// ── Lightweight HTTP client (no external deps) ──────────────────────

function request(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
          rawBody: Buffer.from(data, 'binary'),
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// For binary responses (PDF)
function requestBinary(method, path, cookie) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { ...(cookie ? { Cookie: cookie } : {}) },
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          buffer,
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// ── Auth helper ─────────────────────────────────────────────────────

async function login(email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  const res = await request('POST', '/auth/login', { email, password });
  if (!res.data.success) throw new Error('Login failed: ' + JSON.stringify(res.data));
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) throw new Error('No Set-Cookie header returned from login');
  // Extract the token cookie
  const tokenCookie = setCookie.find((c) => c.startsWith('token='));
  if (!tokenCookie) throw new Error('No token cookie found');
  const cookie = tokenCookie.split(';')[0]; // "token=xxxxx"
  _cachedCookie = cookie;
  return cookie;
}

let _cachedCookie = null;
async function loginOnce(email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  if (_cachedCookie) return _cachedCookie;
  return login(email, password);
}

// ── Convenience wrappers ────────────────────────────────────────────

async function authGet(path, cookie) { return request('GET', path, null, cookie); }
async function authPost(path, body, cookie) { return request('POST', path, body, cookie); }
async function authPut(path, body, cookie) { return request('PUT', path, body, cookie); }
async function authDelete(path, cookie) { return request('DELETE', path, null, cookie); }
async function authGetBinary(path, cookie) { return requestBinary('GET', path, cookie); }

// ── Logging ─────────────────────────────────────────────────────────

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function logResult(testName, passed, details) {
  const icon = passed ? `${COLORS.green}✅ PASS${COLORS.reset}` : `${COLORS.red}❌ FAIL${COLORS.reset}`;
  console.log(`  ${icon}  ${testName}`);
  if (!passed && details) {
    console.log(`       ${COLORS.dim}→ ${details}${COLORS.reset}`);
  }
}

function printSummary(suiteName, results) {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const allPassed = failed === 0;
  const statusIcon = allPassed ? `${COLORS.green}✅ ALL PASS${COLORS.reset}` : `${COLORS.red}❌ ${failed} FAILED${COLORS.reset}`;

  console.log('');
  console.log(`${COLORS.bold}╔═══════════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.bold}║${COLORS.reset} ${COLORS.cyan}${suiteName.padEnd(35)}${COLORS.reset} ${COLORS.bold}${String(passed + '/' + results.length).padStart(5)}${COLORS.reset}  ${statusIcon} ${COLORS.bold}║${COLORS.reset}`);
  console.log(`${COLORS.bold}╚═══════════════════════════════════════════════╝${COLORS.reset}`);
  console.log('');

  return { suite: suiteName, passed, total: results.length, allPassed };
}

// ── Server health check ─────────────────────────────────────────────

async function waitForServer(retries = 5, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await request('GET', '/auth/me');
      return true; // Server is up (even a 401 means it's running)
    } catch {
      if (i < retries - 1) {
        console.log(`  Waiting for server... (attempt ${i + 1}/${retries})`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw new Error('Server is not reachable on localhost:5000');
}

module.exports = {
  BASE_URL,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  login,
  loginOnce,
  authGet,
  authPost,
  authPut,
  authDelete,
  authGetBinary,
  logResult,
  printSummary,
  waitForServer,
  request,
};
