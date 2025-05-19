const { api: apiLogger, download: downloadLogger, result: resultLogger } = require('./logger.js');
const  parseFileName  = require('./utils/nameParser');
const { searchTMDB, scoreResults, findBestMatch } = require('./services/tmdbService');
const { readResults, findInResults } = require('./services/resultsService');
const { handleMatchedResult } = require('./handlers/resultHandler');

async function searchVideoType(originalName,parsedTitle, dirPath) {
  const titleList=parsedTitle.extendedTitles;
  if (!Array.isArray(titleList)) {
    throw new TypeError('Expected titleList to be an array');
  }

  const sortedTitles = titleList.sort((a, b) => b.length - a.length);
  apiLogger.info(`Starting search for: ${parsedTitle.originalName}`);

  const existingResults = readResults();
  const existingResult = findInResults(parsedTitle, existingResults);

  if (existingResult) {
    apiLogger.info(`Found existing result: ${existingResult.title}`);
    return existingResult;
  }

  for (const title of sortedTitles) {
    const results = await searchTMDB(title, parsedTitle.year);
    const scoredResults = scoreResults(results, title, parsedTitle.year);
    const bestMatch = findBestMatch(scoredResults);

    if (bestMatch) {
      console.log(bestMatch)
      const isMismatch = bestMatch.resultYear !== parsedTitle.year;
      return await handleMatchedResult(
        originalName,
        bestMatch.result, 
        bestMatch.resultYear, 
        dirPath, 
        isMismatch
      );
    }
  }

  apiLogger.warn(`No matching result found for year ${parsedTitle.year}`);
  return null;
}

module.exports = {
  searchVideoType,
  parseFileName
};