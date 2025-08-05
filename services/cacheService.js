const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class CacheService {
  constructor() {
    this.cacheDir = path.join(process.cwd(), 'cache');
    this.unmatchedCacheFile = path.join(this.cacheDir, 'unmatched.json');
    this.ensureCacheDir();
    this.cache = this.loadCache();
  }

  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    if (!fs.existsSync(this.unmatchedCacheFile)) {
      fs.writeFileSync(this.unmatchedCacheFile, '{}', 'utf8');
    }
  }

  loadCache() {
    try {
      const data = fs.readFileSync(this.unmatchedCacheFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading cache:', error);
      return {};
    }
  }

  saveCache() {
    try {
      fs.writeFileSync(this.unmatchedCacheFile, JSON.stringify(this.cache, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  generateKey(filename, fileStats) {
    // Create a unique key based on filename and file stats
    const data = `${filename}|${fileStats.size}|${fileStats.mtimeMs}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  getUnmatched(filename, fileStats) {
    const key = this.generateKey(filename, fileStats);
    return this.cache[key];
  }

  setUnmatched(filename, fileStats, data) {
    const key = this.generateKey(filename, fileStats);
    this.cache[key] = {
      filename,
      stats: {
        size: fileStats.size,
        mtime: fileStats.mtimeMs
      },
      data,
      timestamp: Date.now()
    };
    this.saveCache();
  }

  clearCache() {
    this.cache = {};
    this.saveCache();
  }

  removeEntry(filename, fileStats) {
    const key = this.generateKey(filename, fileStats);
    delete this.cache[key];
    this.saveCache();
  }
}

module.exports = new CacheService(); 