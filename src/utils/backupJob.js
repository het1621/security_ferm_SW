const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Start the automated daily backup job.
 * Runs every day at 2:00 AM.
 * Keeps a rolling 7-day backup of the SQLite database.
 */
function startBackupJob() {
  cron.schedule('0 2 * * *', () => {
    logger.info('Starting automated daily database backup...');

    try {
      const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'database.sqlite');
      
      if (!fs.existsSync(dbPath)) {
        logger.warn('Database file not found, skipping backup.');
        return;
      }

      const backupDir = process.env.BACKUP_DIR || path.join(path.dirname(dbPath), 'auto-backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `database-${timestamp}.sqlite.backup`);

      // Using copyFileSync is safe for SQLite if WAL mode is enabled, 
      // but ideally we'd use the SQLite Backup API. Since better-sqlite3 
      // supports .backup(), we could use that if we had the connection, 
      // but a file copy is a reasonable baseline.
      fs.copyFileSync(dbPath, backupPath);
      logger.info(`✅ Database backed up successfully to: ${backupPath}`);

      // Clean up backups older than 7 days
      const files = fs.readdirSync(backupDir);
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

      let deletedCount = 0;
      files.forEach(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs < sevenDaysAgo && file.endsWith('.sqlite.backup')) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      });

      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} old backup(s).`);
      }

    } catch (error) {
      logger.error('Failed to run automated database backup:', error);
    }
  });

  logger.info('Automated daily backup job scheduled (Runs at 02:00 AM).');
}

module.exports = { startBackupJob };
