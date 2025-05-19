const path = require('path');
const { api: apiLogger, download: downloadLogger, result: resultLogger } = require('../logger.js');
const  downloadPosterImage  = require('../utils/imgDownloader.js');
const  {writeResults,readResults}  = require('../services/resultsService');

async function handleMatchedResult(originalName,result, resultYear, dirPath, isMismatch = false) {
  const posterPath = path.resolve(dirPath, "Posters", `${result.title || result.name}_${resultYear}.jpg`);
  const posterUrl = `https://image.tmdb.org/t/p/w500${result.poster_path}`;

  await downloadPosterImage(posterUrl, posterPath);

  const resultData = {
    original_name:originalName,
    title: result.title || result.name,
    type: result.media_type,
    release_date: result.release_date || result.first_air_date,
    year_mismatch: isMismatch,
    poster_path: posterPath,
  };

  const currentResults = readResults();
  currentResults.push(resultData);
  writeResults(currentResults);

 resultLogger.info(`Successfully saved result for: ${result.title || result.name}`);
  return resultData;
}

module.exports = {
  handleMatchedResult
};