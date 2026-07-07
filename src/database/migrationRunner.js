/**
 * src/database/migrationRunner.js
 * 
 * Automatic Database Migration System
 * 
 * On every app startup, this runner:
 * 1. Checks the current schema version stored in system_settings
 * 2. Scans the migrations/ folder for numbered .sql files
 * 3. Runs any migration files with a number greater than the current version
 * 4. Updates the schema version after each successful migration
 * 
 * Migration files must be named: 001_description.sql, 002_description.sql, etc.
 * Each migration runs inside a transaction — if it fails, it rolls back cleanly.
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Run all pending database migrations.
 * @param {import('better-sqlite3').Database} db - The SQLite database instance
 */
function runMigrations(db) {
  // Ensure system_settings table exists (it might not on very old installs)
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key VARCHAR(50) PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get current schema version
  let currentVersion = 0;
  try {
    const row = db.prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'schema_version'").get();
    if (row) {
      currentVersion = parseInt(row.setting_value) || 0;
    }
  } catch (err) {
    // Table might not have the row yet — that's fine, we start from 0
    console.log('No schema_version found, starting from 0');
  }

  // Scan migrations directory
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('No migrations directory found — skipping migrations.');
    return;
  }

  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort() // Ensures 001, 002, 003 order
    .map(f => {
      const match = f.match(/^(\d+)_/);
      return {
        filename: f,
        version: match ? parseInt(match[1]) : 0,
        path: path.join(MIGRATIONS_DIR, f)
      };
    })
    .filter(m => m.version > currentVersion);

  if (migrationFiles.length === 0) {
    console.log(`📦 Database schema is up to date (version ${currentVersion}).`);
    return;
  }

  console.log(`\n📦 Running ${migrationFiles.length} pending migration(s)...`);

  for (const migration of migrationFiles) {
    console.log(`   ⬆ Running migration ${migration.filename}...`);

    const sql = fs.readFileSync(migration.path, 'utf8');

    try {
      // Run the entire migration in a transaction for safety
      db.exec('BEGIN TRANSACTION');
      db.exec(sql);

      // Update schema version
      db.prepare(`
        INSERT INTO system_settings (setting_key, setting_value, updated_at) 
        VALUES ('schema_version', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?, updated_at = CURRENT_TIMESTAMP
      `).run(String(migration.version), String(migration.version));

      db.exec('COMMIT');
      console.log(`   ✅ Migration ${migration.filename} applied successfully.`);
    } catch (err) {
      // Roll back on failure — the database stays at the previous version
      try { db.exec('ROLLBACK'); } catch (rbErr) { /* ignore */ }
      console.error(`   ❌ Migration ${migration.filename} FAILED:`, err.message);
      console.error(`   ⚠ Database remains at version ${currentVersion}. Fix the migration and restart.`);
      // Don't continue with subsequent migrations if one fails
      break;
    }
  }

  // Log final version
  try {
    const finalRow = db.prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'schema_version'").get();
    console.log(`📦 Database schema is now at version ${finalRow ? finalRow.setting_value : currentVersion}.\n`);
  } catch (e) { /* ignore */ }
}

module.exports = { runMigrations };
