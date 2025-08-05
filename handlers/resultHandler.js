const path = require('path');
const { api: apiLogger, download: downloadLogger, result: resultLogger } = require('../logger.js');
const { downloadImage } = require('../utils/imgDownloader.js');
const { writeResult, readResults } = require('../services/resultsService');
const fs = require('fs');
const { emitScanProgress } = require('../services/scanProgressService');

async function handleMatchedResult(originalName, result, resultYear, dirPath, isMismatch = false, fullApiData = null, currentFileIndex = 1, totalFiles = 1) {
  emitScanProgress('parsing', originalName, { currentFileIndex, totalFiles });
  const posterPath = path.resolve(dirPath, "Posters", `${result.title || result.name}_${resultYear}.jpg`);
  // Use 'poster' property from normalized result
  const posterUrl = result.poster ? `https://image.tmdb.org/t/p/w500${result.poster}` : null;

  if (posterUrl) {
    emitScanProgress('downloading-poster', originalName, { currentFileIndex, totalFiles });
    apiLogger.info(`Attempting to download poster: ${posterUrl}`);
    await downloadImage(posterUrl, posterPath);
  } else {
    apiLogger.warn(`No poster available for result: ${JSON.stringify(result)}`);
  }

  // --- SHARED PEOPLE LOGIC ---
  const peopleDir = path.resolve(__dirname, '../results/people');
  if (!fs.existsSync(peopleDir)) fs.mkdirSync(peopleDir, { recursive: true });
  let castIds = [], crewIds = [];
  if (fullApiData && fullApiData.credits) {
    // Save cast
    if (Array.isArray(fullApiData.credits.cast)) {
      for (const person of fullApiData.credits.cast) {
        if (!person.id) continue;
        const personFile = path.join(peopleDir, `${person.id}.json`);
        if (!fs.existsSync(personFile)) {
          // Download profile image if available
          let profilePath = null;
          if (person.profile_path) {
            const profileUrl = `https://image.tmdb.org/t/p/w185${person.profile_path}`;
            const localProfilePath = path.join(peopleDir, `${person.id}.jpg`);
            try {
              emitScanProgress('downloading-cast-image', originalName, { personName: person.name, currentFileIndex, totalFiles });
              await downloadImage(profileUrl, localProfilePath);
              profilePath = localProfilePath.replace(/\\/g, '/');
            } catch (e) { profilePath = null; }
          }
          const personData = { ...person, profile_path: profilePath };
          fs.writeFileSync(personFile, JSON.stringify(personData, null, 2));
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
          // Download profile image if available
          let profilePath = null;
          if (person.profile_path) {
            const profileUrl = `https://image.tmdb.org/t/p/w185${person.profile_path}`;
            const localProfilePath = path.join(peopleDir, `${person.id}.jpg`);
            try {
              emitScanProgress('downloading-crew-image', originalName, { personName: person.name, currentFileIndex, totalFiles });
              await downloadImage(profileUrl, localProfilePath);
              profilePath = localProfilePath.replace(/\\/g, '/');
            } catch (e) { profilePath = null; }
          }
          const personData = { ...person, profile_path: profilePath };
          fs.writeFileSync(personFile, JSON.stringify(personData, null, 2));
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

module.exports = {
  handleMatchedResult
};