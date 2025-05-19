const { contextBridge, ipcRenderer } = require('electron');

// Expose API methods to renderer process
contextBridge.exposeInMainWorld('api', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  scanDirectory: (dirPath) => ipcRenderer.invoke('scan-directory', dirPath),
  getSavedDir: () => ipcRenderer.invoke('get-saved-dir'),
});
