const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('melophileDesktop', {
  platform: process.platform,
  isElectron: true,
  readLocalConfig: () => ipcRenderer.invoke('melophile:read-local-config'),
  databaseStatus: () => ipcRenderer.invoke('melophile:database-status'),
  importLastfmScrobbles: rows => ipcRenderer.invoke('melophile:import-lastfm-scrobbles', { rows, mode: 'lastfm-cache' }),
  trackPlayCounts: tracks => ipcRenderer.invoke('melophile:track-play-counts', { tracks })
});
