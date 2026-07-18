const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const backupService = require('../services/backupService');
const logger = require('../utils/logger');
const { logError, ERROR_SEVERITY, ERROR_CATEGORY } = require('../utils/enhancedErrorLogger');

router.use(authMiddleware);
router.use(requirePermission('manage_settings')); // Restrict to admin

// GET /api/backups
router.get('/', (req, res) => {
  try {
    const backups = backupService.getAvailableBackups();
    res.json({ success: true, data: backups });
  } catch (error) {
    logError({
      error, req,
      severity: ERROR_SEVERITY.HIGH, category: ERROR_CATEGORY.BACKUP,
      feature: 'backups-fetch',
      extra: { operation: 'fetch_backups' }
    });
    res.status(500).json({ success: false, message: 'Failed to fetch backups' });
  }
});

// POST /api/backups/create
router.post('/create', async (req, res) => {
  try {
    const backupPath = await backupService.createBackup();
    res.json({ success: true, message: 'Backup created successfully', data: { path: backupPath } });
  } catch (error) {
    logError({
      error, req,
      severity: ERROR_SEVERITY.CRITICAL, category: ERROR_CATEGORY.BACKUP,
      feature: 'backups-create',
      extra: { operation: 'create_backup' }
    });
    res.status(500).json({ success: false, message: 'Failed to create backup' });
  }
});

// GET /api/backups/download/:filename
router.get('/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security check to prevent path traversal
    if (filename.includes('/') || filename.includes('..')) {
      return res.status(400).json({ success: false, message: 'Invalid filename' });
    }

    const filePath = path.join(backupService.BACKUPS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Backup file not found' });
    }

    res.download(filePath, filename);
  } catch (error) {
    logError({
      error, req,
      severity: ERROR_SEVERITY.HIGH, category: ERROR_CATEGORY.BACKUP,
      feature: 'backups-download',
      extra: { filename: req.params.filename }
    });
    res.status(500).json({ success: false, message: 'Failed to download backup' });
  }
});

module.exports = router;
