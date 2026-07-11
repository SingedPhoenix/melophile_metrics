const lastfmDbName = 'melophile-lastfm-cache';
const lastfmDbVersion = 1;
const lastfmStore = 'scrobbles';
const lastfmLastSyncKey = 'melophile.lastfm.lastSyncAt';
const lastfmLastRebuildKey = 'melophile.lastfm.lastRebuildAt';
const lastfmCountTolerance = 3;

export type LastfmCacheSnapshot = {
  cacheCount: number;
  latestUts: number;
  lastSyncAt: string;
  lastRebuildAt: string;
};

export type LastfmCacheRow = {
  id?: string;
  uts?: string;
  artist?: string;
  track?: string;
  album?: string;
};

export type LastfmSyncMode = 'recent' | 'full';

export type LastfmSyncProgress = {
  page: number;
  totalPages: number;
  mode: LastfmSyncMode;
};

export type LastfmSyncResult = {
  rowsFetched: number;
  cacheCount: number;
  profileCount: number | null;
  rebuilt: boolean;
  latestUts: number;
};

function openLastfmDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(lastfmDbName, lastfmDbVersion);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(lastfmStore)) {
        db.createObjectStore(lastfmStore, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readLastfmCachedRows(): Promise<LastfmCacheRow[]> {
  const db = await openLastfmDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(lastfmStore, 'readonly');
    const request = tx.objectStore(lastfmStore).getAll();
    request.onsuccess = () => resolve((request.result || []) as LastfmCacheRow[]);
    request.onerror = () => reject(request.error);
  });
}

async function saveLastfmRows(rows: LastfmCacheRow[]) {
  if (!rows.length) return;
  const db = await openLastfmDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(lastfmStore, 'readwrite');
    const store = tx.objectStore(lastfmStore);
    rows.forEach(row => store.put(row));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function replaceLastfmRows(rows: LastfmCacheRow[]) {
  const db = await openLastfmDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(lastfmStore, 'readwrite');
    const store = tx.objectStore(lastfmStore);
    store.clear();
    rows.forEach(row => store.put(row));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function readLastfmCacheSnapshot(): Promise<LastfmCacheSnapshot> {
  const rows = await readLastfmCachedRows();
  return {
    cacheCount: rows.length,
    latestUts: rows.reduce((max, row) => Math.max(max, Number(row.uts) || 0), 0),
    lastSyncAt: localStorage.getItem(lastfmLastSyncKey) || '',
    lastRebuildAt: localStorage.getItem(lastfmLastRebuildKey) || ''
  };
}

export async function fetchLastfmProfileCount(username?: string, apiKey?: string) {
  if (!username || !apiKey) return null;
  const params = new URLSearchParams({
    method: 'user.getinfo',
    user: username,
    api_key: apiKey,
    format: 'json'
  });
  const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${params.toString()}`);
  if (!response.ok) return null;
  const data = await response.json();
  const playcount = Number(data?.user?.playcount);
  return Number.isFinite(playcount) ? playcount : null;
}

export function lastfmIntegrityState(cacheCount: number, profileCount: number | null) {
  if (!profileCount) return 'unknown';
  if (cacheCount > profileCount) return 'rebuild';
  return Math.abs(profileCount - cacheCount) > lastfmCountTolerance ? 'rebuild' : 'in sync';
}

export function lastfmProfileDelta(cacheCount: number, profileCount: number | null) {
  return profileCount === null ? null : cacheCount - profileCount;
}

export async function syncLastfmHistory({
  username,
  apiKey,
  mode,
  onProgress
}: {
  username?: string;
  apiKey?: string;
  mode: LastfmSyncMode;
  onProgress?: (progress: LastfmSyncProgress) => void;
}): Promise<LastfmSyncResult> {
  if (!username || !apiKey) throw new Error('Last.fm username and api key are required.');

  const cachedRows = await readLastfmCachedRows();
  const profileCount = await fetchLastfmProfileCount(username, apiKey);
  const latestUts = cachedRows.reduce((max, row) => Math.max(max, Number(row.uts) || 0), 0);
  const shouldRebuild = mode === 'full' || (mode === 'recent' && lastfmIntegrityState(cachedRows.length, profileCount) === 'rebuild');
  const from = shouldRebuild || !latestUts ? null : latestUts + 1;
  const fetchedRows: LastfmCacheRow[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const data = await fetchLastfmRecentTracks({ username, apiKey, page, from });
    const attr = data?.recenttracks?.['@attr'] || {};
    totalPages = Math.max(1, Number(attr.totalPages) || 1);
    const tracks = data?.recenttracks?.track || [];
    fetchedRows.push(...lastfmTracksToRows(Array.isArray(tracks) ? tracks : [tracks]));
    onProgress?.({ page, totalPages, mode: shouldRebuild ? 'full' : mode });
    page += 1;
  } while (page <= totalPages);

  if (shouldRebuild) await replaceLastfmRows(fetchedRows);
  else await saveLastfmRows(fetchedRows);

  const nowIso = new Date().toISOString();
  localStorage.setItem(lastfmLastSyncKey, nowIso);
  if (shouldRebuild) localStorage.setItem(lastfmLastRebuildKey, nowIso);

  const nextRows = await readLastfmCachedRows();
  return {
    rowsFetched: fetchedRows.length,
    cacheCount: nextRows.length,
    profileCount,
    rebuilt: shouldRebuild,
    latestUts: nextRows.reduce((max, row) => Math.max(max, Number(row.uts) || 0), 0)
  };
}

async function fetchLastfmRecentTracks({
  username,
  apiKey,
  page,
  from
}: {
  username: string;
  apiKey: string;
  page: number;
  from: number | null;
}) {
  const params = new URLSearchParams({
    method: 'user.getrecenttracks',
    user: username,
    api_key: apiKey,
    format: 'json',
    limit: '200',
    page: String(page)
  });
  if (from) params.set('from', String(from));
  const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${params.toString()}`);
  if (!response.ok) throw new Error('Last.fm request failed.');
  const data = await response.json();
  if (data?.error) throw new Error(data.message || 'Last.fm sync failed.');
  return data;
}

function lastfmTracksToRows(tracks: any[]): LastfmCacheRow[] {
  return tracks.map(track => {
    const uts = Number(track?.date?.uts || 0);
    const artist = track?.artist?.['#text'] || track?.artist?.name || '';
    const album = track?.album?.['#text'] || '';
    const name = track?.name || '';
    if (!uts || !artist || !name) return null;
    return {
      id: `${uts}|${artist.toLowerCase()}|${name.toLowerCase()}`,
      uts: String(uts),
      artist,
      track: name,
      album
    };
  }).filter(Boolean) as LastfmCacheRow[];
}
