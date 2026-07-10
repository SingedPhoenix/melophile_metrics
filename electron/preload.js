const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('melophileDesktop', {
  platform: process.platform,
  isElectron: true,
  readLocalConfig: () => ipcRenderer.invoke('melophile:read-local-config'),
  databaseStatus: () => ipcRenderer.invoke('melophile:database-status'),
  importLastfmScrobbles: rows => ipcRenderer.invoke('melophile:import-lastfm-scrobbles', { rows, mode: 'lastfm-cache' }),
  trackPlayCounts: tracks => ipcRenderer.invoke('melophile:track-play-counts', { tracks }),
  yearlyListeningRollups: () => ipcRenderer.invoke('melophile:yearly-listening-rollups'),
  listeningRollups: () => ipcRenderer.invoke('melophile:listening-rollups'),
  recentListening: limit => ipcRenderer.invoke('melophile:recent-listening', { limit }),
  ghostedTracks: options => ipcRenderer.invoke('melophile:ghosted-tracks', options)
});
