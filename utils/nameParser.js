const { result: resultLogger, nameList: nameListLogger } = require('../logger.js');

function parseFileName(filename) {
    nameListLogger.info(`Starting filename parsing for: ${filename}`);

    // --- Token-based parsing for robustness ---
    const groupTagList = [
      'yts', 'yify', 'rarbg', 'ettv', 'evo', 'ntg', 'fgt', 'ctrlhd', 'publichd', 'amiable', 'etrg', 'cmrg', 'framestor', 'epsilon', 'decibel', 'tayto', 'hazmatt', 'bone', 'neonoir', 'bokutox', 'gaz', 'edge2020', 'vppv', 'flhd', 'cakes', 'neoNoir', 'yts.mx', 'yts.ag', 'yts.lt', 'evo', 'aac', 'ddp', 'dts', 'truehd', 'ac3', 'mp3', 'ogg', 'opus', 'lpcm', 'pcm', 'he-aac', 'atmos', 'bluray', 'brrip', 'webdl', 'webrip', 'hdtv', 'remux', 'remastered', 'unrated', 'repack', 'limited', 'dubbed', 'nf', 'amzn', 'hmax', 'dsnp', 'bbc', 'imdb', 'ptp', '3d', 'camrip', 'bdr', 'rip', 'dub', 'dual', 'multi', 'subs', 'read', 'nfo', 'internal', 'workprint', 'festival', 'proper', 'edge2020', 'neoNoir', 'vppv', 'yts', 'yify', 'gaz', 'edge2020', 'neonoir', 'vppv', 'bz', 'pophd', 'sparks', 'geckos', 'usury', 'flux', 'playnow', 'stuttershit', 'tigole', 'qxr'
    ];
    const mediaTagList = [
      '1080p', '720p', '2160p', '4320p', '1440p', '480p', '360p', '4k', '8k', 'sd', 'hd', 'uhd', 'fhd', 'qhd',
      'hdr10', 'hdr', 'dv', 'dolbyvision', 'remux', 'bluray', 'bdrip', 'brrip', 'dvdrip', 'webdl', 'webrip', 'hdtv',
      'cam', 'tc', 'ts', 'hdts', 'r5', 'dvdscr', 'vhsrip', 'tvrip', 'remastered', 'unrated', 'extended', 'directors', 'cut', 'theatrical', 'uncut', 'uncensored', 'final', 'special', 'edition', 'aac', 'ac3', 'ddp', 'dts', 'truehd', 'flac', 'mp3', 'ogg', 'eac3', 'opus', 'lpcm', 'pcm', 'he-aac', 'atmos', 'dolby', 'subs', 'subbed', 'dubbed', 'multi', 'dual', 'nf', 'amzn', 'hmax', 'dsnp', 'bbc', 'imdb', 'ptp', '3d', 'camrip', 'bdr', 'rip', 'dub', 'internal', 'workprint', 'festival', 'proper', 'repack', 'limited', 'read', 'nfo', 'internal', 'workprint', 'festival', 'web', 'dl', 'hdr', 'hdr10', 'dv', 'dolbyvision', 'remux', 'bluray', 'bdrip', 'brrip', 'dvdrip', 'webdl', 'webrip', 'hdtv', 'cam', 'tc', 'ts', 'hdts', 'r5', 'dvdscr', 'vhsrip', 'tvrip', 'remastered', 'unrated', 'extended', 'directors', 'cut', 'theatrical', 'uncut', 'uncensored', 'final', 'special', 'edition'
    ];
    // 2-letter ISO 639-1 language codes (common in filenames)
    const langTags = [
      'en', 'fr', 'de', 'es', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'nl', 'pl', 'sv', 'no', 'da', 'fi', 'cs', 'hu', 'ro', 'tr', 'ar', 'hi', 'th', 'vi', 'el', 'he', 'uk', 'bg', 'hr', 'sk', 'sl', 'et', 'lt', 'lv', 'id', 'ms', 'tl'
    ];
    // Expanded tag list for technical tokens and scene suffixes
    const extraTechTags = [
      'x264', 'x265', 'h264', 'h265', 'hevc', 'avc', 'aac', 'aac5', 'aac2', 'ddp', 'dts', 'truehd', 'ac3', 'mp3', 'ogg', 'opus', 'lpcm', 'pcm', 'eac3', 'flac', '5.1', '7.1', '2.0', '10bit', '8bit', 'hdr', 'hdr10', 'dv', 'remux', 'web', 'rip', 'bluray', 'brrip', 'webrip', 'webdl', 'hdtv', 'br', 'repack', 'remastered', 'unrated', 'limited', 'dubbed', 'multi', 'subs', 'subbed', 'nf', 'amzn', 'hmax', 'dsnp', 'bbc', 'imdb', 'ptp', '3d', 'camrip', 'bdr', 'internal', 'workprint', 'festival', 'proper', 'read', 'nfo', 'mx', 'yify', 'yts', 'rarbg', 'gaz', 'edge2020', 'neonoir', 'vppv', 'flhd', 'cakes', 'evo', 'yts.mx', 'yts.ag', 'yts.lt', 'hi', 'eng', 'spa', 'ita', 'fre', 'ger', 'rus', 'jpn', 'kor', 'chs', 'cht', 'sub', 'subs', 'dub', 'dubbed', 'dual', 'multi', 'plus', 'minus', 'atmos', 'dolby', 'vision', 'hdrip', 'dvdrip', 'dvdscr', 'vhsrip', 'tvrip', 'cam', 'tc', 'ts', 'hdts', 'r5', 'dvdscr', 'vhsrip', 'tvrip', 'remux', 'bluray', 'bdrip', 'brrip', 'dvdrip', 'webdl', 'webrip', 'hdtv', 'cam', 'tc', 'ts', 'hdts', 'r5', 'dvdscr', 'vhsrip', 'tvrip', 'remastered', 'unrated', 'extended', 'directors', 'cut', 'theatrical', 'uncut', 'uncensored', 'final', 'special', 'edition'
    ];
    const allTags = new Set([...groupTagList, ...mediaTagList, ...extraTechTags]);
    const langTagSet = new Set(langTags);
    // Regex to match codec-like tokens (x264, h265, x244 typos, etc.)
    const codecRegex = /^[xh]\d{3}$/i;
    const yearRegex = /(?:^|[\s._\-([{])((?:19|20)\d{2})(?:$|[\s._\-)\]}]|\.)/;
    const tvPatterns = [
        /S(\d{1,2})E(\d{1,2})/i,         // S01E02
        /s(\d{1,2})e(\d{1,2})/i,         // s01e02
        /(\d{1,2})x(\d{1,2})/i,          // 1x02
        /Season[ ._\-]?(\d{1,2})[ ._\-]?Episode[ ._\-]?(\d{1,2})/i, // Season 1 Episode 2
        /Ep(isode)?[ ._\-]?(\d{1,2})/i,  // Ep02 or Episode 02
    ];
    const originalName = filename.split('/').pop();
    let base = originalName.replace(/\.[^.]+$/, '');
    // Tokenize on non-alphanumeric boundaries
    let tokens = base.split(/[^a-zA-Z0-9]+/).filter(Boolean);
    // Detect year
    let year = null;
    for (const tok of tokens) {
      if (/^(19|20)\d{2}$/.test(tok)) {
        year = tok;
            break;
        }
    }
    // Remove year token
    tokens = tokens.filter(tok => tok !== year);
    // TV show detection
    let isTV = false, season = null, episode = null, tvMatchIndex = -1, yearIndex = -1;
    let showNameTokens = tokens.slice();
    // Find index of first TV pattern
    for (let i = 0; i < tokens.length; i++) {
    for (const pattern of tvPatterns) {
        if (pattern.test(tokens[i])) {
            isTV = true;
          const match = tokens[i].match(pattern);
            season = match[1] ? parseInt(match[1], 10) : null;
            episode = match[2] ? parseInt(match[2], 10) : null;
          if (tvMatchIndex === -1) tvMatchIndex = i;
            break;
        }
    }
      if (isTV && tvMatchIndex !== -1) break;
    }
    // Find index of year (if any)
    for (let i = 0; i < tokens.length; i++) {
      if (/^(19|20)\d{2}$/.test(tokens[i])) {
        yearIndex = i;
        break;
      }
    }
    // If TV show, use all tokens before the SxxEyy (or similar) or year as show name
    let tvCleanTitle = null;
    let movieNumber = null;
    const extendedTitles = new Set();
    if (isTV) {
      let cutIndex = (tvMatchIndex !== -1 ? tvMatchIndex : tokens.length);
      if (yearIndex !== -1 && yearIndex < cutIndex) cutIndex = yearIndex;
      showNameTokens = tokens.slice(0, cutIndex);
      // Remove trailing year (if present)
      if (showNameTokens.length && /^(19|20)\d{2}$/.test(showNameTokens[showNameTokens.length - 1])) {
        showNameTokens.pop();
      }
      // Remove trailing numbers that are not part of the title (but keep numbers inside the title)
      while (showNameTokens.length && /^\d+$/.test(showNameTokens[showNameTokens.length - 1]) && showNameTokens.length > 1) {
        showNameTokens.pop();
      }
      // Do NOT remove any tags or filter any tokens for TV shows
      tvCleanTitle = showNameTokens
        .map(w => w.length > 1 ? w.charAt(0).toUpperCase() + w.slice(1) : w.toUpperCase())
        .join(' ');
      cleanTitle = tvCleanTitle;
      extendedTitles.clear();
      if (tvCleanTitle) extendedTitles.add(tvCleanTitle);
    } else {
      // For movies, build extendedTitles as before
      tokens = tokens.filter(tok => {
        if (allTags.has(tok.toLowerCase()) || codecRegex.test(tok)) return false;
        // Only strip 2-letter language codes if the token is ALL UPPERCASE (e.g. "FR" but not "No")
        if (tok.length === 2 && tok === tok.toUpperCase() && langTagSet.has(tok.toLowerCase())) return false;
        return true;
      });
      // Remove isolated numbers
      tokens = tokens.filter(tok => !/^\d+$/.test(tok));
      cleanTitle = tokens.map(w => w.length > 1 ? w.charAt(0).toUpperCase() + w.slice(1) : w.toUpperCase()).join(' ');
      const titleWords = (cleanTitle || '').split(' ');
    for (let i = 2; i <= Math.min(5, titleWords.length); i++) {
        extendedTitles.add(titleWords.slice(0, i).join(' '));
    }
    for (let i = 2; i <= Math.min(4, titleWords.length); i++) {
        if (titleWords.length - i >= 2) {
            extendedTitles.add(titleWords.slice(-i).join(' '));
        }
    }
      if (titleWords.length > 2) {
        extendedTitles.add(titleWords.slice(1).join(' '));
      }
    }
    let sortedExtendedTitles = Array.from(extendedTitles).sort((a, b) => b.length - a.length);
    // For TV shows, set cleanTitle to the first entry in extendedTitles (the full show name)
    if (isTV) {
      cleanTitle = sortedExtendedTitles[0] || '';
    }
    // After building cleanTitle, remove any remaining technical tokens (all uppercase, all digits, or known tech patterns) ONLY for movies
    if (!isTV) {
      cleanTitle = cleanTitle
        .split(' ')
        .filter(w => {
          if (!w) return false;
          if (/^\d+$/.test(w)) return false; // all digits
          if (/^[A-Z0-9\-\.\+]+$/.test(w) && w.length <= 6) return false; // all uppercase/tech
          if (allTags.has(w.toLowerCase())) return false;
          return true;
        })
        .join(' ');
      // --- Remove any word that exactly matches a known tag (case-insensitive), codec pattern, or uppercase lang code ---
      cleanTitle = cleanTitle
        .split(' ')
        .filter(w => {
          if (allTags.has(w.toLowerCase()) || codecRegex.test(w)) return false;
          if (w.length === 2 && w === w.toUpperCase() && langTagSet.has(w.toLowerCase())) return false;
          return true;
        })
        .join(' ');
      // Rebuild extendedTitles from the fully cleaned title
      extendedTitles.clear();
      const cleanedWords = (cleanTitle || '').split(' ').filter(Boolean);
      for (let i = 2; i <= Math.min(5, cleanedWords.length); i++) {
        extendedTitles.add(cleanedWords.slice(0, i).join(' '));
      }
      for (let i = 2; i <= Math.min(4, cleanedWords.length); i++) {
        if (cleanedWords.length - i >= 2) {
          extendedTitles.add(cleanedWords.slice(-i).join(' '));
        }
      }
      if (cleanedWords.length > 2) {
        extendedTitles.add(cleanedWords.slice(1).join(' '));
      }
      if (cleanTitle) extendedTitles.add(cleanTitle);
      // Re-sort after rebuild
      sortedExtendedTitles = Array.from(extendedTitles).sort((a, b) => b.length - a.length);
    }
    const result = {
        name: originalName,
        cleanTitle,
        year,
        movieNumber,
        extendedTitles: sortedExtendedTitles,
        isTV,
        season,
        episode
    };
    result.originalName = filename;
    nameListLogger.success(`Filename parsing successful for: ${originalName}`);
    nameListLogger.info(`Parse result`, {
        cleanTitle,
        year,
        movieNumber,
        isTV,
        season,
        episode,
        titleVariations: sortedExtendedTitles.length
    });
    return result;
}

// 5. Add robust test cases for edge cases
if (require.main === module) {
  const testFiles = [
    // Real-world edge cases
    'The.Lord.of.the.Rings.The.Return.of.the.King.2003.EXTENDED.1080p.BluRay.x264.YIFY.mp4',
    'Spider-Man.No.Way.Home.2021.2160p.WEB-DL.DDP5.1.Atmos.HDR10.x265-EVO.mkv',
    '1917.2019.1080p.BluRay.x264.YIFY.mp4',
    'WALL-E.2008.1080p.BluRay.x264.YIFY.mp4',
    'Dr.Strangelove.or.How.I.Learned.to.Stop.Worrying.and.Love.the.Bomb.1964.1080p.BluRay.x264.YIFY.mp4',
    'Star.Wars.Episode.IV.A.New.Hope.1977.1080p.BluRay.x264.YIFY.mp4',
    'The.Matrix.Resurrections.2021.1080p.HMAX.WEBRip.DDP5.1.x264-EVO.mkv',
    'The.Godfather.Part.II.1974.1080p.BluRay.x264.YIFY.mp4',
    'The.Simpsons.S32E01.1080p.WEB.H264-CAKES.mkv',
    'Sherlock.2010.S01E01.A.Study.in.Pink.1080p.BluRay.x264-FLHD.mkv',
    '12.Monkeys.1995.1080p.BluRay.x264.YIFY.mp4',
    '2.Fast.2.Furious.2003.1080p.BluRay.x264.YIFY.mp4',
    'The.Lego.Movie.2014.1080p.BluRay.x264.YIFY.mp4',
    'The.Lego.Batman.Movie.2017.1080p.BluRay.x264.YIFY.mp4',
    'The.Lion.King.2019.1080p.BluRay.x264.YIFY.mp4',
    'The.Lion.King.1994.1080p.BluRay.x264.YIFY.mp4',
    // Previous edge cases
    'Argo.Extended.Cut.2012.1080p.BRrip.x264.GAZ.mp4',
    'Collateral.2004.REPACK.1080p.BluRay.x264.AAC5.1-[YTS.MX].mp4',
    'Conclave.2024.1080p.WEBRip.x264.AAC5.1-[YTS.MX].mp4',
    'Dodgeball.2004.1080p.BluRay.x265-RARBG.mp4',
    'Drop.2025.1080p.WEBRip.x264.AAC5.1-[YTS.MX].mp4',
    'Moneyball.2011.REMASTERED.REPACK.1080p.BluRay.x264.AAC5.1-[YTS.MX].mp4',
    'My.Cousin.Vinny.1992.1080p.BluRay.x264-[YTS.AG].mp4',
    'Neighbors.2.Sorority.Rising.2016.1080p.BluRay.DDP.5.1.x265-EDGE2020.mkv',
    'Novocaine.2025.1080p.WEB-DL.DDP5.1.x265-NeoNoir.mkv',
    'Out.of.Sight.1998.1080p.BluRay.x264.VPPV.mp4',
    'Saving.Silverman.2001.1080p.BluRay.x264.AAC-[YTS.MX].mp4',
    'Sin.City.EXTENDED.UNRATED.2005.1080p.BrRip.x264.YIFY+HI.mp4',
    'The.Mummy.Tomb.of.The.Dragon.Emperor.2008.1080p.BRrip.x264.GAZ.YIFY.mp4',
    'The.Silence.Of.The.Lambs.1991.1080p.BluRay.X264.YIFY.mp4',
    // --- TV show edge case ---
    'Mythic.Quest.S01E01.1080p.WEB.H264-CAKES.mkv',
    'Interior.Chinatown.S01E10.1080p.WEBRip.x265-KONTRAST.mp4',
    'The.Mandalorian.S02E05.2160p.WEB-DL.DDP5.1.Atmos.HDR10.x265-EVO.mkv',
    'Better.Call.Saul.S06E13.1080p.AMZN.WEBRip.DDP5.1.x264-NTb.mkv',
    'Parks.and.Recreation.S04E22.720p.BluRay.x264-DEMAND.mkv',
    'Brooklyn.Nine-Nine.S05E10.720p.HDTV.x264-AVS.mkv',
    'Star.Trek.Picard.S03E01.1080p.AMZN.WEBRip.DDP5.1.x264-NTb.mkv',
    'The.Great.British.Bake.Off.S11E01.720p.HDTV.x264-ORGANiC.mkv',
    'Law.and.Order.SVU.S21E12.720p.HDTV.x264-AVS.mkv',
    'Marvels.Agents.of.S.H.I.E.L.D.S07E13.720p.HDTV.x264-AVS.mkv',
    'The.Big.Bang.Theory.S12E24.1080p.BluRay.x264-ROVERS.mkv',
    'How.I.Met.Your.Mother.S09E23.720p.HDTV.x264-KILLERS.mkv',
    'Game.of.Thrones.S08E06.1080p.WEB.H264-MEMENTO.mkv',
    'Fargo.S04E11.1080p.AMZN.WEBRip.DDP5.1.x264-NTb.mkv',
    'Chernobyl.2019.S01E05.1080p.BluRay.x264-ROVERS.mkv',
    'The.Walking.Dead.S10E16.1080p.AMZN.WEBRip.DDP5.1.x264-NTb.mkv',
    'Stranger.Things.S03E08.1080p.NF.WEB-DL.DDP5.1.x264-NTG.mkv',
    'Rick.and.Morty.S04E10.1080p.HMAX.WEBRip.DD5.1.x264-NTb.mkv',
    'The.Office.US.S09E23.1080p.BluRay.x264-ROVERS.mkv',
    'Friends.S10E17.1080p.BluRay.x264-ROVERS.mkv',
  ];
  for (const file of testFiles) {
    const result = parseFileName(file);
    console.log(`\nFile: ${file}`);
    console.log('cleanTitle:', result.cleanTitle);
    console.log('movieNumber:', result.movieNumber);
    console.log('year:', result.year);
    console.log('isTV:', result.isTV);
    console.log('extendedTitles:', result.extendedTitles);
  }
}

module.exports = parseFileName;
