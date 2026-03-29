const fs = require('fs');
const path = require('path');
const { api: apiLogger, download: downloadLogger, result: resultLogger } = require('../logger.js');
const crypto = require('crypto');

const resultsDir = path.resolve(__dirname, '../results');

// Ensure results directory exists
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir);
}

// Generate a unique result ID using TMDB id and type, fallback to file path hash
function getResultId(result) {
  if (result.final && result.final.id && result.final.type) {
    return `${result.final.type}_${result.final.id}`;
  }
  if (result.id && result.type) {
    return `${result.type}_${result.id}`;
  }
  // fallback: hash file path
  if (result.filePath || result.path) {
    const filePath = result.filePath || result.path;
    return 'file_' + crypto.createHash('md5').update(filePath).digest('hex');
  }
  return crypto.randomUUID();
}

// Helper to sanitize titles for filenames/paths
function sanitizeTitle(title) {
  return (title || 'Unknown')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 64);
}

function getResultSubdir(result) {
  const type = (result.final && result.final.type) || result.type || 'unknown';
  if (type === 'tv') {
    const showTitle = sanitizeTitle((result.final && result.final.title) || result.title || result.showTitle || 'UnknownShow');
    return path.join(resultsDir, 'tv', showTitle);
  } else if (type === 'movie') {
    return path.join(resultsDir, 'movie');
  }
  return resultsDir;
}

function getResultFilename(result) {
  const id = getResultId(result);
  const type = (result.final && result.final.type) || result.type || 'unknown';
  if (type === 'tv') {
    const season = result.season != null ? String(result.season).padStart(2, '0') : '00';
    const episode = result.episode != null ? String(result.episode).padStart(2, '0') : '00';
    return `S${season}E${episode}_${id}.json`;
  } else if (type === 'movie') {
    const title = sanitizeTitle((result.final && result.final.title) || result.title || 'UnknownMovie');
    const year = (result.final && result.final.year) || result.year || '0000';
    return `${title}_${year}_${id}.json`;
  }
  return `${id}.json`;
}

function getResultFilePath(resultOrId) {
  let result = resultOrId;
  if (typeof resultOrId === 'string' || typeof resultOrId === 'number') {
    resultOrId = String(resultOrId);
    // Try to find the file by id in all subdirs
    const subdirs = [path.join(resultsDir, 'tv'), path.join(resultsDir, 'movie')];
    for (const subdir of subdirs) {
      if (!fs.existsSync(subdir)) continue;
      const files = fs.readdirSync(subdir);
      for (const file of files) {
        if (file.endsWith(`${resultOrId}.json`)) {
          return path.join(subdir, file);
        }
      }
      // For TV, check show subdirs
      if (subdir.endsWith('/tv') || subdir.endsWith('\\tv')) {
        const shows = fs.readdirSync(subdir);
        for (const show of shows) {
          const showDir = path.join(subdir, show);
          if (!fs.existsSync(showDir) || !fs.statSync(showDir).isDirectory()) continue;
          const showFiles = fs.readdirSync(showDir);
          for (const file of showFiles) {
            if (file.endsWith(`${resultOrId}.json`)) {
              return path.join(showDir, file);
            }
          }
        }
      }
    }
    return null;
  }
  // result object
  const subdir = getResultSubdir(result);
  const filename = getResultFilename(result);
  return path.join(subdir, filename);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readResults() {
  const allResults = [];
  const movieDir = path.join(resultsDir, 'movie');
  const tvDir = path.join(resultsDir, 'tv');
  // Movies
  if (fs.existsSync(movieDir)) {
    for (const file of fs.readdirSync(movieDir)) {
      if (file.endsWith('.json')) {
        try {
          allResults.push(JSON.parse(fs.readFileSync(path.join(movieDir, file), 'utf-8')));
        } catch (e) {}
      }
    }
  }
  // TV
  if (fs.existsSync(tvDir)) {
    for (const show of fs.readdirSync(tvDir)) {
      const showDir = path.join(tvDir, show);
      if (!fs.statSync(showDir).isDirectory()) continue;
      for (const file of fs.readdirSync(showDir)) {
        if (file.endsWith('.json')) {
          try {
            allResults.push(JSON.parse(fs.readFileSync(path.join(showDir, file), 'utf-8')));
          } catch (e) {}
        }
      }
    }
    }
  return allResults;
}

function writeResult(result) {
  try {
    console.log('[writeResult] START - Getting result subdir');
    const subdir = getResultSubdir(result);
    console.log('[writeResult] Got subdir:', subdir);
    
    console.log('[writeResult] Ensuring directory exists');
    ensureDir(subdir);
    console.log('[writeResult] Directory ensured');
    
    console.log('[writeResult] Getting result file path');
    const filePath = getResultFilePath(result);
    console.log('[writeResult] Got file path:', filePath);
    
    const resultId = getResultId(result);
    console.log('[writeResult] Result ID:', resultId);
    
    // Prepare the data to write
    const dataToWrite = { ...result, id: resultId };
    const jsonString = JSON.stringify(dataToWrite, null, 2);
    console.log(`[writeResult] JSON size: ${jsonString.length} bytes`);
    
    console.log('[writeResult] Writing to file:', filePath);
    fs.writeFileSync(filePath, jsonString);
    console.log('[writeResult] SUCCESS - File written');
    
    return resultId;
  } catch (error) {
    console.error('[writeResult] FAILED:', error);
    throw error;
  }
}

function addOrUpdateResult(newResult) {
  try {
    console.log('[addOrUpdateResult] START - Adding/updating result');
    newResult.id = getResultId(newResult);
    console.log('[addOrUpdateResult] Result ID:', newResult.id);
    
    console.log('[addOrUpdateResult] Calling writeResult');
    const id = writeResult(newResult);
    console.log('[addOrUpdateResult] SUCCESS - Result saved with ID:', id);
    
    return id;
  } catch (error) {
    console.error('[addOrUpdateResult] FAILED:', error);
    throw error;
  }
}

function findById(id) {
  const filePath = getResultFilePath(id);
  if (filePath && fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return null;
}

function updateById(id, update) {
  const filePath = getResultFilePath(id);
  if (filePath && fs.existsSync(filePath)) {
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const updated = { ...existing, ...update };
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
    return true;
  }
    return false;
  }

function deleteById(id) {
  const filePath = getResultFilePath(id);
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

function findInResults(parsedData, results) {
  // Strict match: require cleanTitle and year to match exactly
  for (const result of results) {
    // Prefer final.cleanTitle/year if present, else fallback
    const resultCleanTitle = (result.final && result.final.cleanTitle) || result.cleanTitle || result.title || result.name || '';
    const resultYear = (result.final && result.final.year) || result.year || (result.release_date || result.first_air_date || '').slice(0, 4);
    // Optionally, match movieNumber if present in both
    const parsedMovieNumber = parsedData.movieNumber ? String(parsedData.movieNumber) : null;
    const resultMovieNumber = (result.final && result.final.movieNumber) ? String(result.final.movieNumber) : (result.movieNumber ? String(result.movieNumber) : null);
    if (
      resultCleanTitle === parsedData.cleanTitle &&
      resultYear === parsedData.year &&
      (
        !parsedMovieNumber || !resultMovieNumber || parsedMovieNumber === resultMovieNumber
      )
    ) {
      return result;
    }
  }
  return null;
}

function getLastScanResults() {
  return readResults();
}

module.exports = {
  readResults,
  addOrUpdateResult,
  getResultId,
  getResultFilePath,
  findById,
  updateById,
  deleteById,
  findInResults,
  writeResult,
  getLastScanResults
};