import { getValidSpotifyToken, spotifyFetch } from '../../shared/spotifyApi';

const freshPlaylistCacheKey = 'melophile.fresh.spotifyPlaylists.v1';
const freshReleaseCacheKey = 'melophile.fresh.releases.v1';
const freshPlaylistTrackCacheKey = 'melophile.fresh.playlistTracks.v1';
const spotifyArtistMatchKey = 'melophile.spotify.artistMatches.v1';

export type FreshSpotifyPlaylist = {
  id: string;
  name: string;
  uri?: string;
  external_urls?: { spotify?: string };
  images?: { url?: string }[];
  tracks?: { total?: number };
  owner?: { display_name?: string; id?: string };
};

export type FreshSpotifyTrack = {
  id?: string;
  name?: string;
  uri?: string;
  external_urls?: { spotify?: string };
  duration_ms?: number;
  artists?: { id?: string; name?: string }[];
  album?: {
    name?: string;
    images?: { url?: string }[];
  };
};

export type FreshPlaylistTrackCache = {
  updatedAtMs?: number;
  playlists: Record<string, { updatedAtMs?: number; tracks: FreshSpotifyTrack[] }>;
};

export type FreshPlaylistSnapshot = {
  updatedAtMs?: number;
  playlists: FreshSpotifyPlaylist[];
  seedPlaylists: FreshSpotifyPlaylist[];
  harvestPlaylists: FreshSpotifyPlaylist[];
};

export type FreshReleaseCandidate = {
  name: string;
  plays: number;
  pool: 'all-time' | 'recent';
};

export type FreshRelease = {
  id: string;
  name: string;
  artist: string;
  artists: string[];
  pools: FreshReleaseCandidate['pool'][];
  type: string;
  releaseMs: number;
  releaseDate: string;
  image: string;
  uri: string;
  url: string;
  artistPlays: number;
};

export type FreshReleaseProgress = {
  current: number;
  total: number;
  label: string;
};

export type FreshReleaseSnapshot = {
  updatedAtMs?: number;
  releases: FreshRelease[];
  allTimeReleases: FreshRelease[];
  recentReleases: FreshRelease[];
};

type SpotifyReleaseItem = {
  id?: string;
  name?: string;
  album_type?: string;
  release_date?: string;
  uri?: string;
  external_urls?: { spotify?: string };
  images?: { url?: string }[];
  artists?: { name?: string }[];
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

export function readFreshReleaseSnapshot(): FreshReleaseSnapshot {
  const stored = readJson<{ updatedAtMs?: number; releases?: FreshRelease[] }>(freshReleaseCacheKey, {});
  const releases = Array.isArray(stored.releases) ? visibleFreshReleases(stored.releases) : [];
  return {
    updatedAtMs: stored.updatedAtMs,
    releases,
    allTimeReleases: releases.filter(release => release.pools.includes('all-time')),
    recentReleases: releases.filter(release => release.pools.includes('recent'))
  };
}

export function readFreshPlaylistTrackCache(): FreshPlaylistTrackCache {
  const stored = readJson<FreshPlaylistTrackCache>(freshPlaylistTrackCacheKey, { playlists: {} });
  return {
    updatedAtMs: stored.updatedAtMs,
    playlists: stored.playlists && typeof stored.playlists === 'object' ? stored.playlists : {}
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

export async function loadFreshPlaylistTracks(playlistId: string, clientId?: string, force = false) {
  const cache = readFreshPlaylistTrackCache();
  const cached = cache.playlists[playlistId];
  if (!force && Array.isArray(cached?.tracks) && cached.tracks.length) return cached.tracks;

  const token = await getValidSpotifyToken(clientId);
  if (!token) throw new Error('spotify connection needed');

  const fields = 'items(track(id,name,uri,external_urls,duration_ms,artists(id,name),album(name,images))),next,total';
  let next: string | null = `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks?limit=100&fields=${encodeURIComponent(fields)}`;
  const tracks: FreshSpotifyTrack[] = [];
  while (next) {
    const page = await spotifyFetch(next, token);
    (page.items || []).forEach((item: { track?: FreshSpotifyTrack }) => {
      if (item?.track?.name) tracks.push(item.track);
    });
    next = page.next || null;
  }

  cache.playlists[playlistId] = {
    updatedAtMs: Date.now(),
    tracks
  };
  cache.updatedAtMs = Date.now();
  writeJson(freshPlaylistTrackCacheKey, cache);
  window.dispatchEvent(new Event('melophile:fresh-playlist-tracks-updated'));
  return tracks;
}

export async function refreshFreshReleaseDiscovery({
  candidates,
  clientId,
  onProgress
}: {
  candidates: FreshReleaseCandidate[];
  clientId?: string;
  onProgress?: (progress: FreshReleaseProgress) => void;
}) {
  const token = await getValidSpotifyToken(clientId);
  if (!token) throw new Error('spotify connection needed');
  if (!candidates.length) throw new Error('listening history needed');

  const artistCache = readJson<Record<string, { id?: string; name?: string }>>(spotifyArtistMatchKey, {});
  const releases: FreshRelease[] = [];
  const cutoff = Date.now() - 183 * 86400000;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    onProgress?.({ current: index + 1, total: candidates.length, label: candidate.name });
    const spotifyArtist = artistCache[candidate.name] || await findSpotifyArtist(candidate.name, token);
    if (!spotifyArtist?.id) continue;
    artistCache[candidate.name] = spotifyArtist;

    const artistReleases = await loadSpotifyArtistReleases(spotifyArtist.id, token);
    artistReleases.forEach((release: SpotifyReleaseItem) => {
      const releaseMs = spotifyReleaseDateMs(release.release_date);
      if (!releaseMs || releaseMs < cutoff) return;
      const artists = (release.artists || []).map((artist: { name?: string }) => artist.name || '').filter(Boolean);
      releases.push({
        id: release.id || `${candidate.name}-${release.name}-${release.release_date}`,
        name: release.name || 'untitled release',
        artist: artists.join(', ') || candidate.name,
        artists,
        pools: [candidate.pool],
        type: release.album_type || 'release',
        releaseMs,
        releaseDate: release.release_date || '',
        image: release.images?.[0]?.url || '',
        uri: release.uri || '',
        url: release.external_urls?.spotify || '',
        artistPlays: candidate.plays
      });
    });
  }

  const unique = mergeFreshReleases(releases);
  writeJson(spotifyArtistMatchKey, artistCache);
  writeJson(freshReleaseCacheKey, {
    version: 1,
    updatedAtMs: Date.now(),
    releases: unique
  });
  window.dispatchEvent(new Event('melophile:fresh-releases-updated'));
  return readFreshReleaseSnapshot();
}

function isSeedPlaylist(playlist: FreshSpotifyPlaylist) {
  const name = (playlist.name || '').toLowerCase();
  return name.includes('fresh seeds') || name.includes('seed');
}

function isHarvestPlaylist(playlist: FreshSpotifyPlaylist) {
  const name = (playlist.name || '').toLowerCase();
  return name.includes('harvest') || name.includes('cherry') || (name.includes('fresh') && !isSeedPlaylist(playlist));
}

function visibleFreshReleases(releases: FreshRelease[]) {
  const cutoff = Date.now() - 183 * 86400000;
  return releases
    .filter(release => release.releaseMs >= cutoff)
    .sort((a, b) => b.releaseMs - a.releaseMs || b.artistPlays - a.artistPlays || a.name.localeCompare(b.name));
}

async function findSpotifyArtist(artistName: string, token: { access_token?: string }) {
  const params = new URLSearchParams({ q: artistName, type: 'artist', limit: '1' });
  const data = await spotifyFetch(`/v1/search?${params.toString()}`, token);
  return data.artists?.items?.[0] || null;
}

async function loadSpotifyArtistReleases(artistId: string, token: { access_token?: string }) {
  const params = new URLSearchParams({
    include_groups: 'album,single',
    market: 'US',
    limit: '20'
  });
  const data = await spotifyFetch(`/v1/artists/${encodeURIComponent(artistId)}/albums?${params.toString()}`, token);
  return Array.isArray(data.items) ? data.items : [];
}

function spotifyReleaseDateMs(dateText: string | undefined) {
  if (!dateText) return 0;
  const normalized = dateText.length === 4 ? `${dateText}-01-01` : dateText.length === 7 ? `${dateText}-01` : dateText;
  const ms = Date.parse(`${normalized}T00:00:00Z`);
  return Number.isNaN(ms) ? 0 : ms;
}

function mergeFreshReleases(releases: FreshRelease[]) {
  const byId = new Map<string, FreshRelease>();
  releases.forEach(release => {
    const existing = byId.get(release.id);
    if (!existing) {
      byId.set(release.id, release);
      return;
    }
    byId.set(release.id, {
      ...existing,
      pools: Array.from(new Set([...existing.pools, ...release.pools])),
      artistPlays: Math.max(existing.artistPlays, release.artistPlays)
    });
  });
  return Array.from(byId.values());
}
