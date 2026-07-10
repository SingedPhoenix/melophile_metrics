const { app, BrowserWindow, ipcMain, nativeImage, shell } = require('electron');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const {
  closeMelophileDatabase,
  databaseStatus,
  importLastfmScrobbles,
  openMelophileDatabase,
  trackPlayCounts,
  yearlyListeningRollups
} = require('./database');

const APP_ROOT = path.join(__dirname, '..');
const APP_HTML = path.join(__dirname, '..', 'melophile_metrics_v2.html');
const APP_ICON_PNG = path.join(APP_ROOT, 'assets', 'app-icon', 'melophile-metrics.png');
const APP_NAME = 'melophile metrics';
const USER_DATA_DIR_NAME = 'melophile-metrics';
const PRELOAD = path.join(__dirname, 'preload.js');
const LOCAL_PORT = 8767;
const SPOTIFY_EXTERNAL_RE = /^(spotify:|https:\/\/open\.spotify\.com\/)/i;

app.setName(APP_NAME);
app.setPath('userData', path.join(app.getPath('appData'), USER_DATA_DIR_NAME));

async function createWindow() {
  const appUrl = await getAppUrl();
  const win = new BrowserWindow({
    width: 1440,
    height: 1000,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: '#0A0A0A',
    title: APP_NAME,
    icon: APP_ICON_PNG,
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

  win.loadURL(appUrl);
}

function openExternalUrl(url) {
  if (!url) return;
  shell.openExternal(url).catch(() => {});
}

app.whenReady().then(() => {
  applyDesktopIdentity();
  openMelophileDatabase(app.getPath('userData'));
  registerDesktopHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

function applyDesktopIdentity() {
  const icon = nativeImage.createFromPath(APP_ICON_PNG);
  if (!icon.isEmpty() && process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(icon);
  }
  app.setAboutPanelOptions({
    applicationName: APP_NAME,
    applicationVersion: app.getVersion(),
    iconPath: APP_ICON_PNG
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  closeMelophileDatabase();
});

function registerDesktopHandlers() {
  ipcMain.handle('melophile:read-local-config', async () => {
    const configPath = await findLocalConfigPath();
    if (!configPath) return null;
    const raw = await fs.readFile(configPath, 'utf8');
    return JSON.parse(raw);
  });

  ipcMain.handle('melophile:database-status', async () => databaseStatus());

  ipcMain.handle('melophile:import-lastfm-scrobbles', async (_event, payload = {}) => {
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const mode = typeof payload.mode === 'string' ? payload.mode : 'manual';
    return importLastfmScrobbles(rows, mode);
  });

  ipcMain.handle('melophile:track-play-counts', async (_event, payload = {}) => {
    const tracks = Array.isArray(payload.tracks) ? payload.tracks : [];
    return trackPlayCounts(tracks);
  });

  ipcMain.handle('melophile:yearly-listening-rollups', async () => yearlyListeningRollups());
}

async function findLocalConfigPath() {
  const candidates = [
    process.env.MELOPHILE_CONFIG_PATH,
    path.join(APP_ROOT, 'melophile_config.local.json'),
    path.join(app.getPath('home'), 'melophile_metrics', 'melophile_config.local.json')
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }
  return null;
}

async function getAppUrl() {
  const serverStarted = await startLocalServer();
  if (serverStarted) return `http://127.0.0.1:${LOCAL_PORT}/melophile_metrics_v2.html`;
  return pathToFileURL(APP_HTML).toString();
}

function startLocalServer() {
  return new Promise(resolve => {
    const server = http.createServer(serveLocalFile);
    server.on('error', error => {
      if (error && error.code === 'EADDRINUSE') resolve(true);
      else resolve(false);
    });
    server.listen(LOCAL_PORT, '127.0.0.1', () => resolve(true));
  });
}

async function serveLocalFile(req, res) {
  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${LOCAL_PORT}`);
    const pathname = decodeURIComponent(url.pathname === '/' ? '/melophile_metrics_v2.html' : url.pathname);
    const requestedPath = path.normalize(path.join(APP_ROOT, pathname));
    if (!requestedPath.startsWith(APP_ROOT + path.sep)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }

    const data = await fs.readFile(requestedPath);
    res.writeHead(200, { 'Content-Type': contentTypeFor(requestedPath) });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}
