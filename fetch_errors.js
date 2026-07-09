const Database = require('better-sqlite3');
const db = new Database('database.sqlite');
const logs = db.prepare("SELECT * FROM error_logs ORDER BY id DESC LIMIT 3;").all();
console.log(JSON.stringify(logs, null, 2));
