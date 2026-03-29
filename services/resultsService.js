const fs = require('fs');
const path = require('path');
const { api: apiLogger, download: downloadLogger, result: resultLogger } = require('../logger.js');
const crypto = require('crypto');

const resultsDir = path.resolve(__dirname, '../results');

function normalizeFsPath(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') {
    return null;
  }

  return path.resolve(targetPath);
}

function getResultLibraryId(result) {
  const rawLibraryId = result?.library?.id;
  if (!rawLibraryId) {
    return 'global';
  }

  return String(rawLibraryId).replace(/[^a-zA-Z0-9_-]+/g, '_');
}

function resultMatchesLibrary(result, libraryId, libraryPath) {
  if (!libraryId && !libraryPath) {
    return true;
  }

  if (libraryId && result?.library?.id === libraryId) {
    return true;
  }

  const mediaPath = normalizeFsPath(result?.path || result?.filePath);
  const normalizedLibraryPath = normalizeFsPath(libraryPath);
  if (mediaPath && normalizedLibraryPath) {
    const mediaLower = mediaPath.toLowerCase();
    const libraryLower = normalizedLibraryPath.toLowerCase();
    return mediaLower === libraryLower || mediaLower.startsWith(`${libraryLower}${path.sep}`.toLowerCase());
  }

  return false;
}

function listResultFiles() {
  const files = [];
  const roots = [path.join(resultsDir, 'movie'), path.join(resultsDir, 'tv')];

  const walk = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
      return;
    }

    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  };

  roots.forEach(walk);
  return files;
}

function loadResultFromFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    return null;
  }
}

// Ensure results directory exists
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir);
}

// Generate a unique result ID using TMDB id and type, fallback to file path hash
function getResultId(result) {
  const libraryId = getResultLibraryId(result);
  if (result.final && result.final.id && result.final.type) {
    return `${result.final.type}_${result.final.id}_${libraryId}`;
  }
  if (result.id && result.type) {
    return `${result.type}_${result.id}_${libraryId}`;
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
    for (const filePath of listResultFiles()) {
      const fileName = path.basename(filePath);
      if (fileName.endsWith(`${resultOrId}.json`)) {
        return filePath;
      }

      const loaded = loadResultFromFile(filePath);
      if (!loaded) {
        continue;
      }

      const knownIds = [
        loaded.id,
        loaded.final?.id,
        loaded.fullApiData?.movie?.id,
        loaded.fullApiData?.show?.id,
        loaded.filename,
      ].map((value) => String(value)).filter(Boolean);

      if (knownIds.includes(resultOrId)) {
        return filePath;
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

  for (const filePath of listResultFiles()) {
    const loaded = loadResultFromFile(filePath);
    if (loaded) {
      allResults.push(loaded);
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

function findById(id, options = {}) {
  const { libraryId, libraryPath } = options;
  const filePath = getResultFilePath(id);
  if (filePath && fs.existsSync(filePath)) {
    const result = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (resultMatchesLibrary(result, libraryId, libraryPath)) {
      return result;
    }
  }

  return readResults().find((result) => {
    const knownIds = [
      result.id,
      result.final?.id,
      result.fullApiData?.movie?.id,
      result.fullApiData?.show?.id,
      result.filename,
    ].map((value) => String(value)).filter(Boolean);
    return knownIds.includes(String(id)) && resultMatchesLibrary(result, libraryId, libraryPath);
  }) || null;

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

function findInResults(parsedData, results, options = {}) {
  const { libraryId, libraryPath } = options;
  // Strict match: require cleanTitle and year to match exactly
  for (const result of results) {
    if (!resultMatchesLibrary(result, libraryId, libraryPath)) {
      continue;
    }

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
  const libraryArg = arguments[0];
  if (!libraryArg) {
    return readResults();
  }

  if (typeof libraryArg === 'string') {
    return readResults().filter((result) => resultMatchesLibrary(result, libraryArg, null));
  }

  return readResults().filter((result) => resultMatchesLibrary(result, libraryArg.id, libraryArg.path));
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
  getLastScanResults,
  resultMatchesLibrary
};