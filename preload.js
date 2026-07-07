const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Generate a PDF of the current page using Electron's native Chromium renderer
  printToPDF: (options) => ipcRenderer.invoke('print-to-pdf', options),
  // Save a buffer to disk with a Save As dialog
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  // Check if running in Electron
  isElectron: true,

  // ── Auto-Update APIs ──────────────────────────────────────────────
  // Listen for update status changes from main process
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (event, data) => callback(data));
  },
  // Remove update status listener
  removeUpdateListener: () => {
    ipcRenderer.removeAllListeners('update-status');
  },
  // Tell Electron to quit and install the downloaded update
  installUpdate: () => ipcRenderer.invoke('install-update'),
  // Manually trigger an update check
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  // Get the current app version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});
