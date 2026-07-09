const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('melophileDesktop', {
  platform: process.platform,
  isElectron: true,
  readLocalConfig: () => ipcRenderer.invoke('melophile:read-local-config')
});
