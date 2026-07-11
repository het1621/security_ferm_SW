const { query } = require('../../src/database/connection');

async function checkEmptyFields() {
  console.log('🔍 Scanning database for empty or NULL fields...');
  let emptyFieldsList = [];

  try {
    // Get all tables
    const tablesRes = await query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const tables = tablesRes.rows.map(t => t.name);

    for (const table of tables) {
      // Skip migrations or pure relation tables if any
      if (table === 'migrations' || table === 'error_logs' || table === 'audit_logs') continue;

      // Get columns for the table
      const pragma = await query(`PRAGMA table_info(${table})`);
      const columns = pragma.rows.map(c => c.name);

      for (const col of columns) {
        // Count total rows and rows where this column is NULL or empty string
        const check = await query(`
          SELECT 
            COUNT(*) as total, 
            SUM(CASE WHEN "${col}" IS NULL OR "${col}" = '' THEN 1 ELSE 0 END) as empty_count
          FROM "${table}"
        `);
        
        const total = check.rows[0].total;
        const emptyCount = check.rows[0].empty_count || 0;

        if (total > 0 && emptyCount > 0) {
          emptyFieldsList.push({
            table,
            column: col,
            emptyCount,
            total
          });
        }
      }
    }

    if (emptyFieldsList.length === 0) {
      console.log('✅ ALL fields across all tables are fully populated! No NULL or empty values found.');
    } else {
      console.log('⚠️ Found the following fields with missing data (NULL or empty):');
      emptyFieldsList.forEach(f => {
        console.log(`- ${f.table}.${f.column}: ${f.emptyCount} out of ${f.total} rows are empty.`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking fields:', error);
    process.exit(1);
  }
}

checkEmptyFields();
