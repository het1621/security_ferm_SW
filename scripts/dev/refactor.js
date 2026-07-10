const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace ILIKE -> LIKE
  content = content.replace(/\bILIKE\b/g, 'LIKE');

  // Replace CURRENT_DATE
  content = content.replace(/\bCURRENT_DATE\b/g, "date('now', 'localtime')");

  // Replace ::date
  content = content.replace(/\$([0-9]+)::date/g, "date(\$$1)");

  // Replace EXTRACT YEAR/MONTH
  content = content.replace(/EXTRACT\(\s*YEAR\s+FROM\s+([a-zA-Z0-9_.]+)\s*\)/g, "CAST(strftime('%Y', $1) AS INTEGER)");
  content = content.replace(/EXTRACT\(\s*MONTH\s+FROM\s+([a-zA-Z0-9_.]+)\s*\)/g, "CAST(strftime('%m', $1) AS INTEGER)");

  // Replace TO_CHAR(col, 'YYYY-MM')
  content = content.replace(/TO_CHAR\(\s*([a-zA-Z0-9_.]+)\s*,\s*'YYYY-MM'\s*\)/g, "strftime('%Y-%m', $1)");

  // Replace TO_CHAR(col, 'Mon YYYY')
  content = content.replace(/TO_CHAR\(\s*([a-zA-Z0-9_.]+)\s*,\s*'Mon YYYY'\s*\)/g, "(CASE strftime('%m', $1) WHEN '01' THEN 'Jan ' WHEN '02' THEN 'Feb ' WHEN '03' THEN 'Mar ' WHEN '04' THEN 'Apr ' WHEN '05' THEN 'May ' WHEN '06' THEN 'Jun ' WHEN '07' THEN 'Jul ' WHEN '08' THEN 'Aug ' WHEN '09' THEN 'Sep ' WHEN '10' THEN 'Oct ' WHEN '11' THEN 'Nov ' WHEN '12' THEN 'Dec ' END) || strftime('%Y', $1)");

  // Replace TO_CHAR(col, 'Mon')
  content = content.replace(/TO_CHAR\(\s*([a-zA-Z0-9_.]+)\s*,\s*'Mon'\s*\)/g, "CASE strftime('%m', $1) WHEN '01' THEN 'Jan' WHEN '02' THEN 'Feb' WHEN '03' THEN 'Mar' WHEN '04' THEN 'Apr' WHEN '05' THEN 'May' WHEN '06' THEN 'Jun' WHEN '07' THEN 'Jul' WHEN '08' THEN 'Aug' WHEN '09' THEN 'Sep' WHEN '10' THEN 'Oct' WHEN '11' THEN 'Nov' WHEN '12' THEN 'Dec' END");

  // Replace intervals
  content = content.replace(/date\('now', 'localtime'\)\s*-\s*INTERVAL\s*'30 days'/g, "date('now', 'localtime', '-30 days')");
  content = content.replace(/date\('now', 'localtime'\)\s*-\s*INTERVAL\s*'60 days'/g, "date('now', 'localtime', '-60 days')");
  content = content.replace(/date\('now', 'localtime'\)\s*\+\s*INTERVAL\s*'60 days'/g, "date('now', 'localtime', '+60 days')");
  
  // Replace DATE_TRUNC('month', col) + INTERVAL '1 month - 1 day' -> date(col, 'start of month', '+1 month', '-1 day')
  content = content.replace(/DATE_TRUNC\('month',\s*([a-zA-Z0-9_.]+)\)\s*\+\s*INTERVAL\s*'1 month - 1 day'/g, "date($1, 'start of month', '+1 month', '-1 day')");

  // Replace DATE_TRUNC('month', col) -> date(col, 'start of month')
  content = content.replace(/DATE_TRUNC\('month',\s*([a-zA-Z0-9_.]+)\)/g, "date($1, 'start of month')");
  
  // Replace DATE_TRUNC('month', date('now', 'localtime') - INTERVAL '30 days') -> date('now', 'localtime', 'start of month', '-30 days')
  content = content.replace(/DATE_TRUNC\('month',\s*date\('now', 'localtime', '-30 days'\)\)/g, "date('now', 'localtime', 'start of month', '-30 days')");
  
  // Replace DATE_TRUNC('month', date('now', 'localtime')) -> date('now', 'localtime', 'start of month')
  content = content.replace(/DATE_TRUNC\('month',\s*date\('now', 'localtime'\)\)/g, "date('now', 'localtime', 'start of month')");

  // Replace DATE_TRUNC('month', date($1))
  content = content.replace(/DATE_TRUNC\('month',\s*date\(\$([0-9]+)\)\)/g, "date(\$$1, 'start of month')");
  
  // Replace LEFT JOIN LATERAL in employees.js
  if (file === 'employees.js') {
    content = content.replace(/LEFT JOIN LATERAL \([\s\S]*?\) s ON true/g, "LEFT JOIN salary_structures s ON e.salary_structure_id = s.id");
  }

  // Replace the regex issue: 'date($1, 'start of month', '+1 month', '-1 day') >= date($1)' which was produced if there was DATE_TRUNC('month', $1::date) + INTERVAL ...
  content = content.replace(/date\(date\(\$([0-9]+)\),\s*'start of month'\)/g, "date(\$$1, 'start of month')");
  content = content.replace(/date\(date\(\$([0-9]+)\),\s*'start of month',\s*'\+1 month',\s*'-1 day'\)/g, "date(\$$1, 'start of month', '+1 month', '-1 day')");

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Refactored ${file}`);
});
console.log('Done refactoring');
