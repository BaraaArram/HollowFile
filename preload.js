const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Expose API methods to renderer process
contextBridge.exposeInMainWorld('api', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  scanDirectory: (dirPath) => ipcRenderer.invoke('scan-directory', dirPath),
  getSavedDir: () => ipcRenderer.invoke('get-saved-dir'),
  scanDirectoryStream: (dirPath, onProgress, onComplete, options = {}) => {
    console.log('[Preload] scanDirectoryStream called with:', { dirPath, options });
    ipcRenderer.removeAllListeners('scan-progress');
    ipcRenderer.removeAllListeners('scan-complete');
    if (onProgress) {
      ipcRenderer.on('scan-progress', (_, result) => {
        console.log('[Preload] Received scan-progress:', result);
        onProgress(result);
      });
    }
    if (onComplete) {
      ipcRenderer.once('scan-complete', () => {
        console.log('[Preload] Received scan-complete');
        onComplete();
      });
    }
    ipcRenderer.send('scan-directory-stream', { dirPath, options });
  },
  getLastScanResults: () => ipcRenderer.invoke('get-last-scan-results'),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  readPersonData: (personId) => ipcRenderer.invoke('read-person-data', personId),
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
  }
});

console.log('[Preload] API exposed to renderer');
