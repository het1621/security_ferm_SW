

async function test() {
  // 1. Get token
  const resLogin = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin_password' }) // Or whatever credentials
  });
  const loginData = await resLogin.json();
  const token = loginData.token;

  if (!token) {
    console.log("Login failed");
    return;
  }

  // 2. Fetch client revenue
  const resRev = await fetch('http://localhost:5000/api/reports/client-revenue?from_date=2026-01-01&to_date=2026-06-11', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await resRev.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
