const axios = require('axios');
require('dotenv').config();
const { computeScore, getSimilarity, computeEpisodeScore } = require('../utils/similarity'); // Change this to use computeScore
const { api: apiLogger, download: downloadLogger, result: resultLogger } = require('../logger.js');

const MAX_YEAR_DIFFERENCE = 2;

async function searchTMDB(query, expectedYear, mediaType = 'multi') {
  // TEMP: Log the API key and URL for debugging
  console.log('TMDB API KEY:', process.env.TMDB_API_KEY);
  const url = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(query)}&year=${expectedYear}`;
  console.log('TMDB URL:', url);
  
  apiLogger.info(`Starting TMDB search`, { 
    query, 
    expectedYear, 
    mediaType,
    maskedUrl: url.replace(process.env.TMDB_API_KEY, '***')
  });
  
  try {
    const response = await axios.get(url);
    console.log('TMDB Response:', response.data); // TEMP: log the response
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
    
    return {
      url,
      results,
      rawResponse: response.data,
      error: null
    };
  } catch (err) {
    console.error('TMDB Error:', err.response ? err.response.data : err.message); // TEMP: log the error
    apiLogger.error(`TMDB API request failed`, {
      query,
      error: err.message,
      status: err.response?.status,
      responseData: err.response?.data
    });
    return {
      url,
      results: [],
      rawResponse: err.response?.data || null,
      error: err.message
    };
  }
}

function scoreResults(results, query, expectedYear, expectedSeason, expectedEpisode) {
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
    const originalTitle = result.original_title || result.original_name || '';
    const resultYear = result.release_date
      ? result.release_date.split('-')[0]
      : result.first_air_date
      ? result.first_air_date.split('-')[0]
      : null;

    // For TV episodes, try to use season/episode info if available
    let score;
    if (result.season_number != null && result.episode_number != null && expectedSeason != null && expectedEpisode != null) {
      score = computeEpisodeScore(
        resultTitle,
        resultYear,
        query,
        expectedYear,
        result.season_number,
        result.episode_number,
        expectedSeason,
        expectedEpisode
      );
    } else {
    // Use the new computeScore function here
      score = computeScore(resultTitle, resultYear, query, expectedYear);
    }

    // Also score against original_title and use the higher score
    if (originalTitle && originalTitle !== resultTitle) {
      let originalScore;
      if (result.season_number != null && result.episode_number != null && expectedSeason != null && expectedEpisode != null) {
        originalScore = computeEpisodeScore(
          originalTitle,
          resultYear,
          query,
          expectedYear,
          result.season_number,
          result.episode_number,
          expectedSeason,
          expectedEpisode
        );
      } else {
        originalScore = computeScore(originalTitle, resultYear, query, expectedYear);
      }
      if (originalScore > score) {
        score = originalScore;
        apiLogger.debug(`Original title scored higher`, {
          query,
          resultTitle,
          originalTitle,
          originalScore: originalScore.toFixed(2)
        });
      }
    }

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

// New: Search for TV show by name, then fetch season/episode details if needed
async function searchTVShowAndEpisode(showName, season, episode) {
  // 1. Search for the TV show by name only
  const url = `https://api.themoviedb.org/3/search/tv?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(showName)}`;
  apiLogger.info(`Searching TMDB for TV show`, { showName, url: url.replace(process.env.TMDB_API_KEY, '***') });
  let showId = null;
  let showResult = null;
  try {
    const response = await axios.get(url);
    const results = response.data.results || [];
    if (results.length > 0) {
      showResult = results[0];
      showId = showResult.id;
      apiLogger.success(`Found TV show`, { showName, showId });
    } else {
      apiLogger.warn(`No TV show found for`, { showName });
      return null;
    }
  } catch (err) {
    apiLogger.error(`TMDB TV show search failed`, { showName, error: err.message });
    return null;
  }

  // 2. If season and episode are provided, fetch episode details
  if (showId && season && episode) {
    const epUrl = `https://api.themoviedb.org/3/tv/${showId}/season/${season}/episode/${episode}?api_key=${process.env.TMDB_API_KEY}`;
    try {
      const epResponse = await axios.get(epUrl);
      return {
        show: showResult,
        episode: epResponse.data
      };
    } catch (err) {
      apiLogger.error(`TMDB episode fetch failed`, { showId, season, episode, error: err.message });
      return { show: showResult, episode: null };
    }
  }
  // If no season/episode, just return the show
  return { show: showResult, episode: null };
}

// Fetch trailer/video data from TMDB
async function fetchVideos(tmdbId, mediaType = 'movie') {
  const type = mediaType === 'tv' ? 'tv' : 'movie';
  const url = `https://api.themoviedb.org/3/${type}/${tmdbId}/videos?api_key=${process.env.TMDB_API_KEY}`;
  apiLogger.info(`Fetching videos for ${type}/${tmdbId}`);
  try {
    const response = await axios.get(url);
    const results = response.data.results || [];
    // Filter to YouTube trailers/teasers, prioritize official trailers
    const videos = results
      .filter(v => v.site === 'YouTube' && ['Trailer', 'Teaser', 'Clip', 'Featurette'].includes(v.type))
      .sort((a, b) => {
        // Official trailers first, then teasers, then others
        const order = { Trailer: 0, Teaser: 1, Clip: 2, Featurette: 3 };
        const diff = (order[a.type] ?? 4) - (order[b.type] ?? 4);
        if (diff !== 0) return diff;
        // Prefer official
        if (a.official && !b.official) return -1;
        if (!a.official && b.official) return 1;
        return 0;
      })
      .map(v => ({
        key: v.key,
        name: v.name,
        type: v.type,
        official: v.official || false,
        published_at: v.published_at,
        size: v.size
      }));
    apiLogger.success(`Found ${videos.length} videos for ${type}/${tmdbId}`);
    return videos;
  } catch (err) {
    apiLogger.error(`Failed to fetch videos for ${type}/${tmdbId}: ${err.message}`);
    return [];
  }
}

// Normalize a TMDB result (tv or movie) to a common format
function normalizeTMDBResult(result) {
  if (result.media_type === 'tv' || result.first_air_date) {
    return {
      id: result.id,
      type: 'tv',
      title: result.name || result.original_name,
      year: result.first_air_date ? result.first_air_date.split('-')[0] : '',
      poster: result.poster_path,
      overview: result.overview,
      popularity: result.popularity,
      vote_average: result.vote_average,
      vote_count: result.vote_count,
      origin_country: result.origin_country,
    };
  } else if (result.media_type === 'movie' || result.release_date) {
    return {
      id: result.id,
      type: 'movie',
      title: result.title || result.original_title,
      year: result.release_date ? result.release_date.split('-')[0] : '',
      poster: result.poster_path,
      overview: result.overview,
      popularity: result.popularity,
      vote_average: result.vote_average,
      vote_count: result.vote_count,
    };
  }
  return null;
}

module.exports = {
  searchTMDB,
  scoreResults,
  findBestMatch,
  searchTVShowAndEpisode,
  normalizeTMDBResult,
  fetchVideos
};
