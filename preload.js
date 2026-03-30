const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Expose API methods to renderer process
contextBridge.exposeInMainWorld('api', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  scanDirectory: (dirPath) => ipcRenderer.invoke('scan-directory', dirPath),
  getSavedDir: () => ipcRenderer.invoke('get-saved-dir'),
  getLibraryContext: () => ipcRenderer.invoke('get-library-context'),
  setActiveLibrary: (libraryId) => ipcRenderer.invoke('set-active-library', libraryId),
  removeLibrary: (libraryId) => ipcRenderer.invoke('remove-library', libraryId),
  scanDirectoryStream: (dirPath, onProgress, onComplete, options = {}) => {
    console.log('[Preload] scanDirectoryStream called with:', { dirPath, options });

    // Only track our own local handlers - never wipe global onScanProgress listeners
    const progressHandler = onProgress ? (_, result) => {
      console.log('[Preload] Received scan-progress:', result.status, result.currentFileIndex + '/' + result.totalFiles);
      onProgress(result);
    } : null;

    const completeHandler = () => {
      console.log('[Preload] Received scan-complete');
      if (progressHandler) ipcRenderer.removeListener('scan-progress', progressHandler);
      if (onComplete) onComplete();
    };

    if (progressHandler) ipcRenderer.on('scan-progress', progressHandler);
    ipcRenderer.once('scan-complete', completeHandler);

    ipcRenderer.send('scan-directory-stream', { dirPath, options });
  },
  getLastScanResults: () => ipcRenderer.invoke('get-last-scan-results'),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  readPersonData: (personId) => ipcRenderer.invoke('read-person-data', personId),
  setTmdbApiKey: (key) => ipcRenderer.invoke('set-tmdb-api-key', key),
  refreshMovieData: (identifier) => ipcRenderer.invoke('refresh-movie-data', identifier),
  refreshMovieDataByTmdbId: (identifier, tmdbId) => ipcRenderer.invoke('refresh-movie-data-by-tmdb-id', { identifier, tmdbId }),
  searchTmdbByName: (query, mediaType, year) => ipcRenderer.invoke('search-tmdb-by-name', { query, mediaType, year }),
  clearScanResults: () => ipcRenderer.invoke('clear-scan-results'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  openPathInExplorer: (targetPath) => ipcRenderer.invoke('open-path-in-explorer', targetPath),
  // Storage management
  getStorageInfo: () => ipcRenderer.invoke('get-storage-info'),
  getMediaStorageList: () => ipcRenderer.invoke('get-media-storage-list'),
  clearTrailers: () => ipcRenderer.invoke('clear-trailers'),
  clearPeopleData: () => ipcRenderer.invoke('clear-people-data'),
  clearPosters: () => ipcRenderer.invoke('clear-posters'),
  deleteMovieData: (movieId) => ipcRenderer.invoke('delete-movie-data', { movieId }),
  getMovieStorage: (movieId) => ipcRenderer.invoke('get-movie-storage', { movieId }),
  deleteStorageItem: (item) => ipcRenderer.invoke('delete-storage-item', item),
  getTmdbImages: (tmdbId, mediaType) => ipcRenderer.invoke('get-tmdb-images', { tmdbId, mediaType }),
  getLocalImages: (tmdbId) => ipcRenderer.invoke('get-local-images', { tmdbId }),
  setLocalImage: (tmdbId, localPath, imageType) => ipcRenderer.invoke('set-local-image', { tmdbId, localPath, imageType }),
  downloadTmdbImage: (tmdbId, imageUrl, imageType) => ipcRenderer.invoke('download-tmdb-image', { tmdbId, imageUrl, imageType }),
  getTrailers: (tmdbId, mediaType) => ipcRenderer.invoke('get-trailers', { tmdbId, mediaType }),
  downloadTrailer: (videoKey) => ipcRenderer.invoke('download-trailer', { videoKey }),
  getTrailerStatuses: (videoKeys) => ipcRenderer.invoke('get-trailer-statuses', { videoKeys }),
  deleteTrailer: (videoKey) => ipcRenderer.invoke('delete-trailer', { videoKey }),
  onTrailerDownloadProgress: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('trailer-download-progress', handler);
    return () => ipcRenderer.removeListener('trailer-download-progress', handler);
  },
  onTrailerBatchComplete: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('trailer-batch-complete', handler);
    return () => ipcRenderer.removeListener('trailer-batch-complete', handler);
  },
  writeDebugLog: (message) => ipcRenderer.invoke('write-debug-log', message),
  setNetworkMode: (offline) => ipcRenderer.invoke('set-network-mode', { offline }),
  getNetworkStatus: () => ipcRenderer.invoke('get-network-status'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  refreshAllMetadata: () => ipcRenderer.invoke('refresh-all-metadata'),
  onRefreshProgress: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('refresh-progress', handler);
    return () => ipcRenderer.removeListener('refresh-progress', handler);
  },
  onScanProgress: (callback) => {
    console.log('[Preload] onScanProgress called, setting up listener');
    const handler = (_, data) => {
      console.log('[Preload] onScanProgress handler called with:', data);
      callback(data);
    };
    ipcRenderer.on('scan-progress', handler);
    console.log('[Preload] scan-progress listener set up');
    return () => {
      console.log('[Preload] Removing scan-progress listener');
      ipcRenderer.removeListener('scan-progress', handler);
    };
  },
  onScanComplete: (callback) => {
    const handler = () => {
      console.log('[Preload] onScanComplete fired');
      callback();
    };
    ipcRenderer.on('scan-complete', handler);
    return () => ipcRenderer.removeListener('scan-complete', handler);
  },
  onLibraryContextChanged: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('library-context-changed', handler);
    return () => ipcRenderer.removeListener('library-context-changed', handler);
  }
});

console.log('[Preload] API exposed to renderer');
