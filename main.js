const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { getVideoFilesRecursive } = require('./fileUtils');
const { parseFileName, searchVideoType } = require('./videoSearch');
const { readResults, findInResults } = require('./services/resultsService');

const TMDB_API_KEY = '8eb4d790426d7a9f45d2f34bad852ec6'; // Replace this if needed

app.disableHardwareAcceleration();

let mainWindow;

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
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');
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

// Handle `scan-directory` request
ipcMain.handle('scan-directory', async (_, dirPath) => {
  if (!dirPath || !fs.existsSync(dirPath)) return [];

  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov'];
  const videoFiles = getVideoFilesRecursive(dirPath, videoExtensions);
  const results = [];
  let info;

  for (const fullPath of videoFiles) {
    const originalName=fullPath.split('/').pop();
      try {
  const existingResults = readResults();
  info = findInResults(originalName, existingResults);

} catch (error) {
   const filename = path.basename(fullPath); // Remove file extension
    const parsedFilename = parseFileName(filename); // Assuming this returns an object with extended titles

    // Use `searchVideoType` to fetch movie/TV show info
    info = await searchVideoType(originalName,parsedFilename,dirPath);
}



   

    results.push({
      path: fullPath,
      filename: info?.title || 'unknown', // Assuming `withoutYear` is parsed correctly
      type: info?.type || 'unknown',
      title: info?.title || 'unknown',
      release_date: info?.release_date || 'unknown',
      year_mismatch: info?.year_mismatch || false,
    });
  }

  return results;
});
