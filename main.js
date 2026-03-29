const { app, BrowserWindow, ipcMain, dialog, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { getVideoFilesRecursive } = require('./fileUtils');
const { parseFileName, searchVideoType } = require('./videoSearch');
const { readResults, findInResults, addOrUpdateResult, getLastScanResults, findById } = require('./services/resultsService');
const { setMainWindow, emitScanProgress, resetScan, addLog } = require('./services/scanProgressService');
const { handleMatchedResult } = require('./handlers/resultHandler');
const { searchTVShowAndEpisode, normalizeTMDBResult, fetchVideos } = require('./services/tmdbService');
const { downloadTrailer, isDownloaded, getTrailerPath, getTrailerStatuses, deleteTrailer } = require('./utils/trailerDownloader');
const axios = require('axios');

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

const TMDB_API_KEY = process.env.TMDB_API_KEY || config.tmdbApiKey || '8eb4d790426d7a9f45d2f34bad852ec6'; // Replace this if needed

global.TMDB_API_KEY = TMDB_API_KEY;

process.env.TMDB_API_KEY = TMDB_API_KEY;

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
      webSecurity: false,
    },
  });

  // Set the main window reference in scanProgressService
  setMainWindow(mainWindow);

  // Load the index.html file from the correct location
  mainWindow.loadFile('src/renderer/dist/index.html');

  // Always open DevTools for debugging
  mainWindow.webContents.openDevTools();

  // Restore offline mode if it was on before restart
  mainWindow.webContents.on('did-finish-load', () => {
    if (config.settings?.offlineMode) {
      session.defaultSession.enableNetworkEmulation({ offline: true });
    }
  });

  // Allow F12 to toggle DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      event.preventDefault();
      mainWindow.webContents.toggleDevTools();
    }
  });
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
  return config.tmdbApiKey || process.env.TMDB_API_KEY || null;
});

ipcMain.handle('set-tmdb-api-key', (event, key) => {
  process.env.TMDB_API_KEY = key;
  global.TMDB_API_KEY = key;
  config.tmdbApiKey = key;
  saveConfig(config);
  console.log('TMDB API key set to:', key ? '***' + key.slice(-4) : 'undefined');
});

// Generic settings persistence
ipcMain.handle('get-settings', () => {
  return config.settings || {};
});

ipcMain.handle('save-settings', (event, settings) => {
  config.settings = { ...(config.settings || {}), ...settings };
  saveConfig(config);
  return { success: true };
});

ipcMain.handle('refresh-movie-data', async (event, identifier) => {
  try {
    const results = readResults();
    let existing = null;

    if (!identifier) {
      return { success: false, error: 'No identifier provided' };
    }

    existing = results.find(r =>
      String(r.filename) === String(identifier) ||
      String(r.final?.id) === String(identifier) ||
      String(r.fullApiData?.movie?.id) === String(identifier) ||
      String(r.fullApiData?.show?.id) === String(identifier)
    );

    if (!existing) {
      return { success: false, error: 'Result not found' };
    }

    const dirPath = existing.path ? path.dirname(existing.path) : path.resolve(__dirname, '../');
    let resultData = null;

    if (existing.final?.type === 'tv' || existing.type === 'tv' || existing.parsing?.isTV) {
      const tvId = existing.final?.id || existing.fullApiData?.show?.id;
      if (!tvId) {
        return { success: false, error: 'TV ID not found' };
      }

      const showDetailsRes = await axios.get(`https://api.themoviedb.org/3/tv/${tvId}?api_key=${process.env.TMDB_API_KEY}`);
      const showDetails = showDetailsRes.data;
      const creditsRes = await axios.get(`https://api.themoviedb.org/3/tv/${tvId}/credits?api_key=${process.env.TMDB_API_KEY}`);
      const credits = creditsRes.data;
      const episode = existing.parsing?.episode || existing.episode || existing.fullApiData?.episode?.episode_number;
      const season = existing.parsing?.season || existing.season || existing.fullApiData?.episode?.season_number;

      // Fetch videos for TV show
      let videos = [];
      try { videos = await fetchVideos(tvId, 'tv'); } catch (e) { videos = []; }
      let fullApiData = { show: showDetails, credits, videos };

      if (season && episode) {
        try {
          const epRes = await axios.get(`https://api.themoviedb.org/3/tv/${tvId}/season/${season}/episode/${episode}?api_key=${process.env.TMDB_API_KEY}`);
          fullApiData.episode = epRes.data;
        } catch (e) {
          fullApiData.episode = existing.fullApiData?.episode || null;
        }
      }

      const normalized = normalizeTMDBResult({ id: showDetails.id, media_type: 'tv', name: showDetails.name, first_air_date: showDetails.first_air_date, poster_path: showDetails.poster_path, overview: showDetails.overview, popularity: showDetails.popularity, vote_average: showDetails.vote_average, vote_count: showDetails.vote_count });

      const info = await handleMatchedResult(
        existing.filename || existing.original_name || 'unknown',
        normalized,
        (showDetails.first_air_date || '').slice(0, 4),
        dirPath,
        false,
        fullApiData,
        1,
        1,
        true
      );

      resultData = {
        ...existing,
        ...info,
        apiInfo: existing.apiInfo || []
      };

    } else {
      const movieId = existing.final?.id || existing.fullApiData?.movie?.id;
      if (!movieId) {
        return { success: false, error: 'Movie ID not found' };
      }

      const movieDetailsRes = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.TMDB_API_KEY}`);
      const movieDetails = movieDetailsRes.data;
      const creditsRes = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${process.env.TMDB_API_KEY}`);
      const credits = creditsRes.data;

      const normalized = normalizeTMDBResult({ id: movieDetails.id, media_type: 'movie', title: movieDetails.title, release_date: movieDetails.release_date, poster_path: movieDetails.poster_path, overview: movieDetails.overview, popularity: movieDetails.popularity, vote_average: movieDetails.vote_average, vote_count: movieDetails.vote_count });

      // Fetch videos for movie
      let videos = [];
      try { videos = await fetchVideos(movieId, 'movie'); } catch (e) { videos = []; }

      const info = await handleMatchedResult(
        existing.filename || existing.original_name || 'unknown',
        normalized,
        (movieDetails.release_date || '').slice(0, 4),
        dirPath,
        false,
        { movie: movieDetails, credits, videos },
        1,
        1,
        true
      );

      resultData = {
        ...existing,
        ...info,
        apiInfo: existing.apiInfo || []
      };
    }

    if (resultData) {
      addOrUpdateResult(resultData);
      event.sender.send('scan-complete');
      return { success: true, result: resultData };
    }

    event.sender.send('scan-complete');
    return { success: false, error: 'Unable to refresh data' };
  } catch (err) {
    console.error('refresh-movie-data error', err);
    event.sender.send('scan-complete');
    return { success: false, error: err.message || 'Refresh failed' };
  }
});

// Add this near your scan/parse logic (pseudo-code):
// emitScanProgress('parsing', filename);
// emitScanProgress('fetching-tmdb', filename);
// emitScanProgress('downloading-poster', filename);
// emitScanProgress('downloading-cast-image', filename, { personName });
// emitScanProgress('saving-result', filename);

// Integrate these emits at each step in your scan/parse/handleMatchedResult logic.

// Handle `scan-directory-stream` request for incremental results
ipcMain.on('scan-directory-stream', async (event, { dirPath, options = {} }) => {
  try {
    // Set the current sender for progress events
    const { setCurrentSender } = require('./services/scanProgressService');
    setCurrentSender(event.sender);
  if (!dirPath || typeof dirPath !== 'string' || !fs.existsSync(dirPath)) {
      emitScanProgress('error', '', { error: 'Invalid directory path' });
    event.sender.send('scan-complete');
    return;
  }

  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov'];
  const videoFiles = getVideoFilesRecursive(dirPath, videoExtensions);
  const existingResults = readResults();

    // Initialize scan state
    resetScan(videoFiles.length);
    addLog(`Found ${videoFiles.length} video files to process`);
    emitScanProgress('initializing', '', { totalFiles: videoFiles.length });

  for (let i = 0; i < videoFiles.length; i++) {
    const fullPath = videoFiles[i];
    const filename = path.basename(fullPath);
    const currentFileIndex = i + 1;

      try {
    // Progress: parsing
        emitScanProgress('parsing', filename, { currentFileIndex, totalFiles: videoFiles.length });

    // Check if result for this filename already exists
    const existing = existingResults.find(r => r.filename === filename);
    if (existing) {
          addLog(`Skipping ${filename} - already processed`);
          const progressEvent = {
            status: 'already-exists',
            currentFileIndex,
            totalFiles: videoFiles.length,
            filename
          };
          event.sender.send('scan-progress', progressEvent);
      continue;
    }

    // Progress: fetching-tmdb
        emitScanProgress('fetching-tmdb', filename, { currentFileIndex, totalFiles: videoFiles.length });
    const parsing = parseFileName(filename);
    let info = null;
    let error = null;
    let apiInfo = [];

      try {
        addLog(`Processing ${filename}`);
        info = await searchVideoType(filename, parsing, path.dirname(fullPath), (step, extra) => {
        // step: 'downloading-poster', 'downloading-cast-image', 'downloading-crew-image', etc.
            emitScanProgress(step, filename, { currentFileIndex, totalFiles: videoFiles.length, ...extra });
      }, options);
      if (info && info.apiInfo) {
        apiInfo = info.apiInfo;
      }
    } catch (e) {
      error = e.message || String(e);
          addLog(`Error processing ${filename}: ${error}`);
          emitScanProgress('error', filename, { currentFileIndex, totalFiles: videoFiles.length, error });
          console.error('Error processing file:', filename, e);
          continue; // Skip to next file on error
    }

    // Only save and send progress if there is a valid best match
    if (info && info.final) {
      // Progress: saving-result
          addLog(`Successfully processed ${filename} - ${info.final.title || 'Unknown'}`);
          emitScanProgress('saving-result', filename, { currentFileIndex, totalFiles: videoFiles.length });
          
      console.log(`[SCAN] File ${currentFileIndex}/${videoFiles.length}: Building result object`);
      const result = {
        path: fullPath,
        filename,
        parsing,
        ...info,
        error,
      };
      
      try {
        console.log(`[SCAN] File ${currentFileIndex}/${videoFiles.length}: Starting addOrUpdateResult for ${filename}`);
        addOrUpdateResult(result);
        console.log(`[SCAN] File ${currentFileIndex}/${videoFiles.length}: Completed addOrUpdateResult`);
        addLog(`Saved result for ${filename}`);
        
        // Send complete progress - only send essentials, NOT fullApiData
        const progressUpdate = { 
          status: 'done', 
          currentFileIndex, 
          totalFiles: videoFiles.length,
          filename: result.filename,
          title: result.final?.title || result.title || 'Unknown'
        };
        console.log(`[SCAN] File ${currentFileIndex}/${videoFiles.length}: Sending scan-progress event`);
        event.sender.send('scan-progress', progressUpdate);
        console.log(`[SCAN] File ${currentFileIndex}/${videoFiles.length}: Sent scan-progress event`);
      } catch (saveError) {
        console.error(`[SCAN] File ${currentFileIndex}/${videoFiles.length}: Error saving result: ${saveError.message}`);
        addLog(`Failed to save result for ${filename}: ${saveError.message}`);
        emitScanProgress('error', filename, { 
          currentFileIndex, 
          totalFiles: videoFiles.length,
          error: `Failed to save: ${saveError.message}` 
        });
      }
        } else {
          addLog(`No match found for ${filename}`);
          emitScanProgress('error', filename, { 
            currentFileIndex, 
            totalFiles: videoFiles.length,
            error: 'No valid match found' 
          });
        }
      } catch (e) {
        console.error(`[SCAN] File ${currentFileIndex}/${videoFiles.length}: Error processing file:`, filename, e);
        addLog(`Error processing ${filename}: ${e.message}`);
        emitScanProgress('error', filename, { 
          currentFileIndex, 
          totalFiles: videoFiles.length,
          error: e.message || String(e) 
        });
    }

    // Yield to event loop to keep UI responsive
    await new Promise(resolve => setTimeout(resolve, 0));
  }

    // Final progress update
    addLog(`Scan completed. Processed ${videoFiles.length} files.`);
    emitScanProgress('scan-complete', '', { currentFileIndex: videoFiles.length, totalFiles: videoFiles.length });
    event.sender.send('scan-complete');

    // Post-scan: batch download trailers (non-blocking, after all data is collected)
    if (options.autoDownloadTrailers) {
      try {
        const allResults = readResults();
        const trailerQueue = [];
        for (const result of allResults) {
          const videos = result.fullApiData?.videos || [];
          if (videos.length > 0) {
            const best = videos.find(v => v.type === 'Trailer' && v.official) || videos[0];
            if (best && best.key && !isDownloaded(best.key)) {
              trailerQueue.push({ key: best.key, title: result.final?.title || result.title || 'Unknown' });
            }
          }
        }
        if (trailerQueue.length > 0) {
          addLog(`Starting batch trailer download: ${trailerQueue.length} trailers`);
          const quality = options.trailerQuality || '1080';
          for (let t = 0; t < trailerQueue.length; t++) {
            const { key, title } = trailerQueue[t];
            try {
              addLog(`Downloading trailer ${t + 1}/${trailerQueue.length}: ${title}`);
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('trailer-download-progress', {
                  videoKey: key, percent: 0, batch: true,
                  current: t + 1, total: trailerQueue.length, title
                });
              }
              await downloadTrailer(key, (pct) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('trailer-download-progress', {
                    videoKey: key, percent: Math.round(pct), batch: true,
                    current: t + 1, total: trailerQueue.length, title
                  });
                }
              }, quality);
              addLog(`Trailer downloaded: ${title}`);
            } catch (err) {
              console.error(`[Main] Batch trailer download failed for ${key}: ${err.message}`);
              addLog(`Trailer download failed: ${title} - ${err.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, 0));
          }
          addLog(`Batch trailer download complete: ${trailerQueue.length} trailers`);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('trailer-batch-complete', { total: trailerQueue.length });
          }
        }
      } catch (e) {
        console.error('Batch trailer download error:', e);
        addLog(`Trailer batch failed: ${e.message}`);
      }
    }
  } catch (e) {
    console.error('Fatal scan error:', e);
    addLog(`Scan failed: ${e.message}`);
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

ipcMain.handle('read-person-data', async (event, personId) => {
  try {
    const personFilePath = path.join(__dirname, 'results', 'people', `${personId}.json`);
    if (fs.existsSync(personFilePath)) {
      const data = fs.readFileSync(personFilePath, 'utf-8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error reading person data:', error);
    return null;
  }
});

ipcMain.handle('clear-scan-results', async () => {
  try {
    const resultsDir = path.join(__dirname, 'results');
    const movieDir = path.join(resultsDir, 'movie');
    const tvDir = path.join(resultsDir, 'tv');
    let count = 0;
    for (const dir of [movieDir, tvDir]) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir, { recursive: true });
        for (const file of files) {
          const fp = path.join(dir, file);
          if (fs.statSync(fp).isFile()) { fs.unlinkSync(fp); count++; }
        }
      }
    }
    return { success: true, count };
  } catch (err) {
    console.error('Error clearing scan results:', err);
    return { success: false, error: err.message };
  }
});

// --- Storage Management APIs ---

function getDirSize(dirPath) {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      size += getDirSize(full);
    } else if (entry.isFile()) {
      try { size += fs.statSync(full).size; } catch {}
    }
  }
  return size;
}

function countFiles(dirPath, ext) {
  let count = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      count += countFiles(full, ext);
    } else if (entry.isFile() && (!ext || full.endsWith(ext))) {
      count++;
    }
  }
  return count;
}

function safeFileSize(filePath) {
  try { return filePath && fs.existsSync(filePath) ? fs.statSync(filePath).size : 0; } catch { return 0; }
}

ipcMain.handle('get-media-storage-list', async () => {
  try {
    const { readResults } = require('./services/resultsService');
    const peopleDir = path.join(__dirname, 'results', 'people');
    const allResults = readResults();
    const items = [];

    for (const r of allResults) {
      const title = r.final?.title || r.title || r.filename || 'Unknown';
      const year = r.final?.year || r.year || '';
      const type = r.final?.type || r.type || 'movie';
      const tmdbId = r.final?.id || r.id || '';
      const posterUrl = r.final?.poster || r.poster_path || null;

      // Movie file size
      const filePath = r.path || r.filePath;
      const fileSize = safeFileSize(filePath);

      // Poster & backdrop
      const poster = r.final?.poster || r.poster_path;
      const backdrop = r.final?.backdrop_path || r.backdrop_path;
      const posterSize = safeFileSize(poster);
      const backdropSize = safeFileSize(backdrop);

      // Cast images for this result
      const personIds = [...new Set([...(r.castIds || []), ...(r.crewIds || [])])];
      let castImgSize = 0;
      let castImgCount = 0;
      for (const pid of personIds) {
        const imgPath = path.join(peopleDir, `${pid}.jpg`);
        const s = safeFileSize(imgPath);
        if (s > 0) { castImgSize += s; castImgCount++; }
      }

      // Trailers
      const videos = r.fullApiData?.videos || [];
      let trailerSize = 0;
      let trailerCount = 0;
      for (const v of videos) {
        if (v.key && isDownloaded(v.key)) {
          trailerSize += safeFileSize(getTrailerPath(v.key));
          trailerCount++;
        }
      }

      const totalSize = fileSize + posterSize + backdropSize + castImgSize + trailerSize;

      items.push({
        title, year, type, tmdbId,
        posterUrl,
        filePath,
        fileSize,
        posterSize: posterSize + backdropSize,
        castImgSize, castImgCount,
        trailerSize, trailerCount,
        totalSize,
      });
    }

    // Sort by total size descending
    items.sort((a, b) => b.totalSize - a.totalSize);
    return { success: true, items };
  } catch (err) {
    console.error('get-media-storage-list error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-storage-info', async () => {
  try {
    const resultsDir = path.join(__dirname, 'results');
    const movieDir = path.join(resultsDir, 'movie');
    const tvDir = path.join(resultsDir, 'tv');
    const peopleDir = path.join(resultsDir, 'people');
    const { TRAILERS_DIR } = require('./utils/trailerDownloader');
    const { readResults } = require('./services/resultsService');

    // Cached metadata sizes
    const movieJsonSize = getDirSize(movieDir);
    const tvJsonSize = getDirSize(tvDir);
    const peopleSize = getDirSize(peopleDir);
    const trailersSize = getDirSize(TRAILERS_DIR);

    const movieCount = countFiles(movieDir, '.json');
    const tvCount = countFiles(tvDir, '.json');
    const peopleJsonCount = countFiles(peopleDir, '.json');
    const peopleImgCount = countFiles(peopleDir, '.jpg');
    const trailerCount = countFiles(TRAILERS_DIR, '.mp4');

    // Calculate actual media file sizes from scan results
    let movieFilesSize = 0;
    let movieFilesCount = 0;
    const allResults = readResults();
    for (const r of allResults) {
      const filePath = r.path || r.filePath;
      if (filePath && fs.existsSync(filePath)) {
        try { movieFilesSize += fs.statSync(filePath).size; movieFilesCount++; } catch {}
      }
    }

    // Poster directory
    const config = loadConfig();
    const savedDir = config.lastDir || null;
    let postersSize = 0;
    let postersCount = 0;
    if (savedDir) {
      const postersDir = path.join(savedDir, 'Posters');
      postersSize = getDirSize(postersDir);
      postersCount = countFiles(postersDir, '.jpg');
    }

    const downloadedTotal = peopleSize + trailersSize + postersSize;

    return {
      success: true,
      movieFiles: { size: movieFilesSize, count: movieFilesCount },
      cachedData: { size: movieJsonSize + tvJsonSize, movieCount, tvCount },
      people: { size: peopleSize, jsonCount: peopleJsonCount, imgCount: peopleImgCount },
      trailers: { size: trailersSize, count: trailerCount, path: TRAILERS_DIR },
      posters: { size: postersSize, count: postersCount, path: savedDir ? path.join(savedDir, 'Posters') : null },
      total: movieFilesSize + downloadedTotal + movieJsonSize + tvJsonSize,
      downloadedTotal,
    };
  } catch (err) {
    console.error('get-storage-info error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('clear-trailers', async () => {
  try {
    const { TRAILERS_DIR } = require('./utils/trailerDownloader');
    let count = 0;
    if (fs.existsSync(TRAILERS_DIR)) {
      for (const file of fs.readdirSync(TRAILERS_DIR)) {
        const fp = path.join(TRAILERS_DIR, file);
        if (fs.statSync(fp).isFile()) { fs.unlinkSync(fp); count++; }
      }
    }
    return { success: true, count };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('clear-people-data', async () => {
  try {
    const peopleDir = path.join(__dirname, 'results', 'people');
    let count = 0;
    if (fs.existsSync(peopleDir)) {
      for (const file of fs.readdirSync(peopleDir)) {
        const fp = path.join(peopleDir, file);
        if (fs.statSync(fp).isFile()) { fs.unlinkSync(fp); count++; }
      }
    }
    return { success: true, count };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('clear-posters', async () => {
  try {
    const config = loadConfig();
    const savedDir = config.lastDir || null;
    let count = 0;
    if (savedDir) {
      const postersDir = path.join(savedDir, 'Posters');
      if (fs.existsSync(postersDir)) {
        for (const file of fs.readdirSync(postersDir)) {
          const fp = path.join(postersDir, file);
          if (fs.statSync(fp).isFile()) { fs.unlinkSync(fp); count++; }
        }
      }
    }
    return { success: true, count };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-movie-data', async (event, { movieId }) => {
  try {
    const { deleteById, findById } = require('./services/resultsService');
    const result = findById(movieId);
    const deleted = { result: false, poster: false, backdrop: false, trailers: 0 };

    if (result) {
      // Delete poster and backdrop
      const poster = result.final?.poster;
      const backdrop = result.final?.backdrop_path;
      if (poster && fs.existsSync(poster)) { fs.unlinkSync(poster); deleted.poster = true; }
      if (backdrop && fs.existsSync(backdrop)) { fs.unlinkSync(backdrop); deleted.backdrop = true; }

      // Delete associated trailers
      const videos = result.fullApiData?.videos || [];
      for (const v of videos) {
        if (v.key && isDownloaded(v.key)) {
          deleteTrailer(v.key);
          deleted.trailers++;
        }
      }

      // Delete result JSON
      deleteById(movieId);
      deleted.result = true;
    }

    return { success: true, deleted };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-movie-storage', async (event, { movieId }) => {
  try {
    const { findById, getResultFilePath } = require('./services/resultsService');
    const result = findById(movieId);
    if (!result) return { success: false, error: 'Movie not found' };

    const items = [];

    // Movie file itself
    const moviePath = result.path || result.filePath;
    if (moviePath && fs.existsSync(moviePath)) {
      items.push({ type: 'movieFile', label: 'Movie File', path: moviePath, size: fs.statSync(moviePath).size, undeletable: true });
    }

    // Poster
    const poster = result.final?.poster || result.poster_path;
    if (poster && fs.existsSync(poster)) {
      items.push({ type: 'poster', label: 'Poster', path: poster, size: fs.statSync(poster).size });
    }
    // Backdrop
    const backdrop = result.final?.backdrop_path || result.backdrop_path;
    if (backdrop && fs.existsSync(backdrop)) {
      items.push({ type: 'backdrop', label: 'Backdrop', path: backdrop, size: fs.statSync(backdrop).size });
    }

    // Cast images
    const castIds = result.castIds || [];
    const crewIds = result.crewIds || [];
    const allPersonIds = [...new Set([...castIds, ...crewIds])];
    const peopleDir = path.join(__dirname, 'results', 'people');
    let castImgSize = 0;
    let castImgCount = 0;
    for (const pid of allPersonIds) {
      const imgPath = path.join(peopleDir, `${pid}.jpg`);
      if (fs.existsSync(imgPath)) {
        try { castImgSize += fs.statSync(imgPath).size; castImgCount++; } catch {}
      }
    }
    if (castImgCount > 0) {
      items.push({ type: 'castImages', label: `Cast Images (${castImgCount})`, size: castImgSize, undeletable: true });
    }

    // Trailers
    const videos = result.fullApiData?.videos || [];
    for (const v of videos) {
      if (v.key && isDownloaded(v.key)) {
        const tp = getTrailerPath(v.key);
        try {
          items.push({ type: 'trailer', label: `Trailer: ${v.name || v.key}`, path: tp, size: fs.statSync(tp).size, videoKey: v.key });
        } catch {}
      }
    }

    // Cached metadata JSON
    const resultPath = getResultFilePath(movieId);
    if (resultPath && fs.existsSync(resultPath)) {
      items.push({ type: 'result', label: 'Cached Metadata', path: resultPath, size: fs.statSync(resultPath).size });
    }

    const total = items.reduce((sum, i) => sum + i.size, 0);
    return { success: true, items, total };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-storage-item', async (event, { type, path: itemPath, videoKey }) => {
  try {
    if (type === 'trailer' && videoKey) {
      deleteTrailer(videoKey);
    } else if (itemPath && fs.existsSync(itemPath)) {
      fs.unlinkSync(itemPath);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Fetch all available posters/backdrops from TMDB for a movie/show
ipcMain.handle('get-tmdb-images', async (event, { tmdbId, mediaType }) => {
  try {
    if (!tmdbId) return { success: false, error: 'No TMDB ID provided' };
    const type = mediaType === 'tv' ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/${type}/${tmdbId}/images?api_key=${process.env.TMDB_API_KEY}`;
    const res = await axios.get(url);
    const data = res.data;
    const posters = (data.posters || []).map(p => ({
      filePath: p.file_path,
      width: p.width,
      height: p.height,
      voteAverage: p.vote_average,
      voteCount: p.vote_count,
      language: p.iso_639_1,
      thumbUrl: `https://image.tmdb.org/t/p/w185${p.file_path}`,
      fullUrl: `https://image.tmdb.org/t/p/w500${p.file_path}`,
      originalUrl: `https://image.tmdb.org/t/p/original${p.file_path}`,
    }));
    const backdrops = (data.backdrops || []).map(b => ({
      filePath: b.file_path,
      width: b.width,
      height: b.height,
      voteAverage: b.vote_average,
      voteCount: b.vote_count,
      language: b.iso_639_1,
      thumbUrl: `https://image.tmdb.org/t/p/w300${b.file_path}`,
      fullUrl: `https://image.tmdb.org/t/p/w780${b.file_path}`,
      originalUrl: `https://image.tmdb.org/t/p/original${b.file_path}`,
    }));
    return { success: true, posters, backdrops };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// List locally downloaded posters and backdrops for a movie (for offline browsing)
ipcMain.handle('get-local-images', async (event, { tmdbId }) => {
  try {
    const { findById } = require('./services/resultsService');
    const result = findById(tmdbId);
    if (!result) return { success: false, error: 'Movie not found' };

    const dirPath = result.path ? path.dirname(result.path) : null;
    if (!dirPath) return { success: true, posters: [], backdrops: [] };

    const postersDir = path.resolve(dirPath, 'Posters');
    const posters = [];
    const backdrops = [];

    if (fs.existsSync(postersDir)) {
      const files = fs.readdirSync(postersDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
      for (const file of files) {
        const fullPath = path.join(postersDir, file).replace(/\\/g, '/');
        let width = 0, height = 0;
        try {
          const stat = fs.statSync(path.join(postersDir, file));
          // basic size info
          width = stat.size;
        } catch {}
        const isBackdrop = /_backdrop\./i.test(file);
        const fileUrl = `file:///${fullPath}`;
        const entry = {
          filePath: fullPath,
          width: 0,
          height: 0,
          voteAverage: 0,
          voteCount: 0,
          language: null,
          thumbUrl: fileUrl,
          fullUrl: fileUrl,
          originalUrl: fileUrl,
          isLocal: true,
          fileName: file,
          fileSize: width, // reuse the stat size read above
        };
        if (isBackdrop) backdrops.push(entry);
        else posters.push(entry);
      }
    }

    // Also include the current poster/backdrop if they're not in the Posters dir
    const currentPoster = result.final?.poster || result.final?.poster_path;
    const currentBackdrop = result.final?.backdrop_path;
    const addIfMissing = (filePath, list) => {
      if (!filePath || !fs.existsSync(filePath)) return;
      const normalized = filePath.replace(/\\/g, '/');
      if (list.some(e => e.filePath === normalized)) return;
      const fileUrl = `file:///${normalized}`;
      let fileSize = 0;
      try { fileSize = fs.statSync(filePath).size; } catch {}
      list.unshift({
        filePath: normalized,
        width: 0, height: 0, voteAverage: 0, voteCount: 0, language: null,
        thumbUrl: fileUrl, fullUrl: fileUrl, originalUrl: fileUrl,
        isLocal: true, fileName: path.basename(filePath), fileSize,
      });
    };
    addIfMissing(currentPoster, posters);
    addIfMissing(currentBackdrop, backdrops);

    return { success: true, posters, backdrops };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Set a local image as the active poster or backdrop
ipcMain.handle('set-local-image', async (event, { tmdbId, localPath, imageType }) => {
  try {
    const { findById, getResultFilePath } = require('./services/resultsService');
    const result = findById(tmdbId);
    if (!result) return { success: false, error: 'Movie not found' };
    if (!localPath || !fs.existsSync(localPath)) return { success: false, error: 'File not found' };

    const normalized = localPath.replace(/\\/g, '/');
    const resultPath = getResultFilePath(tmdbId);
    if (resultPath && fs.existsSync(resultPath)) {
      const resultData = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
      if (imageType === 'backdrop') {
        resultData.backdrop_path = normalized;
        if (resultData.final) resultData.final.backdrop_path = normalized;
      } else {
        resultData.poster_path = normalized;
        if (resultData.final) {
          resultData.final.poster_path = normalized;
          resultData.final.poster = normalized;
        }
      }
      fs.writeFileSync(resultPath, JSON.stringify(resultData, null, 2));
    }
    return { success: true, localPath: normalized };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Download a chosen TMDB image to replace the current poster or backdrop
ipcMain.handle('download-tmdb-image', async (event, { tmdbId, imageUrl, imageType }) => {
  try {
    const { findById, getResultFilePath } = require('./services/resultsService');
    const result = findById(tmdbId);
    if (!result) return { success: false, error: 'Movie not found' };

    const dirPath = result.path ? path.dirname(result.path) : __dirname;
    const postersDir = path.resolve(dirPath, 'Posters');
    if (!fs.existsSync(postersDir)) fs.mkdirSync(postersDir, { recursive: true });

    const title = (result.final?.title || result.title || 'Unknown').replace(/[\\/:*?"<>|]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const year = result.final?.year || result.year || '';
    const suffix = imageType === 'backdrop' ? '_backdrop' : '';
    // Use a counter to keep multiple downloaded images (for offline browsing)
    let destPath = path.resolve(postersDir, `${title}_${year}${suffix}.jpg`);
    if (fs.existsSync(destPath)) {
      let counter = 2;
      while (fs.existsSync(path.resolve(postersDir, `${title}_${year}${suffix}_${counter}.jpg`))) counter++;
      destPath = path.resolve(postersDir, `${title}_${year}${suffix}_${counter}.jpg`);
    }

    // Download new image
    const response = await axios.get(imageUrl, { responseType: 'stream', timeout: 30000 });
    const writer = fs.createWriteStream(destPath);
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const localPath = destPath.replace(/\\/g, '/');

    // Update the result JSON to point to the new image
    const resultPath = getResultFilePath(tmdbId);
    if (resultPath && fs.existsSync(resultPath)) {
      const resultData = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
      if (imageType === 'backdrop') {
        resultData.backdrop_path = localPath;
        if (resultData.final) resultData.final.backdrop_path = localPath;
      } else {
        resultData.poster_path = localPath;
        if (resultData.final) {
          resultData.final.poster_path = localPath;
          resultData.final.poster = localPath;
        }
      }
      fs.writeFileSync(resultPath, JSON.stringify(resultData, null, 2));
    }

    return { success: true, localPath, size: fs.statSync(destPath).size };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
    configPath,
    resultsDir: path.join(__dirname, 'results'),
    logsDir: path.join(__dirname, 'logs'),
  };
});

ipcMain.handle('set-network-mode', async (event, { offline }) => {
  try {
    const ses = session.defaultSession;
    if (offline) {
      ses.enableNetworkEmulation({ offline: true });
    } else {
      ses.enableNetworkEmulation({ offline: false });
      ses.disableNetworkEmulation();
    }
    // Persist the setting so it survives restarts
    config.settings = { ...(config.settings || {}), offlineMode: offline };
    saveConfig(config);
    return { success: true, offline };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-network-status', () => {
  return { offline: !!(config.settings?.offlineMode) };
});

ipcMain.handle('open-path-in-explorer', async (event, targetPath) => {
  if (targetPath && fs.existsSync(targetPath)) {
    shell.showItemInFolder(targetPath);
    return true;
  }
  return false;
});

// Fetch trailers on-demand for a movie/show by TMDB ID
ipcMain.handle('get-trailers', async (event, { tmdbId, mediaType }) => {
  try {
    if (!tmdbId) return { success: false, error: 'No TMDB ID provided' };
    const videos = await fetchVideos(tmdbId, mediaType || 'movie');
    return { success: true, videos };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Download a trailer locally via yt-dlp
ipcMain.handle('download-trailer', async (event, { videoKey }) => {
  try {
    console.log(`[Main] download-trailer requested for key: ${videoKey}`);
    if (!videoKey || !/^[\w-]+$/.test(videoKey)) return { success: false, error: 'Invalid video key' };
    if (isDownloaded(videoKey)) {
      console.log(`[Main] Trailer already downloaded: ${videoKey}`);
      return { success: true, path: getTrailerPath(videoKey) };
    }
    const filePath = await downloadTrailer(videoKey, (pct) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('trailer-download-progress', { videoKey, percent: Math.round(pct) });
      }
    });
    console.log(`[Main] Trailer download complete: ${filePath}`);
    return { success: true, path: filePath };
  } catch (err) {
    console.error(`[Main] Trailer download failed for ${videoKey}: ${err.message}`);
    return { success: false, error: err.message };
  }
});

// Check download status for a list of trailer keys
ipcMain.handle('get-trailer-statuses', async (event, { videoKeys }) => {
  try {
    return { success: true, statuses: getTrailerStatuses(videoKeys || []) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Delete a downloaded trailer
ipcMain.handle('delete-trailer', async (event, { videoKey }) => {
  try {
    deleteTrailer(videoKey);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('write-debug-log', async (event, message) => {
  try {
    const debugLogPath = path.join(__dirname, 'logs', 'debug.log');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    // Ensure logs directory exists
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.appendFileSync(debugLogPath, logEntry, 'utf-8');
    console.log('[DEBUG LOG]', message);
    return true;
  } catch (error) {
    console.error('Error writing debug log:', error);
    return false;
  }
});
