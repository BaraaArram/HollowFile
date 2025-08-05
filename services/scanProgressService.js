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
  if (!mainWindow || !mainWindow.webContents) {
    console.log('[emitScanProgress] No mainWindow or webContents available');
    return;
  }

  // Update current scan state
  currentScan.status = status;
  currentScan.filename = filename;
  
  // Safely update values, ensuring numbers are numbers
  if (extra.personName) currentScan.personName = extra.personName;
  if (extra.currentFileIndex !== undefined) {
    currentScan.currentFileIndex = Number(extra.currentFileIndex) || 0;
  }
  if (extra.totalFiles !== undefined) {
    currentScan.totalFiles = Number(extra.totalFiles) || 0;
  }
  if (extra.error) addError(extra.error);

  // Create progress object with proper types
  const progress = {
    totalFiles: currentScan.totalFiles,
    currentFileIndex: currentScan.currentFileIndex,
    status: currentScan.status,
    filename: currentScan.filename,
    personName: currentScan.personName,
    errors: [...currentScan.errors],
    ...extra, // Spread extra after setting core values
  };

  // Ensure critical values are numbers
  progress.currentFileIndex = Number(progress.currentFileIndex) || 0;
  progress.totalFiles = Number(progress.totalFiles) || 0;

  console.log('[emitScanProgress] Sending to renderer:', progress);
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