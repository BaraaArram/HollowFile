const { BrowserWindow } = require('electron');

// Singleton instance to store the main window reference
let mainWindow = null;

// Store the current sender for progress events
let currentSender = null;

// Track current scan state
let currentScan = {
  totalFiles: 0,
  currentFileIndex: 0,
  status: '',
  filename: '',
  personName: '',
  errors: [],
  logs: []
};

// Set the main window reference
function setMainWindow(window) {
  mainWindow = window;
}

// Function to set the current sender for progress events
function setCurrentSender(sender) {
  currentSender = sender;
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
    logs: []
  };
}

// Add error to current scan
function addError(error) {
  if (currentScan.errors.length >= 100) return; // Limit stored errors
  currentScan.errors.push(error);
}

// Add log message to current scan
function addLog(message) {
  if (currentScan.logs.length >= 100) currentScan.logs.shift(); // Keep last 100 logs
  currentScan.logs.push({ timestamp: new Date().toISOString(), message });
}

// Emit scan progress to the renderer
function emitScanProgress(status, filename, extra = {}) {
  try {
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
      logs: [...currentScan.logs],
      ...extra, // Spread extra after setting core values
    };

    // Ensure critical values are numbers
    progress.currentFileIndex = Number(progress.currentFileIndex) || 0;
    progress.totalFiles = Number(progress.totalFiles) || 0;

    console.log(`[emitScanProgress] Status: ${status}, File: ${filename}, Progress: ${progress.currentFileIndex}/${progress.totalFiles}`);
    
    try {
      if (currentSender) {
        currentSender.send('scan-progress', progress);
      } else if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('scan-progress', progress);
      } else {
        console.log('[emitScanProgress] No sender or mainWindow available');
      }
    } catch (sendError) {
      console.error('[emitScanProgress] Error sending event:', sendError.message);
    }
  } catch (error) {
    console.error('[emitScanProgress] Fatal error:', error.message);
  }
}

// Get current scan state
function getCurrentScan() {
  return { ...currentScan };
}

module.exports = {
  setMainWindow,
  setCurrentSender,
  emitScanProgress,
  resetScan,
  getCurrentScan,
  addLog
}; 