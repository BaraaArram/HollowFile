const axios = require('axios');
const path = require('path');
const fs = require('fs');
const https = require('https');
require('dotenv').config();
const logger = require('./logger')('video-search'); // Use the logger with a unique name

const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!TMDB_API_KEY) {
  logger.error('TMDB_API_KEY is not set in .env file');
  process.exit(1);
}

function parseFileName(filename) {
  const commonWordsSet = new Set(['a', 'and', 'for', 'the', 'mind', 'justice', 'to', 'in', 'on', 'of']);

  const mediaRegex = new RegExp(
    [
      '1080p', '720p', '2160p', '4320p', '1440p', '480p', '360p', '4k', '8k', 'sd', 'hd', 'uhd',
      'hdr10\\+?', 'hdr', 'dv', 'dolbyvision', 'remux', 'bluray', 'bdrip', 'brrip', 'dvdrip', 'webrip',
      'web[\\s\\-]?dl', 'webdl', 'hdtv', 'cam', 'tc', 'ts', 'hdts', 'r5', 'dvdscr', 'vhsrip', 'tvrip',
      'x264', 'x265', 'h\\.264', 'h\\.265', 'hevc', 'avc', 'vp9', 'divx', 'xvid', '10bit', '8bit',
      'aac[25]?', 'ac3', 'ddp[25]?', 'dts(?:-hd)?', 'truehd', 'flac', 'mp3', 'ogg', 'eac3', 'opus',
      'lpcm', 'pcm', 'he-aac', 'atmos',
      'yts(?:\\.mx|\\.lt)?', 'yify', 'rarbg', 'ettv', 'evo', 'ntg', 'fgt', 'ctrlhd', 'publichd',
      'amiable', 'etrg', 'e-sub', 'subbed', 'unrated', 'proper', 'repack', 'extended', 'limited',
      'remastered', 'dubbed', 'nf', 'amzn', 'hmax', 'dsnp', 'bbc', 'imdb', 'ptp', '3d', 'camrip',
      'bdr', 'rip', 'dub', 'dual', 'multi', 'subs?'
    ].join('|'),
    'gi'
  );

  const yearRegex = /\b(19|20)\d{2}\b/;
  const movieNumberRegex = /dr\.\s*dolittle\s*(\d+)/i;

  const originalName = filename.split('/').pop();

  let base = originalName.toLowerCase();
  base = base.replace(/\.[^.]+$/, '');

  const yearMatch = base.match(yearRegex);
  const year = yearMatch ? yearMatch[0] : null;

  const movieNumberMatch = base.match(movieNumberRegex);
  const movieNumber = movieNumberMatch ? movieNumberMatch[1] : null;

  let clean = base
    .replace(/[\[\(\{].*?[\]\)\}]/g, '')
    .replace(mediaRegex, '')
    .replace(/\b(19|20)\d{2}\b/, '')
    .replace(/[\._\-]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const processTitle = (str) => {
    const words = str.split(' ').filter(w => w.length > 1 || commonWordsSet.has(w));
    const capitalized = words.map(w => w.charAt(0).toUpperCase() + w.slice(1));
    return capitalized.join(' ');
  };

  const withoutYear = processTitle(clean);
  const titleWords = withoutYear.split(' ');

  const extendedTitles = Array.from(new Set([
    withoutYear,
    titleWords.slice(0, 2).join(' '),
    titleWords.slice(0, 3).join(' '),
    titleWords.slice(0, 4).join(' '),
    titleWords.slice(-2).join(' '),
    titleWords.slice(-3).join(' '),
    titleWords.slice(-4).join(' ')
  ]));

  const result = {
    name: originalName,
    withoutYear,
    year,
    movieNumber,
    extendedTitles
  };

  logger.parsingLogger.info(`Parsed result: ${JSON.stringify({ name: originalName, withoutYear, year, movieNumber })}`);
  logger.parsingLogger.info(`Original: ${filename}`);
  logger.parsingLogger.info(`Extended Titles: ${extendedTitles.join(', ')}`);

  return result;
}

// The rest of your code remains unchanged, but make sure that if you pass `parsedData` or any object
// returned by `parseFileName`, you now have access to `.name` for faster lookup or use as needed.


// Function to download the poster image and save it to both 'posters' and 'saved' directories
async function downloadPosterImage(imagePath, posterPath) {
  const downloadImage = (url, path) => {
    const writer = fs.createWriteStream(path);
    https.get(url, (response) => {
      response.pipe(writer);
    });

    writer.on('finish', () => {
      logger.imageLogger.info(`Poster image saved to ${path}`);
    });

    writer.on('error', (err) => {
      logger.imageLogger.error(`Error saving poster image: ${err.message}`);
    });
  };

  // Function to clean the filename (remove leading/trailing dots but keep extension dots)
  const cleanFilename = (filepath) => {
    const dir = path.dirname(filepath);
    let filename = path.basename(filepath);
    
    // Remove all leading dots
    filename = filename.replace(/^\.+/g, '');
    
    // Ensure we don't end up with empty filename
    if (!filename) {
      filename = 'poster' + path.extname(filepath);
    }
    
    // Reconstruct path with cleaned filename
    return path.join(dir, filename);
  };

  const cleanPath = cleanFilename(posterPath);

  // Ensure directories exist before saving images
  const postersDir = path.dirname(cleanPath);
  
  if (!fs.existsSync(postersDir)) {
    fs.mkdirSync(postersDir, { recursive: true });
    logger.imageLogger.info(`Created directory: ${postersDir}`);
  }

  try {
    // Download and save the poster image
    await Promise.all([
      new Promise((resolve, reject) => {
        downloadImage(imagePath, cleanPath);
        resolve();
      })
    ]);

    logger.imageLogger.info(`Poster image successfully downloaded and saved at ${cleanPath}`);
  } catch (err) {
    logger.imageLogger.error(`Error during image download: ${err.message}`);
  }
}

// Helper function to handle matched results
async function handleMatchedResult(result, resultYear, dirPath, isMismatch = false) {
  const posterPath = path.resolve(dirPath, "Posters", `${result.title || result.name}_${resultYear}.jpg`);
  const posterUrl = `https://image.tmdb.org/t/p/w500${result.poster_path}`;

  await downloadPosterImage(posterUrl, posterPath);

  const resultData = {
    title: result.title || result.name,
    type: result.media_type,
    release_date: result.release_date || result.first_air_date,
    year_mismatch: isMismatch,
    poster_path: posterPath,
  };

  const resultsPath = path.resolve(__dirname, 'results.json');
  let results = [];
  if (fs.existsSync(resultsPath)) {
    results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
  }

  results.push(resultData);
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

  logger.apiLogger.info(`Successfully saved result for: ${result.title || result.name}`);
  return resultData;
}

// Function to find and return the existing movie data from results.json
function findMovieInResults(parsedData) {
  const resultsPath = path.resolve(__dirname, 'results.json');

  if (fs.existsSync(resultsPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

      if (!Array.isArray(results)) {
        logger.error('results.json is corrupted or not in the correct format. Expected an array.');
        return null;
      }

      // Normalize the parsed data for comparison
      const parsedTitle = parsedData.withoutYear.toLowerCase();
      const parsedYear = parsedData.year;
      const allTitleVariations = parsedData.extendedTitles.map(t => t.toLowerCase());

      for (const result of results) {
        // Safely get result title and year
        const resultTitle = (result.title || result.name || '').toLowerCase();
        const resultYear = (result.release_date || result.first_air_date || '').slice(0, 4);
        
        // Check if any title variation matches
        const titleMatch = allTitleVariations.some(variation => {
          return resultTitle.includes(variation) || variation.includes(resultTitle);
        });

        // Check year match (if we have both years to compare)
        const yearMatch = !parsedYear || !resultYear || parsedYear === resultYear;

        if (titleMatch && yearMatch) {
          logger.parsingLogger.info(`Found matching movie in results: ${result.title || result.name} (${resultYear})`);
          return result;
        }
      }
    } catch (err) {
      logger.error(`Error parsing results.json: ${err.message}`);
      return null;
    }
  }

  logger.parsingLogger.info('results.json does not exist yet or no match found.');
  return null;
}

// Function to search for video type (movie/TV show) using the TMDb API
async function searchVideoType(titleList, expectedYear, dirPath) {
  const MAX_YEAR_DIFFERENCE = 2; // Maximum allowed year difference for matches

  if (!Array.isArray(titleList)) {
    logger.error('Expected titleList to be an array');
    throw new TypeError('Expected titleList to be an array');
  }

  const sortedTitles = titleList.sort((a, b) => b.length - a.length);
  const primaryTitle = sortedTitles[0];

  logger.apiLogger.info(`Starting search for: ${primaryTitle}`);

  const parsedData = parseFileName(primaryTitle);

  // First check if the movie exists in results.json and return it if found
  const existingResult = findMovieInResults(parsedData);
  if (existingResult) {
    logger.apiLogger.info(`Found existing result in JSON: ${existingResult.title} (${existingResult.release_date || existingResult.first_air_date})`);
    return existingResult;
  }

  function getSimilarity(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length <= s2.length ? s1 : s2;
    const longerLength = longer.length;
    if (longerLength === 0) return 1.0;
    
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
  }

  function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  for (const title of sortedTitles) {
    const query = encodeURIComponent(title);
    const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${query}&year=${expectedYear}`;

    logger.apiLogger.info(`Making API request: ${url}`);

    try {
      const response = await axios.get(url);
      const data = response.data;

      if (data.results && data.results.length > 0) {
        logger.apiLogger.info(`Received ${data.results.length} results for query: ${title}`);

        let exactNameMatches = [];
        let otherMatches = [];

        for (const result of data.results) {
          const resultTitle = result.title || result.name;
          const resultYear = result.release_date
            ? result.release_date.split('-')[0]
            : result.first_air_date
            ? result.first_air_date.split('-')[0]
            : null;

          if (!resultYear) continue;

          const titleSimilarity = getSimilarity(title, resultTitle);
          const yearDiff = Math.abs(Number(resultYear) - Number(expectedYear));
          const normalizedYearDiff = Math.min(yearDiff, MAX_YEAR_DIFFERENCE) / MAX_YEAR_DIFFERENCE;
          const score = (titleSimilarity * 0.7) + ((1 - normalizedYearDiff) * 0.3);

          if (titleSimilarity > 0.9) {
            exactNameMatches.push({ result, resultYear, yearDiff, score });
          } else {
            otherMatches.push({ result, resultYear, yearDiff, score });
          }
        }

        // Priority 1: Exact name with year within threshold
        const exactNameCloseYear = exactNameMatches.filter(m => m.yearDiff <= MAX_YEAR_DIFFERENCE);
        if (exactNameCloseYear.length > 0) {
          exactNameCloseYear.sort((a, b) => a.yearDiff - b.yearDiff || b.score - a.score);
          const bestExactNameMatch = exactNameCloseYear[0];
          const isMismatch = bestExactNameMatch.yearDiff !== 0;
          logger.apiLogger.info(`Found exact name with ${isMismatch ? 'close' : 'exact'} year match: ${bestExactNameMatch.result.title || bestExactNameMatch.result.name} (${bestExactNameMatch.resultYear})`);
          return await handleMatchedResult(bestExactNameMatch.result, bestExactNameMatch.resultYear, dirPath, isMismatch);
        }

        // Priority 2: Similar name with year within threshold
        const closestNameCloseYear = otherMatches.filter(m => m.yearDiff <= MAX_YEAR_DIFFERENCE);
        if (closestNameCloseYear.length > 0) {
          closestNameCloseYear.sort((a, b) => a.yearDiff - b.yearDiff || b.score - a.score);
          const bestCloseYearMatch = closestNameCloseYear[0];
          const isMismatch = bestCloseYearMatch.yearDiff !== 0;
          logger.apiLogger.info(`Using closest name with ${isMismatch ? 'close' : 'exact'} year match: ${bestCloseYearMatch.result.title || bestCloseYearMatch.result.name} (${bestCloseYearMatch.resultYear})`);
          return await handleMatchedResult(bestCloseYearMatch.result, bestCloseYearMatch.resultYear, dirPath, isMismatch);
        }

        logger.apiLogger.warn(`No matching result found within ${MAX_YEAR_DIFFERENCE} year(s) difference for ${title}`);
      } else {
        logger.apiLogger.warn(`No results returned for query: ${title}`);
      }
    } catch (err) {
      logger.apiLogger.error(`API request failed for ${url}: ${err.message}`);
    }
  }

  logger.apiLogger.warn(`No matching result found for year ${expectedYear} after trying all title variations`);
  return null;
}

module.exports = {
  parseFileName,
  searchVideoType,
};