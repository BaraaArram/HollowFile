const { BrowserWindow } = require('electron');

// Singleton instance to store the main window reference
let mainWindow = null;

// Track current scan state
let currentScan = {
  totalFiles: 0,
  currentFileIndex: 0,
  status: '',
  filename: '',
  personName: '',
  errors: [],
};

// Set the main window reference
function setMainWindow(window) {
  mainWindow = window;
}

// Reset scan state
function resetScan(totalFiles = 0) {
  currentScan = {
    totalFiles,
    currentFileIndex: 0,
    status: '',
    filename: '',
    personName: '',
    errors: [],
  };
}

// Add error to current scan
function addError(error) {
  if (currentScan.errors.length >= 100) return; // Limit stored errors
  currentScan.errors.push(error);
}

// Emit scan progress to the renderer
function emitScanProgress(status, filename, extra = {}) {
  if (!mainWindow || !mainWindow.webContents) return;

  // Update current scan state
  currentScan.status = status;
  currentScan.filename = filename;
  if (extra.personName) currentScan.personName = extra.personName;
  if (extra.currentFileIndex) currentScan.currentFileIndex = extra.currentFileIndex;
  if (extra.totalFiles) currentScan.totalFiles = extra.totalFiles;
  if (extra.error) addError(extra.error);

  // Send progress update
  const progress = {
    ...currentScan,
    ...extra,
    status,
    filename,
  };

  console.log('[emitScanProgress]', progress); // Debug log
  mainWindow.webContents.send('scan-progress', progress);
}

// Get current scan state
function getCurrentScan() {
  return { ...currentScan };
}

module.exports = {
  setMainWindow,
  emitScanProgress,
  resetScan,
  getCurrentScan,
}; 