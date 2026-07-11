import { getValidSpotifyToken, spotifyFetch } from '../../shared/spotifyApi';

const freshPlaylistCacheKey = 'melophile.fresh.spotifyPlaylists.v1';
const freshReleaseCacheKey = 'melophile.fresh.releases.v1';
const freshPlaylistTrackCacheKey = 'melophile.fresh.playlistTracks.v1';
const freshDecisionIndexKey = 'melophile.fresh.decisionIndex.v1';
const freshScanScheduleKey = 'melophile.fresh.seedScanSchedule.v1';
const spotifyArtistMatchKey = 'melophile.spotify.artistMatches.v1';
const compostPlaylistId = '1LQdBqvVyYOWWXE7wkh7Cf';
const freshScanDays = [0, 2, 4];
const freshScanHour = 21;
const freshScanMinute = 1;

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

export type FreshDecisionIndex = {
  updatedAtMs?: number;
  trackKeys: string[];
  albumKeys: string[];
  playlistIds: string[];
  includesCompost: boolean;
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
  decisionIndex: FreshDecisionIndex;
  hiddenByDecisionCount: number;
};

export type FreshScanSchedule = {
  enabled: boolean;
  days: number[];
  hour: number;
  minute: number;
  lastScanMs: number;
  nextScanMs: number;
  lastStatus: string;
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
  const decisionIndex = readFreshDecisionIndex();
  const visibleByDate = Array.isArray(stored.releases) ? visibleFreshReleases(stored.releases) : [];
  const releases = visibleByDate.filter(release => !releaseFoundInDecisionIndex(release, decisionIndex));
  return {
    updatedAtMs: stored.updatedAtMs,
    releases,
    allTimeReleases: releases.filter(release => release.pools.includes('all-time')),
    recentReleases: releases.filter(release => release.pools.includes('recent')),
    decisionIndex,
    hiddenByDecisionCount: visibleByDate.length - releases.length
  };
}

export function readFreshPlaylistTrackCache(): FreshPlaylistTrackCache {
  const stored = readJson<FreshPlaylistTrackCache>(freshPlaylistTrackCacheKey, { playlists: {} });
  return {
    updatedAtMs: stored.updatedAtMs,
    playlists: stored.playlists && typeof stored.playlists === 'object' ? stored.playlists : {}
  };
}

export function readFreshDecisionIndex(): FreshDecisionIndex {
  const stored = readJson<FreshDecisionIndex>(freshDecisionIndexKey, {
    trackKeys: [],
    albumKeys: [],
    playlistIds: [],
    includesCompost: false
  });
  return {
    updatedAtMs: stored.updatedAtMs,
    trackKeys: Array.isArray(stored.trackKeys) ? stored.trackKeys : [],
    albumKeys: Array.isArray(stored.albumKeys) ? stored.albumKeys : [],
    playlistIds: Array.isArray(stored.playlistIds) ? stored.playlistIds : [],
    includesCompost: Boolean(stored.includesCompost)
  };
}

export function readFreshScanSchedule(): FreshScanSchedule {
  const stored = readJson<Partial<FreshScanSchedule> | null>(freshScanScheduleKey, null);
  const fallbackNext = nextFreshScanMs(new Date());
  const storedHour = stored?.hour;
  const storedMinute = stored?.minute;
  return {
    enabled: stored?.enabled ?? true,
    days: Array.isArray(stored?.days) && stored.days.length ? stored.days : freshScanDays,
    hour: Number.isFinite(storedHour) ? Number(storedHour) : freshScanHour,
    minute: Number.isFinite(storedMinute) ? Number(storedMinute) : freshScanMinute,
    lastScanMs: Number(stored?.lastScanMs) || 0,
    nextScanMs: Number(stored?.nextScanMs) || fallbackNext,
    lastStatus: stored?.lastStatus || 'scheduled scans wait for listening history and a valid Spotify connection.'
  };
}

export function writeFreshScanSchedule(schedule: FreshScanSchedule) {
  writeJson(freshScanScheduleKey, schedule);
  window.dispatchEvent(new Event('melophile:fresh-scan-schedule-updated'));
}

export function updateFreshScanScheduleAfterRun(releaseCount: number) {
  const schedule = readFreshScanSchedule();
  const nextScanMs = nextFreshScanMs(new Date());
  const nextScan = formatFreshScanDate(nextScanMs);
  const nextSchedule = {
    ...schedule,
    lastScanMs: Date.now(),
    nextScanMs,
    lastStatus: `${releaseCount.toLocaleString()} releases stored · next scan ${nextScan}`
  };
  writeFreshScanSchedule(nextSchedule);
  return nextSchedule;
}

export function normalizeFreshScanSchedule() {
  const schedule = readFreshScanSchedule();
  if (!schedule.nextScanMs || schedule.nextScanMs < Date.now() - 60000) {
    const nextScanMs = nextFreshScanMs(new Date(schedule.lastScanMs || Date.now()));
    const normalized = {
      ...schedule,
      nextScanMs: nextScanMs < Date.now() ? Date.now() + 5000 : nextScanMs
    };
    writeFreshScanSchedule(normalized);
    return normalized;
  }
  return schedule;
}

export function nextFreshScanMs(fromDate: Date) {
  const from = fromDate instanceof Date ? fromDate : new Date();
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(from);
    candidate.setDate(from.getDate() + offset);
    candidate.setHours(freshScanHour, freshScanMinute, 0, 0);
    if (freshScanDays.includes(candidate.getDay()) && candidate.getTime() > from.getTime()) {
      return candidate.getTime();
    }
  }
  const fallback = new Date(from);
  fallback.setDate(from.getDate() + 1);
  fallback.setHours(freshScanHour, freshScanMinute, 0, 0);
  return fallback.getTime();
}

export function formatFreshScanDate(ms: number) {
  if (!ms) return 'not scheduled';
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
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

export async function refreshFreshDecisionIndex(playlists: FreshSpotifyPlaylist[], clientId?: string) {
  const playlistIds = Array.from(new Set([
    ...playlists.map(playlist => playlist.id).filter(Boolean),
    compostPlaylistId
  ]));
  if (!playlistIds.length) throw new Error('harvest playlists needed');

  const cache = readFreshPlaylistTrackCache();
  for (const playlistId of playlistIds) {
    if (!cache.playlists[playlistId]?.tracks?.length) {
      await loadFreshPlaylistTracks(playlistId, clientId);
    }
  }

  const refreshedCache = readFreshPlaylistTrackCache();
  const index = buildFreshDecisionIndex(playlistIds, refreshedCache);
  writeJson(freshDecisionIndexKey, index);
  window.dispatchEvent(new Event('melophile:fresh-decision-index-updated'));
  return index;
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

function buildFreshDecisionIndex(playlistIds: string[], cache: FreshPlaylistTrackCache): FreshDecisionIndex {
  const trackKeys = new Set<string>();
  const albumKeys = new Set<string>();
  playlistIds.forEach(playlistId => {
    const tracks = cache.playlists[playlistId]?.tracks || [];
    tracks.forEach(track => {
      const album = track.album?.name || '';
      (track.artists || []).forEach(artist => {
        const artistName = artist.name || '';
        const trackKey = decisionKey(artistName, track.name || '');
        const albumKey = decisionKey(artistName, album);
        if (trackKey) trackKeys.add(trackKey);
        if (albumKey) albumKeys.add(albumKey);
      });
    });
  });
  return {
    updatedAtMs: Date.now(),
    trackKeys: Array.from(trackKeys),
    albumKeys: Array.from(albumKeys),
    playlistIds,
    includesCompost: playlistIds.includes(compostPlaylistId)
  };
}

function releaseFoundInDecisionIndex(release: FreshRelease, index: FreshDecisionIndex) {
  if (!release.name || (!index.trackKeys.length && !index.albumKeys.length)) return false;
  const trackKeys = new Set(index.trackKeys);
  const albumKeys = new Set(index.albumKeys);
  return releaseArtistNames(release).some(artist => {
    const key = decisionKey(artist, release.name);
    return trackKeys.has(key) || albumKeys.has(key);
  });
}

function releaseArtistNames(release: FreshRelease) {
  return (Array.isArray(release.artists) && release.artists.length
    ? release.artists
    : String(release.artist || '').split(',')
  ).map(artist => String(artist || '').trim()).filter(Boolean);
}

function decisionKey(artist: string, name: string) {
  const safeArtist = normalizeDecisionText(artist);
  const safeName = normalizeDecisionText(name);
  return safeArtist && safeName ? `${safeArtist}|||${safeName}` : '';
}

function normalizeDecisionText(value: string) {
  return String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
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
