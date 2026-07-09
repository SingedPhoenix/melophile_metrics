const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('melophileDesktop', {
  platform: process.platform,
  isElectron: true
});
