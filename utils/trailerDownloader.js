const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { app } = require('electron');

const TRAILERS_DIR = path.join(app.getPath('userData'), 'trailers');
const BIN_DIR = path.join(app.getPath('userData'), 'bin');
const YT_DLP_EXE = path.join(BIN_DIR, 'yt-dlp.exe');

const YT_DLP_DOWNLOAD_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getTrailerPath(videoKey) {
  return path.join(TRAILERS_DIR, `${videoKey}.mp4`);
}

function isDownloaded(videoKey) {
  return fs.existsSync(getTrailerPath(videoKey));
}

/** Find yt-dlp: check PATH first, then local bin */
function findYtDlp() {
  // Check local binary first (most reliable)
  if (fs.existsSync(YT_DLP_EXE)) return YT_DLP_EXE;
  // Check PATH
  try {
    execFileSync('yt-dlp', ['--version'], { stdio: 'ignore', windowsHide: true });
    return 'yt-dlp';
  } catch {}
  return null;
}

/** Download yt-dlp.exe to app's bin directory */
function downloadYtDlp(onProgress) {
  ensureDir(BIN_DIR);
  return new Promise((resolve, reject) => {
    const follow = (url, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      https.get(url, { headers: { 'User-Agent': 'HollowFile' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return follow(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
        }
        const totalBytes = parseInt(res.headers['content-length'], 10) || 0;
        let downloaded = 0;
        const file = fs.createWriteStream(YT_DLP_EXE);
        res.on('data', (chunk) => {
          downloaded += chunk.length;
          if (onProgress && totalBytes) {
            onProgress(Math.round((downloaded / totalBytes) * 100));
          }
        });
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(YT_DLP_EXE); });
        file.on('error', (err) => { fs.unlink(YT_DLP_EXE, () => {}); reject(err); });
      }).on('error', reject);
    };
    follow(YT_DLP_DOWNLOAD_URL);
  });
}

/** Ensure yt-dlp is available, downloading if needed */
async function ensureYtDlp(onProgress) {
  const existing = findYtDlp();
  if (existing) return existing;
  if (onProgress) onProgress(0);
  return downloadYtDlp(onProgress);
}

/**
 * Download a YouTube trailer by video key.
 * Returns the local file path.
 * onProgress(percent) called with 0-100.
 */
async function downloadTrailer(videoKey, onProgress, quality) {
  if (!videoKey || typeof videoKey !== 'string' || !/^[\w-]+$/.test(videoKey)) {
    throw new Error('Invalid video key');
  }

  const outputPath = getTrailerPath(videoKey);
  ensureDir(TRAILERS_DIR);

  const maxHeight = parseInt(quality, 10) || 1080;
  console.log(`[Trailer] Starting download for key: ${videoKey} (quality: ${maxHeight}p)`);
  console.log(`[Trailer] Output path: ${outputPath}`);

  if (fs.existsSync(outputPath)) {
    console.log(`[Trailer] Already downloaded: ${outputPath}`);
    return outputPath;
  }

  console.log(`[Trailer] Ensuring yt-dlp is available...`);
  const ytDlp = await ensureYtDlp((pct) => {
    console.log(`[Trailer] Downloading yt-dlp: ${pct}%`);
    if (onProgress) onProgress(pct * 0.1);
  });
  console.log(`[Trailer] Using yt-dlp at: ${ytDlp}`);

  if (onProgress) onProgress(0);

  return new Promise((resolve, reject) => {
    const args = [
      '-f', `best[ext=mp4][height<=${maxHeight}]/best[ext=mp4]/best`,
      '--no-playlist',
      '--progress',
      '--newline',
      '-o', outputPath,
      `https://www.youtube.com/watch?v=${videoKey}`
    ];

    console.log(`[Trailer] Spawning: ${ytDlp} ${args.join(' ')}`);
    const proc = spawn(ytDlp, args, { windowsHide: true });
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) console.log(`[Trailer][stdout] ${line.trim()}`);
        const match = line.match(/\[download\]\s+([\d.]+)%/);
        if (match && onProgress) {
          const dlPct = parseFloat(match[1]);
          onProgress(Math.round(dlPct));
        }
      }
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.trim()) console.log(`[Trailer][stderr] ${line.trim()}`);
        // yt-dlp sometimes sends progress to stderr
        const match = line.match(/\[download\]\s+([\d.]+)%/);
        if (match && onProgress) {
          const dlPct = parseFloat(match[1]);
          onProgress(Math.round(dlPct));
        }
      }
    });

    proc.on('close', (code) => {
      console.log(`[Trailer] yt-dlp exited with code: ${code}`);
      if (code === 0 && fs.existsSync(outputPath)) {
        console.log(`[Trailer] Download complete: ${outputPath}`);
        if (onProgress) onProgress(100);
        resolve(outputPath);
      } else {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        const errMsg = stderr || `yt-dlp exited with code ${code}`;
        console.error(`[Trailer] Download failed: ${errMsg}`);
        reject(new Error(errMsg));
      }
    });

    proc.on('error', (err) => {
      console.error(`[Trailer] Failed to run yt-dlp: ${err.message}`);
      reject(new Error(`Failed to run yt-dlp: ${err.message}`));
    });
  });
}

/** Delete a downloaded trailer */
function deleteTrailer(videoKey) {
  const p = getTrailerPath(videoKey);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

/** Get status of all trailers for a list of video keys */
function getTrailerStatuses(videoKeys) {
  return videoKeys.map(key => ({
    key,
    downloaded: isDownloaded(key),
    path: isDownloaded(key) ? getTrailerPath(key) : null
  }));
}

module.exports = {
  downloadTrailer,
  deleteTrailer,
  isDownloaded,
  getTrailerPath,
  getTrailerStatuses,
  ensureYtDlp,
  TRAILERS_DIR
};
