const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

const APP_HTML = path.join(__dirname, '..', 'melophile_metrics_v2.html');
const PRELOAD = path.join(__dirname, 'preload.js');
const SPOTIFY_EXTERNAL_RE = /^(spotify:|https:\/\/open\.spotify\.com\/)/i;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 1000,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: '#0A0A0A',
    title: 'melophile metrics',
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', event => {
    const url = event.url || '';
    if (!SPOTIFY_EXTERNAL_RE.test(url)) return;
    event.preventDefault();
    openExternalUrl(url);
  });

  win.loadFile(APP_HTML);
}

function openExternalUrl(url) {
  if (!url) return;
  shell.openExternal(url).catch(() => {});
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
