const { emitScanProgress } = require('../services/scanProgressService');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const apiLogger = require('../utils/logger').apiLogger;
const resultLogger = require('../utils/logger').resultLogger;

// Replace characters illegal in Windows filenames: \ / : * ? " < > |
function sanitizeForFilename(name) {
  return (name || 'Unknown').replace(/[\\/:*?"<>|]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function getLocalizedEntryFieldFlags(localizedEntry) {
  return {
    title: isNonEmptyString(localizedEntry?.movie?.title)
      || isNonEmptyString(localizedEntry?.show?.name)
      || isNonEmptyString(localizedEntry?.episode?.name),
    overview: isNonEmptyString(localizedEntry?.movie?.overview)
      || isNonEmptyString(localizedEntry?.show?.overview)
      || isNonEmptyString(localizedEntry?.episode?.overview),
  };
}

function buildLocalizedStatus(fullApiData, localizedApiData) {
  const statusByLocale = {};
  const checks = fullApiData?.localizationChecks || {};

  Object.entries(checks).forEach(([localeCode, resourceChecks]) => {
    const resources = {
      movie: resourceChecks?.movie || { checked: false, found: false },
      show: resourceChecks?.show || { checked: false, found: false },
      episode: resourceChecks?.episode || { checked: false, found: false },
    };

    const checked = Object.values(resources).some((resource) => resource?.checked);
    const found = Object.values(resources).some((resource) => resource?.found);
    const titleFound = Object.values(resources).some((resource) => resource?.fields?.title);
    const overviewFound = Object.values(resources).some((resource) => resource?.fields?.overview);
    const checkedAt = Object.values(resources)
      .map((resource) => resource?.checkedAt)
      .find(Boolean) || new Date().toISOString();

    statusByLocale[localeCode] = {
      checked,
      found,
      titleFound,
      overviewFound,
      checkedAt,
      resources,
    };
  });

  // Backward compatibility: old results may have localized payloads without status metadata.
  Object.entries(localizedApiData || {}).forEach(([localeCode, localizedEntry]) => {
    if (!statusByLocale[localeCode]) {
      const fieldFlags = getLocalizedEntryFieldFlags(localizedEntry);
      statusByLocale[localeCode] = {
        checked: true,
        found: fieldFlags.title || fieldFlags.overview,
        titleFound: fieldFlags.title,
        overviewFound: fieldFlags.overview,
        checkedAt: new Date().toISOString(),
        resources: {
          movie: { checked: !!localizedEntry?.movie, found: !!localizedEntry?.movie, fields: { title: isNonEmptyString(localizedEntry?.movie?.title), overview: isNonEmptyString(localizedEntry?.movie?.overview) } },
          show: { checked: !!localizedEntry?.show, found: !!localizedEntry?.show, fields: { title: isNonEmptyString(localizedEntry?.show?.name), overview: isNonEmptyString(localizedEntry?.show?.overview) } },
          episode: { checked: !!localizedEntry?.episode, found: !!localizedEntry?.episode, fields: { title: isNonEmptyString(localizedEntry?.episode?.name), overview: isNonEmptyString(localizedEntry?.episode?.overview) } },
        },
      };
      return;
    }

    const current = statusByLocale[localeCode];
    const fieldFlags = getLocalizedEntryFieldFlags(localizedEntry);
    current.found = current.found || !!localizedEntry?.movie || !!localizedEntry?.show || !!localizedEntry?.episode;
    current.titleFound = current.titleFound || fieldFlags.title;
    current.overviewFound = current.overviewFound || fieldFlags.overview;
    current.resources.movie.found = current.resources.movie.found || !!localizedEntry?.movie;
    current.resources.show.found = current.resources.show.found || !!localizedEntry?.show;
    current.resources.episode.found = current.resources.episode.found || !!localizedEntry?.episode;
  });

  // Default language is always available from the base TMDB payload.
  statusByLocale.en = {
    checked: true,
    found: isNonEmptyString(fullApiData?.movie?.title)
      || isNonEmptyString(fullApiData?.show?.name)
      || isNonEmptyString(fullApiData?.episode?.name)
      || isNonEmptyString(fullApiData?.movie?.overview)
      || isNonEmptyString(fullApiData?.show?.overview),
    titleFound: isNonEmptyString(fullApiData?.movie?.title)
      || isNonEmptyString(fullApiData?.show?.name)
      || isNonEmptyString(fullApiData?.episode?.name),
    overviewFound: isNonEmptyString(fullApiData?.movie?.overview)
      || isNonEmptyString(fullApiData?.show?.overview)
      || isNonEmptyString(fullApiData?.episode?.overview),
    checkedAt: new Date().toISOString(),
    resources: {
      movie: { checked: !!fullApiData?.movie, found: !!fullApiData?.movie, fields: { title: isNonEmptyString(fullApiData?.movie?.title), overview: isNonEmptyString(fullApiData?.movie?.overview) } },
      show: { checked: !!fullApiData?.show, found: !!fullApiData?.show, fields: { title: isNonEmptyString(fullApiData?.show?.name), overview: isNonEmptyString(fullApiData?.show?.overview) } },
      episode: { checked: !!fullApiData?.episode, found: !!fullApiData?.episode, fields: { title: isNonEmptyString(fullApiData?.episode?.name), overview: isNonEmptyString(fullApiData?.episode?.overview) } },
    },
  };

  return statusByLocale;
}

async function downloadImage(url, localPath, timeout = 30000) {
  // Avoid re-downloading when the file already exists.
  try {
    if (fs.existsSync(localPath)) {
      const stat = fs.statSync(localPath);
      if (stat.size > 0) {
        resultLogger.debug(`Image already exists: ${localPath}`);
        return localPath;
      }
    }
  } catch (e) {
    resultLogger.warn(`Failed to check existing image: ${e.message}`);
  }

  try {
    resultLogger.debug(`Starting image download: ${url}`);
    const response = await axios.get(url, { responseType: 'stream', timeout });
    const writer = fs.createWriteStream(localPath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        writer.destroy();
        resultLogger.error(`Image download timeout: ${url}`);
        reject(new Error(`Image download timeout after ${timeout}ms: ${url}`));
      }, timeout + 5000);
      
      writer.on('finish', () => {
        clearTimeout(timeoutHandle);
        resultLogger.debug(`Image download completed: ${localPath}`);
        resolve(localPath);
      });
      
      writer.on('error', (err) => {
        clearTimeout(timeoutHandle);
        resultLogger.error(`Image write error: ${err.message}`);
        reject(err);
      });
    });
  } catch (error) {
    resultLogger.error(`Failed to download image from ${url}: ${error.message}`);
    throw error;
  }
}

async function handleMatchedResult(originalName, result, resultYear, dirPath, isMismatch = false, fullApiData = null, currentFileIndex = 1, totalFiles = 1, downloadCastImages = true) {
  emitScanProgress('parsing', originalName, { currentFileIndex, totalFiles });
  
  // Create directories if they don't exist
  const postersDir = path.resolve(dirPath, "Posters");
  if (!fs.existsSync(postersDir)) fs.mkdirSync(postersDir, { recursive: true });
  
  const posterPath = path.resolve(postersDir, `${sanitizeForFilename(result.title || result.name)}_${resultYear}.jpg`);
  const posterUrl = result.poster ? `https://image.tmdb.org/t/p/w500${result.poster}` : null;

  // Download poster asynchronously (don't wait for it)
  if (posterUrl) {
    emitScanProgress('downloading-poster', originalName, { currentFileIndex, totalFiles });
    if (!fs.existsSync(posterPath)) {
      resultLogger.info(`[${currentFileIndex}/${totalFiles}] Attempting to download poster: ${posterUrl}`);
      downloadImage(posterUrl, posterPath)
        .catch(e => {
          resultLogger.warn(`Failed to download poster for ${originalName}: ${e.message}`);
        })
        .finally(() => {
          resultLogger.debug(`Poster download task finished for ${originalName}`);
        });
    } else {
      resultLogger.debug(`Poster already exists: ${posterPath}`);
    }
  } else {
    resultLogger.warn(`No poster available for result: ${result?.title || result?.name || 'unknown'}`);
  }

  // Backdrop (default from fullApiData if available)
  const backdropPathId = fullApiData?.movie?.backdrop_path || fullApiData?.show?.backdrop_path || result.backdrop_path;
  const backdropLocalPath = path.resolve(postersDir, `${sanitizeForFilename(result.title || result.name)}_${resultYear}_backdrop.jpg`);
  const backdropUrl = backdropPathId ? `https://image.tmdb.org/t/p/original${backdropPathId}` : null;

  if (backdropUrl) {
    emitScanProgress('downloading-backdrop', originalName, { currentFileIndex, totalFiles });
    if (!fs.existsSync(backdropLocalPath)) {
      resultLogger.info(`[${currentFileIndex}/${totalFiles}] Attempting to download backdrop: ${backdropUrl}`);
      downloadImage(backdropUrl, backdropLocalPath)
        .catch(e => {
          resultLogger.warn(`Failed to download backdrop for ${originalName}: ${e.message}`);
        })
        .finally(() => {
          resultLogger.debug(`Backdrop download task finished for ${originalName}`);
        });
    } else {
      resultLogger.debug(`Backdrop already exists: ${backdropLocalPath}`);
    }
  } else {
    resultLogger.warn(`No backdrop available for result: ${result?.title || result?.name || 'unknown'}`);
  }

  // --- SHARED PEOPLE LOGIC ---
  const peopleDir = path.resolve(__dirname, '../results/people');
  if (!fs.existsSync(peopleDir)) fs.mkdirSync(peopleDir, { recursive: true });
  let castIds = [], crewIds = [];
  
  // Download cast/crew images asynchronously (don't wait for them)
  if (downloadCastImages && fullApiData && fullApiData.credits) {
    // Save cast
    if (Array.isArray(fullApiData.credits.cast)) {
      for (const person of fullApiData.credits.cast) {
        if (!person.id) continue;
        const personFile = path.join(peopleDir, `${person.id}.json`);
        const localProfilePath = path.join(peopleDir, `${person.id}.jpg`);
        const lockFile = path.join(peopleDir, `${person.id}.lock`);
        const imageExists = fs.existsSync(localProfilePath);
        let needsPersonData = !fs.existsSync(personFile);
        if (!needsPersonData) {
          try {
            const existing = JSON.parse(fs.readFileSync(personFile, 'utf8'));
            const existingPath = existing?.profile_path?.replace(/^file:\/\//, '');
            if (existingPath && fs.existsSync(existingPath)) needsPersonData = false;
          } catch {}
        }

        if (needsPersonData) {
          // Download profile image if available (async)
          if (person.profile_path) {
            // If another worker already downloaded the image but hasn't written JSON yet,
            // we can write the JSON immediately to avoid duplicate downloads.
            if (imageExists) {
              const personData = { ...person, profile_path: localProfilePath.replace(/\\/g, '/') };
              fs.writeFileSync(personFile, JSON.stringify(personData, null, 2));
            } else {
              // Acquire lock to prevent duplicate downloads during the same scan.
              if (fs.existsSync(lockFile)) {
                // If a previous scan crashed, the lock can linger. Consider it stale.
                try {
                  const ageMs = Date.now() - fs.statSync(lockFile).mtimeMs;
                  if (ageMs > 30 * 60 * 1000) fs.unlinkSync(lockFile);
                } catch {}
              }
              if (!fs.existsSync(lockFile)) {
                fs.writeFileSync(lockFile, String(Date.now()));
                const profileUrl = `https://image.tmdb.org/t/p/w185${person.profile_path}`;
                emitScanProgress('downloading-cast-image', originalName, { personName: person.name, currentFileIndex, totalFiles });

                downloadImage(profileUrl, localProfilePath).then(() => {
                  const personData = { ...person, profile_path: localProfilePath.replace(/\\/g, '/') };
                  fs.writeFileSync(personFile, JSON.stringify(personData, null, 2));
                }).catch(e => {
                  apiLogger.warn(`Failed to download cast image for ${person.name}: ${e.message}`);
                  const personData = { ...person, profile_path: null };
                  fs.writeFileSync(personFile, JSON.stringify(personData, null, 2));
                }).finally(() => {
                  try { fs.unlinkSync(lockFile); } catch {}
                });
              }
            }
          } else {
            const personData = { ...person, profile_path: null };
            fs.writeFileSync(personFile, JSON.stringify(personData, null, 2));
          }
        }
        castIds.push(person.id);
      }
    }
    // Save crew
    if (Array.isArray(fullApiData.credits.crew)) {
      for (const person of fullApiData.credits.crew) {
        if (!person.id) continue;
        const personFile = path.join(peopleDir, `${person.id}.json`);
        const localProfilePath = path.join(peopleDir, `${person.id}.jpg`);
        const lockFile = path.join(peopleDir, `${person.id}.lock`);
        const imageExists = fs.existsSync(localProfilePath);
        let needsPersonData = !fs.existsSync(personFile);
        if (!needsPersonData) {
          try {
            const existing = JSON.parse(fs.readFileSync(personFile, 'utf8'));
            const existingPath = existing?.profile_path?.replace(/^file:\/\//, '');
            if (existingPath && fs.existsSync(existingPath)) needsPersonData = false;
          } catch {}
        }

        if (needsPersonData) {
          // Download profile image if available (async)
          if (person.profile_path) {
            if (imageExists) {
              const personData = { ...person, profile_path: localProfilePath.replace(/\\/g, '/') };
              fs.writeFileSync(personFile, JSON.stringify(personData, null, 2));
            } else {
              if (fs.existsSync(lockFile)) {
                // If a previous scan crashed, the lock can linger. Consider it stale.
                try {
                  const ageMs = Date.now() - fs.statSync(lockFile).mtimeMs;
                  if (ageMs > 30 * 60 * 1000) fs.unlinkSync(lockFile);
                } catch {}
              }
              if (!fs.existsSync(lockFile)) {
                fs.writeFileSync(lockFile, String(Date.now()));
                const profileUrl = `https://image.tmdb.org/t/p/w185${person.profile_path}`;
                emitScanProgress('downloading-crew-image', originalName, { personName: person.name, currentFileIndex, totalFiles });

                downloadImage(profileUrl, localProfilePath).then(() => {
                  const personData = { ...person, profile_path: localProfilePath.replace(/\\/g, '/') };
                  fs.writeFileSync(personFile, JSON.stringify(personData, null, 2));
                }).catch(e => {
                  apiLogger.warn(`Failed to download crew image for ${person.name}: ${e.message}`);
                  const personData = { ...person, profile_path: null };
                  fs.writeFileSync(personFile, JSON.stringify(personData, null, 2));
                }).finally(() => {
                  try { fs.unlinkSync(lockFile); } catch {}
                });
              }
            }
          } else {
            const personData = { ...person, profile_path: null };
            fs.writeFileSync(personFile, JSON.stringify(personData, null, 2));
          }
        }
        crewIds.push(person.id);
      }
    }
  }

  apiLogger.info(`TMDB result object: ${JSON.stringify(result, null, 2)}`);

  // Ensure final.poster_path is always the local file path
  if (result && typeof result === 'object') {
    result.poster_path = posterPath.replace(/\\/g, '/');
    result.backdrop_path = backdropLocalPath.replace(/\\/g, '/');
  }

  const localPosterPath = posterPath.replace(/\\/g, '/');
  const localBackdropPath = backdropLocalPath.replace(/\\/g, '/');
  
  resultLogger.info(`[${currentFileIndex}/${totalFiles}] Building final result object for: ${result.title || result.name}`);
  
  const finalWithPosterPath = {
    ...result,
    poster_path: localPosterPath,
    poster: localPosterPath,
    backdrop_path: localBackdropPath
  };

  const localizedApiData = fullApiData?.localized
    ? Object.entries(fullApiData.localized).reduce((accumulator, [localeCode, localizedEntry]) => {
        const movie = localizedEntry?.movie || null;
        const show = localizedEntry?.show || null;
        const episode = localizedEntry?.episode || null;

        if (movie || show || episode) {
          accumulator[localeCode] = { movie, show, episode };
        }

        return accumulator;
      }, {})
    : null;

  const localizationStatus = fullApiData
    ? buildLocalizedStatus(fullApiData, localizedApiData)
    : null;

  const resultData = {
    original_name: originalName,
    title: result.title || result.name,
    type: result.media_type,
    release_date: result.release_date || result.first_air_date,
    year_mismatch: isMismatch,
    poster_path: localPosterPath,
    backdrop_path: localBackdropPath,
    final: finalWithPosterPath,
    fullApiData: fullApiData ? { 
      movie: fullApiData.movie || null,
      show: fullApiData.show || null,
      episode: fullApiData.episode || null,
      localized: localizedApiData,
      localizationStatus,
      credits: fullApiData.credits ? { cast: fullApiData.credits.cast?.slice(0, 20), crew: fullApiData.credits.crew?.slice(0, 20) } : null,
      videos: fullApiData.videos || []
    } : null,
    castIds,
    crewIds
  };

  try {
    resultLogger.info(`[${currentFileIndex}/${totalFiles}] About to emit saving-result progress`);
    emitScanProgress('saving-result', originalName, { currentFileIndex, totalFiles });
    resultLogger.info(`[${currentFileIndex}/${totalFiles}] Successfully processed: ${result.title || result.name}`);
  } catch (e) {
    resultLogger.error(`Error emitting saving-result progress: ${e.message}`);
  }
  
  return resultData;
}

function readResults() {
  const resultsDir = path.resolve(__dirname, '../results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
    return [];
  }
  
  const results = [];
  const files = fs.readdirSync(resultsDir);
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const filePath = path.join(resultsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const result = JSON.parse(content);
        results.push(result);
      } catch (error) {
        resultLogger.error(`Error reading result file ${file}: ${error.message}`);
      }
    }
  }
  
  return results;
}

function addOrUpdateResult(newResult) {
  const resultsDir = path.resolve(__dirname, '../results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const filename = `${newResult.original_name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
  const filePath = path.join(resultsDir, filename);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(newResult, null, 2));
    resultLogger.info(`Result saved to ${filePath}`);
  } catch (error) {
    resultLogger.error(`Error saving result to ${filePath}: ${error.message}`);
  }
}

module.exports = {
  handleMatchedResult,
  readResults,
  addOrUpdateResult
};