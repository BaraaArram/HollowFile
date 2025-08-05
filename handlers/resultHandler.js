const { emitScanProgress } = require('../services/scanProgressService');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const apiLogger = require('../utils/logger').apiLogger;
const resultLogger = require('../utils/logger').resultLogger;

async function downloadImage(url, localPath) {
  try {
    const response = await axios.get(url, { responseType: 'stream' });
    const writer = fs.createWriteStream(localPath);
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    apiLogger.error(`Failed to download image from ${url}: ${error.message}`);
    throw error;
  }
}

async function handleMatchedResult(originalName, result, resultYear, dirPath, isMismatch = false, fullApiData = null, currentFileIndex = 1, totalFiles = 1, downloadCastImages = true) {
  emitScanProgress('parsing', originalName, { currentFileIndex, totalFiles });
  
  // Create directories if they don't exist
  const postersDir = path.resolve(dirPath, "Posters");
  if (!fs.existsSync(postersDir)) fs.mkdirSync(postersDir, { recursive: true });
  
  const posterPath = path.resolve(postersDir, `${result.title || result.name}_${resultYear}.jpg`);
  const posterUrl = result.poster ? `https://image.tmdb.org/t/p/w500${result.poster}` : null;

  // Download poster asynchronously (don't wait for it)
  if (posterUrl) {
    emitScanProgress('downloading-poster', originalName, { currentFileIndex, totalFiles });
    apiLogger.info(`Attempting to download poster: ${posterUrl}`);
    downloadImage(posterUrl, posterPath).catch(e => {
      apiLogger.warn(`Failed to download poster for ${originalName}: ${e.message}`);
    });
  } else {
    apiLogger.warn(`No poster available for result: ${JSON.stringify(result)}`);
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
        if (!fs.existsSync(personFile)) {
          // Download profile image if available (async)
          if (person.profile_path) {
            const profileUrl = `https://image.tmdb.org/t/p/w185${person.profile_path}`;
            const localProfilePath = path.join(peopleDir, `${person.id}.jpg`);
            emitScanProgress('downloading-cast-image', originalName, { personName: person.name, currentFileIndex, totalFiles });
            downloadImage(profileUrl, localProfilePath).then(() => {
              const personData = { ...person, profile_path: localProfilePath.replace(/\\/g, '/') };
              fs.writeFileSync(personFile, JSON.stringify(personData, null, 2));
            }).catch(e => {
              apiLogger.warn(`Failed to download cast image for ${person.name}: ${e.message}`);
              const personData = { ...person, profile_path: null };
              fs.writeFileSync(personFile, JSON.stringify(personData, null, 2));
            });
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
        if (!fs.existsSync(personFile)) {
          // Download profile image if available (async)
          if (person.profile_path) {
            const profileUrl = `https://image.tmdb.org/t/p/w185${person.profile_path}`;
            const localProfilePath = path.join(peopleDir, `${person.id}.jpg`);
            emitScanProgress('downloading-crew-image', originalName, { personName: person.name, currentFileIndex, totalFiles });
            downloadImage(profileUrl, localProfilePath).then(() => {
              const personData = { ...person, profile_path: localProfilePath.replace(/\\/g, '/') };
              fs.writeFileSync(personFile, JSON.stringify(personData, null, 2));
            }).catch(e => {
              apiLogger.warn(`Failed to download crew image for ${person.name}: ${e.message}`);
              const personData = { ...person, profile_path: null };
              fs.writeFileSync(personFile, JSON.stringify(personData, null, 2));
            });
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
  }

  const localPosterPath = posterPath.replace(/\\/g, '/');
  const finalWithPosterPath = {
    ...result,
    poster_path: localPosterPath,
    poster: localPosterPath // overwrite TMDB poster with local path
  };

  // Debug: print the final object before saving
  console.log('Saving finalWithPosterPath:', finalWithPosterPath);

  const resultData = {
    original_name: originalName,
    title: result.title || result.name,
    type: result.media_type,
    release_date: result.release_date || result.first_air_date,
    year_mismatch: isMismatch,
    poster_path: localPosterPath,
    final: finalWithPosterPath, // always has local poster_path and poster
    fullApiData, // Store the full TMDB API response (including cast/crew/credits/etc)
    castIds,
    crewIds
  };

  // The rest of the logic for writing results remains unchanged
  const currentResults = readResults();
  // writeResult(resultData); // Removed to prevent duplicate/partial result files

  emitScanProgress('saving-result', originalName, { currentFileIndex, totalFiles });
 resultLogger.info(`Successfully saved result for: ${result.title || result.name}`);
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