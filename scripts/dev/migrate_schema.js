const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'src', 'database', 'schema.sql');
let content = fs.readFileSync(schemaPath, 'utf8');

// Replace PostgreSQL syntax with SQLite syntax
content = content.replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/g, '');
content = content.replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
content = content.replace(/JSONB/gi, 'TEXT');
content = content.replace(/BOOLEAN/gi, 'INTEGER');
content = content.replace(/DECIMAL\(\d+,\s*\d+\)/gi, 'REAL');

// There's a weird encoding at the bottom of the file from what I saw, let's clean it up if needed.
// Write it back
fs.writeFileSync(schemaPath, content, 'utf8');

console.log('schema.sql successfully converted to SQLite syntax!');
