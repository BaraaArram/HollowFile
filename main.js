const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { getVideoFilesRecursive } = require('./fileUtils');
const { parseFileName, searchVideoType } = require('./videoSearch');
const { readResults, findInResults, addOrUpdateResult, getLastScanResults } = require('./services/resultsService');
const { setMainWindow, emitScanProgress, resetScan } = require('./services/scanProgressService');

const TMDB_API_KEY = '8eb4d790426d7a9f45d2f34bad852ec6'; // Replace this if needed

app.disableHardwareAcceleration();

let mainWindow = null;

// Path to store user config
const configPath = path.join(app.getPath('userData'), 'config.json');

// Load config from file
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }
  return {};
}

// Save config to file
function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

const config = loadConfig();

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('PRELOAD PATH:', preloadPath);
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Set the main window reference in scanProgressService
  setMainWindow(mainWindow);

  // Load the index.html file from the correct location
  mainWindow.loadFile('src/renderer/dist/index.html');

  // Open the DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Handle `select-directory` request
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const selectedPath = result.filePaths[0];
  config.lastDirPath = selectedPath;
  saveConfig(config);

  return selectedPath;
});

// Handle `get-saved-dir` request
ipcMain.handle('get-saved-dir', () => {
  return config.lastDirPath || null;
});

// Expose TMDB API key for debugging (do not use in production)
ipcMain.handle('get-tmdb-api-key', () => {
  return process.env.TMDB_API_KEY || null;
});

// Add this near your scan/parse logic (pseudo-code):
// emitScanProgress('parsing', filename);
// emitScanProgress('fetching-tmdb', filename);
// emitScanProgress('downloading-poster', filename);
// emitScanProgress('downloading-cast-image', filename, { personName });
// emitScanProgress('saving-result', filename);

// Integrate these emits at each step in your scan/parse/handleMatchedResult logic.

// Handle `scan-directory-stream` request for incremental results
ipcMain.on('scan-directory-stream', async (event, dirPath) => {
  try {
  if (!dirPath || !fs.existsSync(dirPath)) {
      emitScanProgress('error', '', { error: 'Invalid directory path' });
    event.sender.send('scan-complete');
    return;
  }

  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov'];
  const videoFiles = getVideoFilesRecursive(dirPath, videoExtensions);
  const existingResults = readResults();

    // Initialize scan state
    resetScan(videoFiles.length);
    emitScanProgress('initializing', '', { totalFiles: videoFiles.length });

  for (let i = 0; i < videoFiles.length; i++) {
    const fullPath = videoFiles[i];
    const filename = path.basename(fullPath);
    const currentFileIndex = i + 1;

      try {
    // Progress: parsing
        emitScanProgress('parsing', filename, { currentFileIndex });

    // Check if result for this filename already exists
    const existing = existingResults.find(r => r.filename === filename);
    if (existing) {
          event.sender.send('scan-progress', { ...existing, status: 'already-exists', currentFileIndex });
      continue;
    }

    // Progress: fetching-tmdb
        emitScanProgress('fetching-tmdb', filename, { currentFileIndex });
    const parsing = parseFileName(filename);
    let info = null;
    let error = null;
    let apiInfo = [];

    try {
      info = await searchVideoType(filename, parsing, path.dirname(fullPath), (step, extra) => {
        // step: 'downloading-poster', 'downloading-cast-image', 'downloading-crew-image', etc.
            emitScanProgress(step, filename, { currentFileIndex, ...extra });
      });
      if (info && info.apiInfo) {
        apiInfo = info.apiInfo;
      }
    } catch (e) {
      error = e.message || String(e);
          emitScanProgress('error', filename, { currentFileIndex, error });
          console.error('Error processing file:', filename, e);
          continue; // Skip to next file on error
    }

    // Only save and send progress if there is a valid best match
    if (info && info.final) {
      // Progress: saving-result
          emitScanProgress('saving-result', filename, { currentFileIndex });
    const result = {
      path: fullPath,
      filename,
      parsing,
        ...info, // Spread all properties from info, including apiInfo and final
      error,
    };
    addOrUpdateResult(result);
          event.sender.send('scan-progress', { ...result, status: 'done', currentFileIndex });
        } else {
          emitScanProgress('error', filename, { 
            currentFileIndex, 
            error: 'No valid match found' 
          });
        }
      } catch (e) {
        console.error('Error processing file:', filename, e);
        emitScanProgress('error', filename, { 
          currentFileIndex, 
          error: e.message || String(e) 
        });
    }

    // Yield to event loop to keep UI responsive
    await new Promise(resolve => setTimeout(resolve, 0));
  }

    // Final progress update
    emitScanProgress('scan-complete', '', { currentFileIndex: videoFiles.length });
    event.sender.send('scan-complete');
  } catch (e) {
    console.error('Fatal scan error:', e);
    emitScanProgress('error', '', { 
      error: 'Fatal scan error: ' + (e.message || String(e)) 
    });
  event.sender.send('scan-complete');
  }
});

ipcMain.handle('get-last-scan-results', () => {
  return getLastScanResults();
});

ipcMain.handle('open-file', async (event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    await shell.openPath(filePath);
    return true;
  }
  return false;
});
