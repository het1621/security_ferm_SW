const cron = require('node-cron');
const logger = require('./logger');
const backupService = require('../services/backupService');

/**
 * Start the automated daily backup job.
 * Runs every day at 2:00 AM.
 * Keeps a rolling 30-day zip backup of the SQLite database.
 */
function startBackupJob() {
  cron.schedule('0 2 * * *', async () => {
    logger.info('Starting automated daily database backup...');
    try {
      await backupService.createBackup();
    } catch (error) {
      logger.error('Failed to run automated database backup:', error);
    }
  });

  logger.info('Automated daily backup job scheduled (Runs at 02:00 AM).');
}

module.exports = { startBackupJob };
