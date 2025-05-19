const { result: resultLogger, nameList: nameListLogger } = require('../logger.js');

function parseFileName(filename) {
    nameListLogger.info(`Starting filename parsing for: ${filename}`);

    const commonWordsSet = new Set([
        'for', 'to', 'in', 'on', 'at', 'by', 'from', 'as', 'into',
        'like', 'than', 'but', 'or', 'so'
    ]);

    const significantArticles = new Set(['a', 'an', 'the', 'and', 'with', 'of']);

    const mediaPatterns = {
        resolutions: [
            '1080p', '720p', '2160p', '4320p', '1440p', '480p', '360p', '4k', '8k',
            'sd', 'hd', 'uhd', 'fhd', 'qhd'
        ],
        quality: [
            'hdr10\\+?', 'hdr', 'dv', 'dolbyvision', 'remux', 'bluray', 'bdrip',
            'brrip(?:x264)?', 'dvdrip', 'web[\\s\\-]?dl', 'webdl', 'webrip', 'hdtv',
            'cam', 'tc', 'ts', 'hdts', 'r5', 'dvdscr', 'vhsrip', 'tvrip',
            'remastered', 'unrated', 'extended', 'directors\\s?cut', 'theatrical',
            'uncut', 'uncensored', 'final\\s?cut', 'special\\s?edition'
        ],
        codecs: [
            'x264', 'x265', 'h\\.264', 'h\\.265', 'hevc', 'avc', 'vp9', 'divx',
            'xvid', '10bit', '8bit', 'av1'
        ],
        groups: [
    'yts(?:\\.mx|\\.lt)?', 'yify', 'rarbg', 'ettv', 'evo', 'ntg', 'fgt',
    'ctrlhd', 'publichd', 'amiable', 'etrg', 'cmrg', 'framestor', 'epsilon',
    'decibel', 'tayto', 'hazmatt', 'bone', 'neonoir'  // Added NeoNoir here
],
        audio: [
            'aac[25]?', 'ac3', 'ddp[25]?', 'dts(?:-hd)?', 'truehd', 'flac', 'mp3',
            'ogg', 'eac3', 'opus', 'lpcm', 'pcm', 'he-aac', 'atmos', 'dolby\\s?digital',
            'dolby\\s?atmos', 'dts[\\s-]?x', '5\\.1'
        ],
        misc: [
            'e-sub', 'subbed', 'unrated', 'proper', 'repack', 'extended', 'limited',
            'dubbed', 'nf', 'amzn', 'hmax', 'dsnp', 'bbc', 'imdb', 'ptp', '3d',
            'camrip', 'bdr', 'rip', 'dub', 'dual', 'multi', 'subs?', 'read\\s?nfo',
            'internal', 'workprint', 'festival'
        ]
    };

const mediaRegex = new RegExp(
    Object.values(mediaPatterns).flat()
        .map(pattern => `(?:\\b|_|-|\\.)${pattern}(?=\\b|_|-|\\.|\\s|$)`)
        .join('|'),
    'gi'
);


    const yearRegex = /(?:^|[\s._\-([{])((?:19|20)\d{2})(?:$|[\s._\-)\]}]|\.)/;

    const numberingPatterns = [
        /(?:part|pt|volume|vol|movie|film|season|s|series)\s*(\d+)/i,
        /(\d)(?:st|nd|rd|th)\s+(?:part|season|movie|film)/i,
        /#(\d+)/,
        /dr\.\s*dolittle\s*(\d+)/i
    ];

    const originalName = filename.split('/').pop();
    nameListLogger.debug(`Original filename extracted: ${originalName}`);

    let base = originalName.toLowerCase().replace(/\.[^.]+$/, '');
    base = base.replace(/[_\-\.]/g, ' ');
base = base.replace(/web[\s\-]?dl/gi, ' ');

    nameListLogger.debug(`Base filename (no extension): ${base}`);

    const yearMatch = base.match(yearRegex);
    const year = yearMatch ? yearMatch[1] : null;
    nameListLogger.debug(`Detected year: ${year || 'None'}`);

    let movieNumber = null;
    for (const pattern of numberingPatterns) {
        const match = base.match(pattern);
        if (match) {
            movieNumber = match[1];
            nameListLogger.debug(`Detected part/season number: ${movieNumber}`);
            break;
        }
    }

    let clean = base
        .replace(/[\[\(\{][^\]\)\}]*[\]\)\}]/g, '')
        .replace(mediaRegex, ' ')
        .replace(/\b\d+(?:\.\d+)?\b/g, ' ')
        .replace(/[\._\-]+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

        clean = clean.replace(/-([a-z0-9]+)$/i, ' ');

    nameListLogger.debug(`Filename cleaned of media tags: ${clean}`);

    const processTitle = (str) => {
        return str.split(' ')
            .filter(w => w.length && !/^\d+$/.test(w))
            .filter(w => significantArticles.has(w.toLowerCase()) || w.length > 3 || !commonWordsSet.has(w.toLowerCase()))
            .map(w => w.length > 1 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w)
            .join(' ');
    };

    const cleanTitle = processTitle(clean);
    nameListLogger.debug(`Processed title: ${cleanTitle}`);

    const titleWords = cleanTitle.split(' ');
    const extendedTitles = new Set();
    extendedTitles.add(cleanTitle);

    for (let i = 2; i <= Math.min(5, titleWords.length); i++) {
        extendedTitles.add(titleWords.slice(0, i).join(' '));
    }

    for (let i = 2; i <= Math.min(4, titleWords.length); i++) {
        if (titleWords.length - i >= 2) {
            extendedTitles.add(titleWords.slice(-i).join(' '));
        }
    }

    if (titleWords.length > 2 && !significantArticles.has(titleWords[0].toLowerCase())) {
        extendedTitles.add(titleWords.slice(1).join(' '));
    }

    const sortedExtendedTitles = Array.from(extendedTitles).sort((a, b) => b.length - a.length);

    nameListLogger.debug(`Generated title variations: ${sortedExtendedTitles.join(' | ')}`);

    const result = {
        name: originalName,
        cleanTitle,
        year,
        movieNumber,
        extendedTitles: sortedExtendedTitles
    };

    nameListLogger.success(`Filename parsing successful for: ${originalName}`);
    nameListLogger.info(`Parse result`, {
        cleanTitle,
        year,
        movieNumber,
        titleVariations: sortedExtendedTitles.length
    });

    return result;
}

module.exports = parseFileName;
