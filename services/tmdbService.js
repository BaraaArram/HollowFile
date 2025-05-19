const axios = require('axios');
require('dotenv').config();
const { computeScore } = require('../utils/similarity'); // Change this to use computeScore
const { api: apiLogger, download: downloadLogger, result: resultLogger } = require('../logger.js');

const MAX_YEAR_DIFFERENCE = 2;

async function searchTMDB(query, expectedYear, mediaType = 'multi') {
  const url = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(query)}&year=${expectedYear}`;
  
  apiLogger.info(`Starting TMDB search`, { 
    query, 
    expectedYear, 
    mediaType,
    maskedUrl: url.replace(process.env.TMDB_API_KEY, '***')
  });
  
  try {
    const response = await axios.get(url);
    const results = response.data.results || [];
    
    if (results.length > 0) {
      apiLogger.success(`TMDB search successful`, {
        query,
        resultCount: results.length,
        topResult: {
          title: results[0].title || results[0].name,
          year: results[0].release_date || results[0].first_air_date
        }
      });
    } else {
      apiLogger.warn(`No TMDB results found`, { query, expectedYear });
    }
    
    return results;
  } catch (err) {
    apiLogger.error(`TMDB API request failed`, {
      query,
      error: err.message,
      status: err.response?.status,
      responseData: err.response?.data
    });
    return [];
  }
}

function scoreResults(results, query, expectedYear) {
  apiLogger.debug(`Starting scoring process`, {
    query,
    expectedYear,
    inputResultsCount: results.length
  });
  
  if (results.length === 0) {
    apiLogger.warn(`Skipping scoring - empty results set`, { query });
    return [];
  }

  const scoredResults = results.map(result => {
    const resultTitle = result.title || result.name;
    const resultYear = result.release_date
      ? result.release_date.split('-')[0]
      : result.first_air_date
      ? result.first_air_date.split('-')[0]
      : null;

    if (!resultYear) {
      apiLogger.debug(`Excluding result - missing year`, { resultTitle });
      return null;
    }

    // Use the new computeScore function here
    const score = computeScore(resultTitle, resultYear, query, expectedYear);

    apiLogger.debug(`Scored result`, {
      query,
      resultTitle,
      resultYear,
      score: score.toFixed(2)
    });

    return {
      result,
      resultYear,
      score
    };
  }).filter(Boolean);

  apiLogger.debug(`Completed scoring`, {
    query,
    validResultsCount: scoredResults.length,
    averageScore: scoredResults.length > 0 
      ? (scoredResults.reduce((sum, r) => sum + r.score, 0) / scoredResults.length).toFixed(2)
      : 0
  });
  
  return scoredResults;
}

function findBestMatch(scoredResults, query) {
  if (scoredResults.length === 0) {
    apiLogger.error(`No valid results for matching`, { query });
    return null;
  }

  apiLogger.debug(`Finding best match`, {
    query,
    scoredResultsCount: scoredResults.length
  });
  
  // Log top candidates
  scoredResults.slice(0, 3)
    .sort((a, b) => b.score - a.score)
    .forEach((r, i) => {
      apiLogger.debug(`Top candidate ${i + 1}`, {
        position: i + 1,
        title: r.result.title || r.result.name,
        score: r.score.toFixed(2),
        year: r.resultYear
      });
    });

  const exactMatches = scoredResults.filter(r => r.score > 0.9);
  if (exactMatches.length > 0) {
    const bestMatch = exactMatches.sort((a, b) => a.score - b.score)[0];
    apiLogger.success(`Found exact match`, {
      query,
      matchTitle: bestMatch.result.title || bestMatch.result.name,
      score: bestMatch.score.toFixed(2),
      year: bestMatch.resultYear
    });
    return bestMatch;
  }

  const closeMatches = scoredResults.filter(r => r.score > 0.5);
  if (closeMatches.length > 0) {
    const bestCloseMatch = closeMatches.sort((a, b) => b.score - a.score)[0];
    apiLogger.info(`Found close match`, {
      query,
      matchTitle: bestCloseMatch.result.title || bestCloseMatch.result.name,
      score: bestCloseMatch.score.toFixed(2),
      year: bestCloseMatch.resultYear
    });
    return bestCloseMatch;
  }

  apiLogger.error(`No suitable matches found`, {
    query,
    analysis: {
      topScore: Math.max(...scoredResults.map(r => r.score)).toFixed(2),
      avgScore: (scoredResults.reduce((sum, r) => sum + r.score, 0) / scoredResults.length).toFixed(2)
    }
  });
  
  return null;
}

module.exports = {
  searchTMDB,
  scoreResults,
  findBestMatch
};
