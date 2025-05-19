const fs = require('fs');
const path = require('path');
const { api: apiLogger, download: downloadLogger, result: resultLogger } = require('../logger.js');

function getResultsPath() {
  return path.resolve(__dirname, '../results.json');
}

function readResults() {
  const resultsPath = getResultsPath();
  try {
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
      return Array.isArray(results) ? results : [];
    }
    return [];
  } catch (err) {
    resultLogger.error(`Error reading results file: ${err.message}`);
    return [];
  }
}

function writeResults(results) {
  const resultsPath = getResultsPath();
  try {
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    return true;
  } catch (err) {
    resultLogger.error(`Error writing to results file: ${err.message}`);
    return false;
  }
}

function findInResults(parsedData, results) {
  const parsedYear = parsedData.year;
  const allTitleVariations = parsedData.extendedTitles.map(t => t.toLowerCase());

  for (const result of results) {
    const resultTitle = (result.title || result.name || '').toLowerCase();
    const resultOriginalName = (result.original_name || '').toLowerCase();
    const resultYear = (result.release_date || result.first_air_date || '').slice(0, 4);
    
    // Check for matches in either title/name OR original_name
    const titleMatch = allTitleVariations.some(variation => 
      resultTitle.includes(variation) || 
      variation.includes(resultTitle) ||
      resultOriginalName.includes(variation) ||
      variation.includes(resultOriginalName)
    );
    
    const yearMatch = !parsedYear || !resultYear || parsedYear === resultYear;

    if (titleMatch && yearMatch) {
      return result;
    }
  }
  return null;
}

module.exports = {
  readResults,
  writeResults,
  findInResults
};