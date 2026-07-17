const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const logger = require('../utils/logger');
const { db } = require('../database/connection'); // To checkpoint WAL

const BACKUPS_DIR = path.join(process.cwd(), 'backups');

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

/**
 * Creates a zip backup of the SQLite database.
 * @returns {Promise<string>} The path to the created backup zip file.
 */
async function createBackup() {
  return new Promise((resolve, reject) => {
    try {
      const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'database.sqlite');
      const walPath = `${dbPath}-wal`;
      const shmPath = `${dbPath}-shm`;

      // Perform a WAL checkpoint to ensure all data is in the main database file before copying.
      // TRUNCATE: Checkpoints the database and truncates the WAL file to zero length.
      try {
        db.pragma('wal_checkpoint(TRUNCATE)');
      } catch (err) {
        logger.warn('Failed to checkpoint WAL before backup (this may be normal if no changes occurred):', err.message);
      }

      if (!fs.existsSync(dbPath)) {
        throw new Error(`Database file not found at ${dbPath}`);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `backup-${timestamp}.zip`;
      const backupPath = path.join(BACKUPS_DIR, backupFilename);

      const output = fs.createWriteStream(backupPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      output.on('close', () => {
        logger.info(`Backup created successfully: ${backupFilename} (${archive.pointer()} total bytes)`);
        cleanOldBackups();
        resolve(backupPath);
      });

      archive.on('error', (err) => {
        logger.error('Error during backup archiving:', err);
        reject(err);
      });

      archive.pipe(output);

      // Append files
      archive.file(dbPath, { name: 'database.sqlite' });
      if (fs.existsSync(walPath)) archive.file(walPath, { name: 'database.sqlite-wal' });
      if (fs.existsSync(shmPath)) archive.file(shmPath, { name: 'database.sqlite-shm' });

      archive.finalize();
    } catch (error) {
      logger.error('Failed to create backup:', error);
      reject(error);
    }
  });
}

/**
 * Cleans up old backups keeping only the last 30 days.
 */
function cleanOldBackups() {
  try {
    const files = fs.readdirSync(BACKUPS_DIR);
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    for (const file of files) {
      if (file.startsWith('backup-') && file.endsWith('.zip')) {
        const filePath = path.join(BACKUPS_DIR, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtimeMs > thirtyDaysMs) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
    }
    
    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} old backup(s).`);
    }
  } catch (error) {
    logger.error('Error cleaning old backups:', error);
  }
}

/**
 * Gets a list of available backups.
 */
function getAvailableBackups() {
  try {
    const files = fs.readdirSync(BACKUPS_DIR);
    const backups = files
      .filter(f => f.startsWith('backup-') && f.endsWith('.zip'))
      .map(f => {
        const stats = fs.statSync(path.join(BACKUPS_DIR, f));
        return {
          filename: f,
          sizeBytes: stats.size,
          createdAt: stats.mtime
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt); // Newest first
    return backups;
  } catch (error) {
    logger.error('Error listing backups:', error);
    return [];
  }
}

module.exports = {
  createBackup,
  cleanOldBackups,
  getAvailableBackups,
  BACKUPS_DIR
};
