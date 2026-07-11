import { getValidSpotifyToken, spotifyFetch } from '../../shared/spotifyApi';

const freshPlaylistCacheKey = 'melophile.fresh.spotifyPlaylists.v1';

export type FreshSpotifyPlaylist = {
  id: string;
  name: string;
  uri?: string;
  external_urls?: { spotify?: string };
  images?: { url?: string }[];
  tracks?: { total?: number };
  owner?: { display_name?: string; id?: string };
};

export type FreshPlaylistSnapshot = {
  updatedAtMs?: number;
  playlists: FreshSpotifyPlaylist[];
  seedPlaylists: FreshSpotifyPlaylist[];
  harvestPlaylists: FreshSpotifyPlaylist[];
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readFreshPlaylistSnapshot(): FreshPlaylistSnapshot {
  const stored = readJson<{ updatedAtMs?: number; playlists?: FreshSpotifyPlaylist[] }>(freshPlaylistCacheKey, {});
  const playlists = Array.isArray(stored.playlists) ? stored.playlists : [];
  return {
    updatedAtMs: stored.updatedAtMs,
    playlists,
    seedPlaylists: playlists.filter(isSeedPlaylist),
    harvestPlaylists: playlists.filter(isHarvestPlaylist)
  };
}

export async function refreshFreshPlaylistInventory(clientId?: string) {
  const token = await getValidSpotifyToken(clientId);
  if (!token) throw new Error('spotify connection needed');

  const playlists: FreshSpotifyPlaylist[] = [];
  let next: string | null = 'https://api.spotify.com/v1/me/playlists?limit=50';
  while (next) {
    const page = await spotifyFetch(next, token);
    playlists.push(...(Array.isArray(page.items) ? page.items : []));
    next = page.next || null;
  }

  writeJson(freshPlaylistCacheKey, {
    version: 1,
    updatedAtMs: Date.now(),
    playlists
  });
  window.dispatchEvent(new Event('melophile:fresh-playlists-updated'));
  return readFreshPlaylistSnapshot();
}

function isSeedPlaylist(playlist: FreshSpotifyPlaylist) {
  const name = (playlist.name || '').toLowerCase();
  return name.includes('fresh seeds') || name.includes('seed');
}

function isHarvestPlaylist(playlist: FreshSpotifyPlaylist) {
  const name = (playlist.name || '').toLowerCase();
  return name.includes('harvest') || name.includes('cherry') || (name.includes('fresh') && !isSeedPlaylist(playlist));
}
