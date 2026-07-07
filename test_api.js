

async function test() {
  const resLogin = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@admin.com', password: 'password123' })
  });
  
  if (!resLogin.ok) {
    console.log("Login failed HTTP:", resLogin.status);
    return;
  }
  
  const loginData = await resLogin.json();
  const token = loginData.data.token;
  console.log("Got token length:", token ? token.length : 0);

  const resRev = await fetch(`http://localhost:5000/api/reports/client-revenue?from_date=2026-01-01&to_date=2026-06-11&token=${token}`);
  
  const data = await resRev.json();
  console.log("API Response:", JSON.stringify(data, null, 2));
}

test();
