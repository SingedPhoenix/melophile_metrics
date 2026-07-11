const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('melophileDesktop', {
  platform: process.platform,
  isElectron: true,
  readLocalConfig: () => ipcRenderer.invoke('melophile:read-local-config'),
  databaseStatus: () => ipcRenderer.invoke('melophile:database-status'),
  importLastfmScrobbles: rows => ipcRenderer.invoke('melophile:import-lastfm-scrobbles', { rows, mode: 'lastfm-cache' }),
  trackPlayCounts: tracks => ipcRenderer.invoke('melophile:track-play-counts', { tracks }),
  yearlyListeningRollups: () => ipcRenderer.invoke('melophile:yearly-listening-rollups'),
  yearlyEntityRankings: options => ipcRenderer.invoke('melophile:yearly-entity-rankings', options),
  listeningRollups: () => ipcRenderer.invoke('melophile:listening-rollups'),
  entityRankings: options => ipcRenderer.invoke('melophile:entity-rankings', options),
  recentListening: limit => ipcRenderer.invoke('melophile:recent-listening', { limit }),
  ghostedTracks: options => ipcRenderer.invoke('melophile:ghosted-tracks', options),
  apotheosisWatchlist: options => ipcRenderer.invoke('melophile:apotheosis-watchlist', options),
  freshOverview: options => ipcRenderer.invoke('melophile:fresh-overview', options),
  harvestRankings: options => ipcRenderer.invoke('melophile:harvest-rankings', options),
  frissonOverview: options => ipcRenderer.invoke('melophile:frisson-overview', options),
  openSpotify: url => ipcRenderer.invoke('melophile:open-spotify', { url })
});
