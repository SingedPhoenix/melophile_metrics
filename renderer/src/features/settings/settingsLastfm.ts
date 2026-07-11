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
