const { app, BrowserWindow, session, shell, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure userData directory exists for the database and uploads
const userDataPath = app.getPath('userData');
process.env.DB_PATH = path.join(userDataPath, 'database.sqlite');
process.env.UPLOAD_DIR = path.join(userDataPath, 'uploads');
process.env.LOG_DIR = path.join(userDataPath, 'logs');
process.env.NODE_ENV = 'production';
process.env.PORT = '5000';

// Generate or load a local JWT secret for the packaged app
const secretPath = path.join(userDataPath, 'secret.key');
if (!fs.existsSync(secretPath)) {
  let shouldGenerate = true;
  // If the database already exists but secret.key is missing, warn the admin
  if (fs.existsSync(process.env.DB_PATH)) {
    const choice = dialog.showMessageBoxSync({
      type: 'warning',
      buttons: ['Generate New Secret', 'Cancel and Exit'],
      title: 'Security Key Missing',
      message: 'The JWT secret.key file is missing, but a database exists.',
      detail: 'Generating a new secret will immediately log out all existing users and invalidate all current sessions. Do you want to proceed?',
      defaultId: 1,
      cancelId: 1
    });
    if (choice === 1) {
      console.error('App launch aborted to prevent JWT invalidation.');
      app.exit(1);
    }
  }
  
  if (shouldGenerate) {
    const generatedSecret = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(secretPath, generatedSecret, 'utf8');
  }
}
process.env.JWT_SECRET = fs.readFileSync(secretPath, 'utf8').trim();

// Set remaining env vars that index.js / routes expect
// These are defaults — SMTP settings are also loaded from system_settings DB table at runtime
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '12';
process.env.INVOICE_DUE_DAYS = process.env.INVOICE_DUE_DAYS || '30';
process.env.FRONTEND_URL = `http://localhost:${process.env.PORT}`; // In Electron, frontend is served by Express

let mainWindow;

// ── Auto-Updater Configuration ──────────────────────────────────────
autoUpdater.autoDownload = true;         // Download updates silently in the background
autoUpdater.autoInstallOnAppQuit = true;  // Install when the user closes the app

// Log auto-updater events for debugging
autoUpdater.logger = require('electron').app.isPackaged ? null : console;

function setupAutoUpdater() {
  // Check for updates silently (no error dialog if offline)
  autoUpdater.checkForUpdates().catch((err) => {
    console.log('Auto-update check skipped (possibly offline):', err.message);
  });

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus('checking', 'Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus('available', `Update v${info.version} found. Downloading...`);
  });

  autoUpdater.on('update-not-available', () => {
    sendUpdateStatus('not-available', 'You are on the latest version.');
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus('downloading', `Downloading update: ${Math.round(progress.percent)}%`, {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus('downloaded', `Update v${info.version} is ready. Restart to install.`, {
      version: info.version
    });
  });

  autoUpdater.on('error', (err) => {
    // Don't show errors to users — just log silently. 
    // Common case: client PC is offline, which is normal.
    console.log('Auto-updater error:', err.message);
  });
}

function sendUpdateStatus(status, message, data = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status, message, ...data });
  }
}

// ── IPC: Frontend can request to install the downloaded update ───────
ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true); // isSilent=false, isForceRunAfter=true
});

// ── IPC: Frontend can manually trigger an update check ──────────────
ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, version: result?.updateInfo?.version };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: Get current app version ────────────────────────────────────
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'build', 'icon.png'),
  });

  // Start the internal Express server
  try {
    require('./src/index.js');
    console.log('Express server loaded successfully inside Electron.');
  } catch (err) {
    fs.writeFileSync(path.join(app.getPath('desktop'), 'electron-debug-log.txt'), 'Failed to load Express server: ' + err.stack);
    console.error('Failed to load Express server:', err);
  }

  // ── Handle file downloads (PDF, Excel, etc.) ──────────────────────
  session.defaultSession.on('will-download', (event, item, webContents) => {
    const fileName = item.getFilename();
    console.log(`Download started: ${fileName}`);

    item.once('done', (event, state) => {
      if (state === 'completed') {
        console.log(`Download completed: ${fileName}`);
      } else {
        console.log(`Download failed: ${state}`);
      }
    });
  });

  // ── Handle window.open() calls (download links, external URLs) ────
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('localhost') && (url.includes('/api/') || url.includes('export'))) {
      mainWindow.webContents.downloadURL(url);
      return { action: 'deny' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load the frontend immediately from the local filesystem
  mainWindow.loadFile(path.join(__dirname, 'frontend-dist', 'index.html'));

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// ── IPC: Print current page to PDF using Chromium's native renderer ──
ipcMain.handle('print-to-pdf', async (event, options = {}) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) throw new Error('Window not found');

    const pdfBuffer = await win.webContents.printToPDF({
      landscape: options.landscape !== false,
      printBackground: true,
      pageSize: 'A4',
      margins: {
        marginType: 'custom',
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4
      },
      ...options
    });

    return { success: true, buffer: pdfBuffer.toString('base64') };
  } catch (err) {
    console.error('printToPDF error:', err);
    return { success: false, error: err.message };
  }
});

// ── IPC: Save a base64 buffer to disk with Save As dialog ───────────
ipcMain.handle('save-file', async (event, { buffer, defaultName, filters }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: path.join(app.getPath('downloads'), defaultName || 'document.pdf'),
      filters: filters || [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (result.canceled) return { success: false, canceled: true };

    const fileBuffer = Buffer.from(buffer, 'base64');
    fs.writeFileSync(result.filePath, fileBuffer);
    return { success: true, filePath: result.filePath };
  } catch (err) {
    console.error('saveFile error:', err);
    return { success: false, error: err.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  // Start checking for updates after the window is ready (with a short delay)
  setTimeout(() => {
    setupAutoUpdater();
  }, 3000); // Wait 3 seconds after launch so the app loads first

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
