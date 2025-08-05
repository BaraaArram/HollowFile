const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Expose API methods to renderer process
contextBridge.exposeInMainWorld('api', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  scanDirectory: (dirPath) => ipcRenderer.invoke('scan-directory', dirPath),
  getSavedDir: () => ipcRenderer.invoke('get-saved-dir'),
  scanDirectoryStream: (dirPath, onProgress, onComplete) => {
    // Clean up any existing listeners first
    ipcRenderer.removeAllListeners('scan-progress');
    ipcRenderer.removeAllListeners('scan-complete');
    
    // Set up new listeners
    if (onProgress) {
      ipcRenderer.on('scan-progress', (_, result) => {
        console.log('[Preload] Scan progress:', result); // Debug log
        onProgress(result);
      });
    }
    if (onComplete) {
      ipcRenderer.once('scan-complete', () => {
        console.log('[Preload] Scan complete'); // Debug log
        onComplete();
      });
    }
    
    // Start the scan
    ipcRenderer.send('scan-directory-stream', dirPath);
  },
  getLastScanResults: () => ipcRenderer.invoke('get-last-scan-results'),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  onScanProgress: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('scan-progress', handler);
    return () => ipcRenderer.removeListener('scan-progress', handler);
  }
});
