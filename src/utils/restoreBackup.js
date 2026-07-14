const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Utility script to manually restore the database from an automated backup.
 * Run via: node src/utils/restoreBackup.js <backup_filename>
 */

const backupFileName = process.argv[2];
if (!backupFileName) {
  console.error("❌ Please provide the backup filename.");
  console.error("Usage: node src/utils/restoreBackup.js database-2026-07-14T02-00-00.sqlite.backup");
  process.exit(1);
}

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'database.sqlite');
const backupDir = process.env.BACKUP_DIR || path.join(path.dirname(dbPath), 'auto-backups');
const backupPath = path.join(backupDir, backupFileName);

if (!fs.existsSync(backupPath)) {
  console.error(`❌ Backup file not found: ${backupPath}`);
  process.exit(1);
}

try {
  // Safety check: Take a snapshot of current broken DB before overwriting
  if (fs.existsSync(dbPath)) {
    const preRestoreSnapshot = `${dbPath}.pre-restore-${Date.now()}`;
    fs.copyFileSync(dbPath, preRestoreSnapshot);
    console.log(`📦 Saved current database state to ${preRestoreSnapshot} just in case.`);
  }

  // Restore the backup
  fs.copyFileSync(backupPath, dbPath);
  console.log(`✅ Successfully restored database from ${backupFileName}!`);
  
  // Cleanup WAL/SHM files to ensure clean start
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  
} catch (error) {
  console.error('❌ Failed to restore backup:', error);
  process.exit(1);
}
