const { api: apiLogger, download: downloadLogger, result: resultLogger } = require('./logger.js');
const  parseFileName  = require('./utils/nameParser');
const { searchTMDB, scoreResults, findBestMatch, searchTVShowAndEpisode, normalizeTMDBResult, fetchVideos, fetchTMDBResource, fetchLocalizedTMDBResourceWithStatus } = require('./services/tmdbService');
const { readResults, findInResults } = require('./services/resultsService');
const { handleMatchedResult } = require('./handlers/resultHandler');
const { emitScanProgress } = require('./services/scanProgressService');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function searchVideoType(originalName, parsedTitle, dirPath, progressCallback, options = {}) {
  const { downloadCastImages = true } = options;
  const activeLibrary = options.library || null;
  apiLogger.debug('Parsed title object', parsedTitle);
  const titleList = parsedTitle.extendedTitles;
  if (!Array.isArray(titleList)) {
    throw new TypeError('Expected titleList to be an array');
  }

  const sortedTitles = titleList.sort((a, b) => b.length - a.length);
  apiLogger.info(`Starting search for: ${parsedTitle.originalName}`);

  const existingResults = readResults();
  const existingResult = findInResults(parsedTitle, existingResults, {
    libraryId: activeLibrary?.id,
    libraryPath: activeLibrary?.path || dirPath,
  });

  if (existingResult) {
    apiLogger.info(`Found existing result: ${existingResult.title}`);
    return existingResult;
  }

  let bestOverall = null;
  let bestType = null;
  let bestScore = -1;
  let bestMatchObj = null;
  let bestTitle = null;
  let bestMediaType = null;
  let bestSeason = null;
  let bestEpisode = null;
  let bestApiInfo = null; // Track apiInfo for the best match
  let apiInfo = [];
  const localizedPayload = {};
  const localizationChecks = {};
  const mergeLocalizedResource = (resourceKey, localizedEntries) => {
    Object.entries(localizedEntries || {}).forEach(([localeCode, data]) => {
      if (!data) {
        return;
      }

      if (!localizedPayload[localeCode]) {
        localizedPayload[localeCode] = {};
      }

      localizedPayload[localeCode][resourceKey] = data;
    });
  };
  const mergeLocalizationChecks = (resourceKey, checkEntries) => {
    Object.entries(checkEntries || {}).forEach(([localeCode, check]) => {
      if (!localizationChecks[localeCode]) {
        localizationChecks[localeCode] = {};
      }

      localizationChecks[localeCode][resourceKey] = {
        checked: !!check?.checked,
        requestSucceeded: !!check?.requestSucceeded,
        found: !!check?.found,
        fields: {
          title: !!check?.fields?.title,
          overview: !!check?.fields?.overview,
        },
        checkedAt: check?.checkedAt || new Date().toISOString(),
        language: check?.language,
      };
    });
  };

  // If TV show, use new TMDB search logic
  if (parsedTitle.isTV) {
    const showName = parsedTitle.cleanTitle;
    const season = parsedTitle.season;
    const episode = parsedTitle.episode;
    // Prepare apiInfo for TV
    let apiInfo = [];
    let tvResult = null;
    let showUrl = `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(showName)}`;
    let showResponse = null;
    let episodeUrl = null;
    let episodeResponse = null;
    let error = null;
    try {
      tvResult = await searchTVShowAndEpisode(showName, season, episode);
      showResponse = tvResult && tvResult.show;
      if (tvResult && tvResult.episode && showResponse && showResponse.id) {
        episodeUrl = `https://api.themoviedb.org/3/tv/${showResponse.id}/season/${season}/episode/${episode}`;
        episodeResponse = tvResult.episode;
      }
    } catch (e) {
      error = {
        message: e.message || String(e),
        stack: e.stack || null
      };
    }
    // If episode info is available, score using episode title/air date
    let episodeScore = null;
    if (tvResult && tvResult.episode) {
      const episodeTitle = tvResult.episode.name || tvResult.episode.title;
      const episodeAirDate = tvResult.episode.air_date ? tvResult.episode.air_date.split('-')[0] : '';
      episodeScore = require('./services/tmdbService').scoreResults(
        [tvResult.episode],
        episodeTitle,
        episodeAirDate,
        season,
        episode
      )[0]?.score;
    }
    // Build apiInfo array
    apiInfo.push({
      type: 'tv_show_search',
      url: showUrl,
      response: showResponse,
      error: error
    });
    if (episodeUrl) {
      apiInfo.push({
        type: 'tv_episode_lookup',
        url: episodeUrl,
        response: episodeResponse,
        error: error
      });
    }
    if (tvResult && tvResult.show) {
      let showDetails = tvResult.show;
      try {
        if (tvResult.show.id) {
          showDetails = await fetchTMDBResource(`tv/${tvResult.show.id}`);
          const localizedShowResult = await fetchLocalizedTMDBResourceWithStatus(`tv/${tvResult.show.id}`, {}, showDetails);
          mergeLocalizedResource('show', localizedShowResult.localized);
          mergeLocalizationChecks('show', localizedShowResult.checks);
        }
      } catch (e) {
        showDetails = tvResult.show;
      }

      let episodeDetails = tvResult.episode;
      if (tvResult.show.id && season && episode) {
        try {
          episodeDetails = await fetchTMDBResource(`tv/${tvResult.show.id}/season/${season}/episode/${episode}`);
          const localizedEpisodeResult = await fetchLocalizedTMDBResourceWithStatus(
            `tv/${tvResult.show.id}/season/${season}/episode/${episode}`,
            {},
            episodeDetails
          );
          mergeLocalizedResource('episode', localizedEpisodeResult.localized);
          mergeLocalizationChecks('episode', localizedEpisodeResult.checks);
        } catch (e) {
          episodeDetails = tvResult.episode;
        }
      }

      // Fetch credits for the show (if available)
      let credits = null;
      try {
        if (showDetails.id) {
          credits = await fetchTMDBResource(`tv/${showDetails.id}/credits`);
        }
      } catch (e) { credits = null; }
      // Fetch trailer videos
      let videos = [];
      try {
        if (showDetails.id) {
          videos = await fetchVideos(showDetails.id, 'tv');
        }
      } catch (e) { videos = []; }
      // Use handleMatchedResult to get local poster path in final
      const info = await handleMatchedResult(
        originalName,
        normalizeTMDBResult(showDetails),
        (showDetails.first_air_date || '').slice(0, 4),
        dirPath,
        false,
        { show: showDetails, episode: episodeDetails, credits, videos, localized: localizedPayload, localizationChecks },
        1,
        1,
        downloadCastImages
      );
      // Always set info.final to the returned finalWithPosterPath
      return {
        ...info,
        episodeInfo: tvResult.episode,
        episodeScore,
        type: 'tv',
        season,
        episode,
        apiInfo,
        error
      };
    } else {
      apiLogger.warn(`No matching TV show or episode found for ${showName}`);
      return { apiInfo, error };
    }
  }

  // Movie logic (as before)
  let triedTitles = new Set();
  for (const mediaType of ['movie']) {
    for (const title of sortedTitles) {
      if (triedTitles.has(title)) continue;
      triedTitles.add(title);
      let tmdbResult = null;
      let error = null;
      try {
        tmdbResult = await searchTMDB(title, parsedTitle.year, mediaType);
        // Log the full TMDB API response
        if (tmdbResult && tmdbResult.rawResponse) {
          apiLogger.info(`Full TMDB API response for title: ${title}`, { rawResponse: tmdbResult.rawResponse });
          // Check for poster_path issues in all results
          if (Array.isArray(tmdbResult.rawResponse.results)) {
            tmdbResult.rawResponse.results.forEach((res, idx) => {
              if (!res.poster_path) {
                apiLogger.warn(`No poster_path for result index ${idx} (title: ${res.title || res.name})`, { result: res });
              }
            });
          }
        }
      } catch (e) {
        error = {
          message: e.message || String(e),
          stack: e.stack || null
        };
      }
      const thisApiInfo = {
        title,
        url: tmdbResult ? tmdbResult.url : null,
        results: tmdbResult ? tmdbResult.results : null,
        rawResponse: tmdbResult ? tmdbResult.rawResponse : null,
        error: error || (tmdbResult ? tmdbResult.error : null)
      };
      apiInfo.push(thisApiInfo);
      const scoredResults = scoreResults(tmdbResult ? tmdbResult.results : [], title, parsedTitle.year);
      const bestMatch = findBestMatch(scoredResults, title);
      if (bestMatch && bestMatch.score > bestScore) {
        bestScore = bestMatch.score;
        bestOverall = bestMatch.result;
        bestType = mediaType;
        bestMatchObj = bestMatch;
        bestTitle = title;
        bestApiInfo = thisApiInfo; // Save apiInfo for the best match
      }
    }
  }
  // Always try the cleanest possible title as a last resort if not already tried
  const cleanestTitle = parsedTitle.cleanTitle
    .split(' ')
    .filter(w => isNaN(Number(w)) && w.length > 1)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (cleanestTitle && !triedTitles.has(cleanestTitle)) {
    let tmdbResult = null;
    let error = null;
    try {
      tmdbResult = await searchTMDB(cleanestTitle, parsedTitle.year, 'movie');
      if (tmdbResult && tmdbResult.rawResponse) {
        apiLogger.info(`Full TMDB API response for cleanest title: ${cleanestTitle}`, { rawResponse: tmdbResult.rawResponse });
      }
    } catch (e) {
      error = {
        message: e.message || String(e),
        stack: e.stack || null
      };
    }
    const thisApiInfo = {
      title: cleanestTitle,
      url: tmdbResult ? tmdbResult.url : null,
      results: tmdbResult ? tmdbResult.results : null,
      rawResponse: tmdbResult ? tmdbResult.rawResponse : null,
      error: error || (tmdbResult ? tmdbResult.error : null)
    };
    apiInfo.push(thisApiInfo);
    const scoredResults = scoreResults(tmdbResult ? tmdbResult.results : [], cleanestTitle, parsedTitle.year);
    const bestMatch = findBestMatch(scoredResults, cleanestTitle);
    if (bestMatch && bestMatch.score > bestScore) {
      bestScore = bestMatch.score;
      bestOverall = bestMatch.result;
      bestType = 'movie';
      bestMatchObj = bestMatch;
      bestTitle = cleanestTitle;
      bestApiInfo = thisApiInfo;
    }
  }
  // Optionally, try the original filename minus extension and year if still no match
  if (!bestOverall) {
    let orig = originalName.replace(/\.[^.]+$/, '').replace(/(19|20)\d{2}/, '').replace(/[_\-.]/g, ' ').trim();
    if (orig && !triedTitles.has(orig)) {
      let tmdbResult = null;
      let error = null;
      try {
        tmdbResult = await searchTMDB(orig, parsedTitle.year, 'movie');
        if (tmdbResult && tmdbResult.rawResponse) {
          apiLogger.info(`Full TMDB API response for original filename: ${orig}`, { rawResponse: tmdbResult.rawResponse });
        }
      } catch (e) {
        error = {
          message: e.message || String(e),
          stack: e.stack || null
        };
      }
      const thisApiInfo = {
        title: orig,
        url: tmdbResult ? tmdbResult.url : null,
        results: tmdbResult ? tmdbResult.results : null,
        rawResponse: tmdbResult ? tmdbResult.rawResponse : null,
        error: error || (tmdbResult ? tmdbResult.error : null)
      };
      apiInfo.push(thisApiInfo);
      const scoredResults = scoreResults(tmdbResult ? tmdbResult.results : [], orig, parsedTitle.year);
      const bestMatch = findBestMatch(scoredResults, orig);
      if (bestMatch && bestMatch.score > bestScore) {
        bestScore = bestMatch.score;
        bestOverall = bestMatch.result;
        bestType = 'movie';
        bestMatchObj = bestMatch;
        bestTitle = orig;
        bestApiInfo = thisApiInfo;
      }
    }
  }

  if (bestOverall) {
    let isMismatch = false;
    let info = null;
      isMismatch = bestMatchObj.resultYear !== parsedTitle.year;
    // Fetch full movie details
    let fullDetails = null;
    try {
      if (bestOverall.id) {
        fullDetails = await fetchTMDBResource(`movie/${bestOverall.id}`);
        const localizedMovieResult = await fetchLocalizedTMDBResourceWithStatus(`movie/${bestOverall.id}`, {}, fullDetails);
        mergeLocalizedResource('movie', localizedMovieResult.localized);
        mergeLocalizationChecks('movie', localizedMovieResult.checks);
      }
    } catch (e) { fullDetails = null; }
    // Fetch credits for the movie (if available)
    let credits = null;
    try {
      if (bestOverall.id) {
        credits = await fetchTMDBResource(`movie/${bestOverall.id}/credits`);
      }
    } catch (e) { credits = null; }
    // Fetch trailer videos
    let videos = [];
    try {
      if (bestOverall.id) {
        videos = await fetchVideos(bestOverall.id, 'movie');
      }
    } catch (e) { videos = []; }
    info = await handleMatchedResult(
      originalName,
      normalizeTMDBResult(bestOverall),
      bestMatchObj.resultYear,
      dirPath,
      isMismatch,
      { movie: fullDetails || bestOverall, credits, videos, localized: localizedPayload, localizationChecks },
      1,
      1,
      downloadCastImages
    );
    info.type = bestType;
    info.apiInfo = bestApiInfo ? [bestApiInfo] : [];
    return info;
  }

  apiLogger.warn(`No matching result found for year ${parsedTitle.year}`);
  // Log unmatched file
  try {
    const unmatchedLogPath = path.join(__dirname, 'logs', 'unmatched.log');
    const logEntry = JSON.stringify({
      time: new Date().toISOString(),
      originalName,
      parsedTitle
    }) + '\n';
    fs.appendFileSync(unmatchedLogPath, logEntry);
  } catch (e) {
    apiLogger.error('Failed to log unmatched file', e);
  }
  return { apiInfo };
}

module.exports = {
  searchVideoType,
  parseFileName
};