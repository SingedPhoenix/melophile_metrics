import { getValidSpotifyToken, spotifyFetch } from '../../shared/spotifyApi';

export type PastTenseMetric = 'songs' | 'scrobbles';

export type PastTensePlaylist = {
  year: number;
  name: string;
  id: string;
  url: string;
  imageUrl?: string;
  songCount: number;
  scrobbleCount: number;
  scrobbleCountSource: 'sqlite' | 'fallback';
  songCountSource: 'cached-tracks' | 'spotify-playlist' | 'fallback';
  sqliteMatchedTracks?: number;
  sqliteMatchTrackTotal?: number;
  sqliteUnmatchedSamples?: PastTenseUnmatchedSample[];
};

export type PastTenseUnmatchedSample = {
  trackName: string;
  artists: string[];
  label: string;
};

export type PastTenseCacheStats = {
  playlistDetails: number;
  cachedPlaylists: number;
  cachedTracks: number;
  updatedAtMs: number;
};

export type PastTenseLiveSnapshot = {
  playlists: PastTensePlaylist[];
  stats: PastTenseCacheStats;
};

type CachedSpotifyPlaylist = {
  name?: string;
  url?: string;
  images?: Array<{ url?: string }>;
  tracks?: { total?: number };
};

export type PastTenseCachedTrack = {
  id?: string;
  name?: string;
  uri?: string;
  external_urls?: { spotify?: string };
  artists?: Array<{ id?: string; name?: string }>;
  album?: {
    name?: string;
    images?: Array<{ url?: string }>;
  };
  duration_ms?: number;
};

export type PastTenseArtistMetadata = {
  name?: string;
  genres?: string[];
  image?: string;
  updatedAtMs?: number;
};

type CachedTrackStore = {
  version?: number;
  updatedAtMs?: number;
  playlists?: Record<string, { total?: number; tracks?: PastTenseCachedTrack[]; updatedAtMs?: number }>;
};

export type PastTenseTrackRef = {
  key: string;
  playlistId: string;
  trackName: string;
  artists: string[];
};

export type TrackPlayCountResult = {
  trackCounts?: Record<string, number>;
  trackGems?: Record<string, PastTenseTrackGem>;
  playlistCounts?: Record<string, number>;
};

export type PastTenseTrackGem = {
  name: string;
  label: string;
  color: string;
  rank: number;
  count: number;
};

export type PastTenseMatchStats = {
  matchedPlaylists: number;
  matchedTracks: number;
  totalPlaylists: number;
  totalTracks: number;
};

const playlistCacheKey = 'melophile.pastTense.playlists.v2';
const trackCacheKey = 'melophile.pastTense.tracks.v1';
const artistGenreCacheKey = 'melophile.pastTense.artistGenres.v1';
const cacheScheduleKey = 'melophile.pastTense.cacheSchedule.v1';
const trackCacheTtlMs = 7 * 86_400_000;
const artistGenreCacheTtlMs = 30 * 86_400_000;
const trackCacheVersion = 2;
const scheduledDays = [0, 2, 4];
const scheduledHour = 21;
const scheduledMinute = 1;

export type PastTenseRefreshProgress = {
  current: number;
  total: number;
  label: string;
};

export type PastTenseRefreshResult = {
  cachedPlaylists: number;
  cachedTracks: number;
  refreshedPlaylists: number;
};

export type PastTenseCacheSchedule = {
  enabled: boolean;
  days: number[];
  hour: number;
  minute: number;
  lastRefreshMs: number;
  nextRefreshMs: number;
  lastStatus: string;
};

const playlistIds: Record<number, string> = {
  1970: '6h8yLdFD25fBxgXuiIxqzm',
  1971: '3jHRYkH2s0sRFtlj0sZzrX',
  1972: '0NwJtHOrIk3hbxUSa0e5JD',
  1973: '0y9IjTnejZzsLoCwT0n2SR',
  1974: '2Wmgd7tcdBREX2vD4jMgXb',
  1975: '41tdIfuW52R4nAkMkx0ip0',
  1976: '1KmYU4cmPgmzlRDYd6tCAt',
  1977: '0apYkZXIJgs8g72DFG6BnS',
  1978: '6RAQhgbYtFg6Sd068NIYPV',
  1979: '3ciroxrtnlVEFbDXUGq5l2',
  1980: '3j1N7xoiLDubqSXOVsc3PZ',
  1981: '0qSdb58zbUFRIQuKtt0Uoj',
  1982: '7DAdFV1DMC7erJYpJYv5dk',
  1983: '6Esyf4CgnJLUtxmlNgKnAz',
  1984: '4rlxf7LBOxW3zpZjiCSewG',
  1985: '13KiKdyqXoXZ565a8dAmKM',
  1986: '1JAR2nSOUDDSTUmg6hMMgY',
  1987: '6DLuX8CiJ3Ex6zTS27cRIF',
  1988: '2cXPKaEG1pNqkNHBchwVeQ',
  1989: '1xvwsJEx3HdzqyOD4iPKC0',
  1990: '0Un0VoQtPsR3wjAeb76fgG',
  1991: '3J7y49n9TPkwHXF5Epenth',
  1992: '6R2zLZie2HJxm52FecY75s',
  1993: '3O9lQvDHMJdozDta8DaXyk',
  1994: '3uVdIFDGDqKQXMKqIYU2dK',
  1995: '1WAcrHq9tVcpvwBLAqpzH6',
  1996: '3ogRv6pszAg2e70f9y6B0T',
  1997: '2rLkaOq4JscpvGgN9qcst2',
  1998: '2qzD9dp0lLjtrri6pp9eb0',
  1999: '4gUMCMZ5gJWhP0Hafwf9yg',
  2000: '0RhSaAKJ8mP9W0YCjEb1Gb',
  2001: '2QbX7vaoHwp1CVG8IvSczq',
  2002: '76rOOjm9CDYX8SLZHxJjU6',
  2003: '260AQhgN4HAYfzwLPFBVZh',
  2004: '4UQJGbtarQwX5oVyNkIiM8',
  2005: '2HwAjZZVlQVXirv42qkhPa',
  2006: '4jK9zfoOPHnR3R0IU5FoCA',
  2007: '5Q7LlUtRzKWsgHb2aV8WYb',
  2008: '3o6VTpnV30sj3ZtR3lcYWY',
  2009: '501xBY0q39MdJd93XXMaIt',
  2010: '7dQIaOniGFi9MDhlglMJj4',
  2011: '0DtnVPpoCD0lyOR6sNUfFx',
  2012: '0FWau467Xv0g4tbTaKPljb',
  2013: '2iFSU6jnylRXmpZKD0rHrx',
  2014: '6vX7NbqqppXHOfbKsPiDaM',
  2015: '0MXaJhVL3D82VAFdPek3Hp',
  2016: '64O6xuAZ7UvQHRscmjakSi',
  2017: '10cv5iLXLWylbG40b4ZzxG',
  2018: '4pIitRjOjFswfnnFNAKiGj',
  2019: '6bXZMI7YnJ7kDb9XUz1eoJ',
  2020: '2BYXhcG9ZWcAM71cjuWD3y',
  2021: '7JpbzmnWSHefjbLUkiWnoF',
  2022: '2Ox7cDZYsQNvLJ1kiIVJWy',
  2023: '6YwSNYfYLX6G5pFFwdqftA',
  2024: '6pxFiuryaPlFjmq3L7Oqm4',
  2025: '54HlfU8RqEtA7L0SEsY0jf',
  2026: '5w9rdDEstP5LjmyOOpnXja'
};

const knownSongCounts: Record<number, number> = {
  1970: 67, 1971: 64, 1972: 20, 1973: 36, 1974: 74, 1975: 39, 1976: 78, 1977: 73, 1978: 75, 1979: 80,
  1980: 134, 1981: 74, 1982: 80, 1983: 158, 1984: 91, 1985: 113, 1986: 105, 1987: 121, 1988: 126, 1989: 178
};

const knownScrobbles: Record<number, number> = {
  2009: 8515,
  2015: 6347,
  2020: 25468,
  2021: 20458,
  2022: 20894,
  2023: 11097,
  2024: 15635,
  2025: 12001,
  2026: 7314
};

function estimatedSongCount(year: number) {
  if (knownSongCounts[year]) return knownSongCounts[year];
  const eraLift = year >= 2000 ? 52 : year >= 1990 ? 28 : 0;
  const wave = Math.round(34 + Math.sin(year * 0.71) * 28 + Math.cos(year * 0.21) * 19);
  return Math.max(18, wave + eraLift);
}

function estimatedScrobbles(year: number, songs: number) {
  if (knownScrobbles[year]) return knownScrobbles[year];
  const modernLift = year >= 2010 ? 64 : year >= 2000 ? 38 : year >= 1990 ? 22 : 10;
  return Math.round(songs * modernLift + Math.max(0, Math.sin(year * 0.37)) * 1400);
}

export const pastTensePlaylists: PastTensePlaylist[] = Object.entries(playlistIds).map(([yearText, id]) => {
  const year = Number(yearText);
  const songCount = estimatedSongCount(year);
  return {
    year,
    id,
    name: `Vol. ${year}`,
    url: `https://open.spotify.com/playlist/${id}`,
    songCount,
    scrobbleCount: estimatedScrobbles(year, songCount),
    scrobbleCountSource: 'fallback',
    songCountSource: 'fallback'
  };
});

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) || '') as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readPastTenseLiveSnapshot(): PastTenseLiveSnapshot {
  const playlistCache = readJson<Record<string, CachedSpotifyPlaylist>>(playlistCacheKey, {});
  const trackStore = readJson<CachedTrackStore>(trackCacheKey, { playlists: {} });
  const cachedTracks = trackStore.playlists || {};

  const playlists = pastTensePlaylists.map(playlist => {
    const cachedPlaylist = playlistCache[playlist.id];
    const cachedTrackEntry = cachedTracks[playlist.id];
    const cachedTrackCount = Array.isArray(cachedTrackEntry?.tracks)
      ? cachedTrackEntry.tracks.length
      : Number(cachedTrackEntry?.total) || 0;
    const spotifyPlaylistCount = Number(cachedPlaylist?.tracks?.total) || 0;
    const songCountSource: PastTensePlaylist['songCountSource'] = cachedTrackCount
      ? 'cached-tracks'
      : spotifyPlaylistCount
        ? 'spotify-playlist'
        : 'fallback';

    return {
      ...playlist,
      name: cachedPlaylist?.name || playlist.name,
      url: cachedPlaylist?.url || playlist.url,
      imageUrl: cachedPlaylist?.images?.find(image => image.url)?.url,
      songCount: cachedTrackCount || spotifyPlaylistCount || playlist.songCount,
      songCountSource
    };
  });

  const cachedPlaylistIds = Object.keys(cachedTracks).filter(id => Array.isArray(cachedTracks[id]?.tracks));

  return {
    playlists,
    stats: {
      playlistDetails: Object.keys(playlistCache).length,
      cachedPlaylists: cachedPlaylistIds.length,
      cachedTracks: cachedPlaylistIds.reduce((sum, id) => sum + (cachedTracks[id]?.tracks?.length || 0), 0),
      updatedAtMs: Number(trackStore.updatedAtMs) || 0
    }
  };
}

export function readPastTenseTrackRefs(): PastTenseTrackRef[] {
  const trackStore = readJson<CachedTrackStore>(trackCacheKey, { playlists: {} });
  return Object.entries(trackStore.playlists || {}).flatMap(([playlistId, entry]) =>
    (entry.tracks || []).flatMap((track, index) => {
      const trackName = String(track.name || '').trim();
      const artists = (track.artists || []).map(artist => String(artist.name || '').trim()).filter(Boolean);
      if (!trackName || !artists.length) return [];
      return {
        key: `${playlistId}|||${index}`,
        playlistId,
        trackName,
        artists
      };
    })
  );
}

export function readPastTensePlaylistTracks(playlistId: string): PastTenseCachedTrack[] {
  const trackStore = readJson<CachedTrackStore>(trackCacheKey, { playlists: {} });
  const tracks = trackStore.playlists?.[playlistId]?.tracks;
  return Array.isArray(tracks) ? tracks : [];
}

export function readPastTenseArtistMetadata(): Record<string, PastTenseArtistMetadata> {
  return readJson<Record<string, PastTenseArtistMetadata>>(artistGenreCacheKey, {});
}

export function pastTenseTrackCacheNeedsRefresh(maxAgeMs = trackCacheTtlMs) {
  const trackStore = readJson<CachedTrackStore>(trackCacheKey, { playlists: {} });
  const playlists = trackStore.playlists || {};
  if (pastTensePlaylists.some(playlist => !Array.isArray(playlists[playlist.id]?.tracks))) return true;
  return Date.now() - (Number(trackStore.updatedAtMs) || 0) > maxAgeMs;
}

export function readPastTenseCacheSchedule(): PastTenseCacheSchedule {
  const stored = readJson<Partial<PastTenseCacheSchedule> | null>(cacheScheduleKey, null);
  const fallbackNext = nextPastTenseCacheRefreshMs(new Date());
  return {
    enabled: stored?.enabled ?? true,
    days: Array.isArray(stored?.days) && stored.days.length ? stored.days : scheduledDays,
    hour: Number.isFinite(stored?.hour) ? Number(stored?.hour) : scheduledHour,
    minute: Number.isFinite(stored?.minute) ? Number(stored?.minute) : scheduledMinute,
    lastRefreshMs: Number(stored?.lastRefreshMs) || 0,
    nextRefreshMs: Number(stored?.nextRefreshMs) || fallbackNext,
    lastStatus: stored?.lastStatus || 'scheduled refreshes wait for cached Spotify authorization.'
  };
}

export function writePastTenseCacheSchedule(schedule: PastTenseCacheSchedule) {
  writeJson(cacheScheduleKey, schedule);
  window.dispatchEvent(new Event('melophile:past-tense-cache-schedule-updated'));
}

export function normalizePastTenseCacheSchedule() {
  const schedule = readPastTenseCacheSchedule();
  if (!schedule.nextRefreshMs || schedule.nextRefreshMs < Date.now() - 60_000) {
    const nextRefreshMs = nextPastTenseCacheRefreshMs(new Date(schedule.lastRefreshMs || Date.now()));
    const normalized = {
      ...schedule,
      nextRefreshMs: nextRefreshMs < Date.now() ? Date.now() + 5000 : nextRefreshMs
    };
    writePastTenseCacheSchedule(normalized);
    return normalized;
  }
  return schedule;
}

export function updatePastTenseCacheScheduleAfterRun(refreshedPlaylists: number) {
  const schedule = readPastTenseCacheSchedule();
  const nextRefreshMs = nextPastTenseCacheRefreshMs(new Date());
  const nextSchedule = {
    ...schedule,
    lastRefreshMs: Date.now(),
    nextRefreshMs,
    lastStatus: `${refreshedPlaylists.toLocaleString()} playlists refreshed · next refresh ${formatPastTenseCacheRefreshDate(nextRefreshMs)}`
  };
  writePastTenseCacheSchedule(nextSchedule);
  return nextSchedule;
}

export function nextPastTenseCacheRefreshMs(fromDate: Date) {
  const from = fromDate instanceof Date ? fromDate : new Date();
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(from);
    candidate.setDate(from.getDate() + offset);
    candidate.setHours(scheduledHour, scheduledMinute, 0, 0);
    if (scheduledDays.includes(candidate.getDay()) && candidate.getTime() > from.getTime()) {
      return candidate.getTime();
    }
  }
  const fallback = new Date(from);
  fallback.setDate(from.getDate() + 1);
  fallback.setHours(scheduledHour, scheduledMinute, 0, 0);
  return fallback.getTime();
}

export function formatPastTenseCacheRefreshDate(ms: number) {
  if (!ms) return 'not scheduled';
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export async function hydratePastTenseArtistMetadata({
  tracks,
  clientId,
  force = false
}: {
  tracks: PastTenseCachedTrack[];
  clientId?: string;
  force?: boolean;
}) {
  const token = await getValidSpotifyToken(clientId);
  if (!token) return { checked: 0, updated: 0 };

  const cache = readPastTenseArtistMetadata();
  const artistIds = Array.from(new Set(tracks.flatMap(track =>
    (track.artists || []).map(artist => String(artist.id || '').trim()).filter(Boolean)
  )));
  const missing = artistIds.filter(id => {
    const cached = cache[id];
    return force || !cached || !Object.prototype.hasOwnProperty.call(cached, 'image') || Date.now() - (cached.updatedAtMs || 0) > artistGenreCacheTtlMs;
  });
  if (!missing.length) return { checked: artistIds.length, updated: 0 };

  let updated = 0;
  for (let index = 0; index < missing.length; index += 50) {
    const batch = missing.slice(index, index + 50);
    const data = await spotifyFetch(`/v1/artists?ids=${encodeURIComponent(batch.join(','))}`, token);
    (data.artists || []).forEach((artist: { id?: string; name?: string; genres?: string[]; images?: Array<{ url?: string }> }) => {
      if (!artist?.id) return;
      cache[artist.id] = {
        name: artist.name || '',
        genres: Array.isArray(artist.genres) ? artist.genres : [],
        image: artist.images?.find(image => image.url)?.url || '',
        updatedAtMs: Date.now()
      };
      updated += 1;
    });
    writeJson(artistGenreCacheKey, cache);
  }
  window.dispatchEvent(new Event('melophile:past-tense-artist-metadata-updated'));
  return { checked: artistIds.length, updated };
}

export async function refreshPastTenseCache({
  clientId,
  force = true,
  onProgress
}: {
  clientId?: string;
  force?: boolean;
  onProgress?: (progress: PastTenseRefreshProgress) => void;
} = {}): Promise<PastTenseRefreshResult> {
  const token = await getValidSpotifyToken(clientId);
  if (!token) throw new Error('spotify connection needed');

  const playlistCache = readJson<Record<string, CachedSpotifyPlaylist>>(playlistCacheKey, {});
  const trackStore = readJson<CachedTrackStore>(trackCacheKey, { playlists: {} });
  trackStore.playlists = trackStore.playlists || {};
  let refreshedPlaylists = 0;

  for (let index = 0; index < pastTensePlaylists.length; index += 1) {
    const playlist = pastTensePlaylists[index];
    const cachedTrackEntry = trackStore.playlists[playlist.id];
    const stale = Date.now() - (Number(cachedTrackEntry?.updatedAtMs) || 0) > trackCacheTtlMs;
    if (!force && Array.isArray(cachedTrackEntry?.tracks) && cachedTrackEntry.tracks.length && !stale) continue;

    onProgress?.({ current: index + 1, total: pastTensePlaylists.length, label: playlist.name });
    const details = await spotifyFetch(
      `/v1/playlists/${encodeURIComponent(playlist.id)}?fields=${encodeURIComponent('id,name,uri,external_urls,images,tracks(total)')}`,
      token
    );
    playlistCache[playlist.id] = {
      name: details.name || playlist.name,
      url: details.external_urls?.spotify || playlist.url,
      images: Array.isArray(details.images) ? details.images : [],
      tracks: { total: Number(details.tracks?.total) || 0 }
    };
    writeJson(playlistCacheKey, playlistCache);

    const tracks = await loadSpotifyPlaylistTracks(playlist.id, token);
    trackStore.playlists[playlist.id] = {
      total: tracks.length,
      tracks,
      updatedAtMs: Date.now()
    };
    trackStore.updatedAtMs = Date.now();
    writeJson(trackCacheKey, { ...trackStore, version: trackCacheVersion });
    refreshedPlaylists += 1;
  }

  window.dispatchEvent(new Event('melophile:past-tense-cache-updated'));
  const snapshot = readPastTenseLiveSnapshot();
  return {
    cachedPlaylists: snapshot.stats.cachedPlaylists,
    cachedTracks: snapshot.stats.cachedTracks,
    refreshedPlaylists
  };
}

export function applyTrackPlayCounts(
  playlists: PastTensePlaylist[],
  result: TrackPlayCountResult | null | undefined,
  trackRefs: PastTenseTrackRef[] = []
) {
  const playlistCounts = result?.playlistCounts || {};
  const matchCounts = playlistTrackMatchCounts(result?.trackCounts || {});
  const unmatchedSamples = playlistUnmatchedSamples(result?.trackCounts || {}, trackRefs);
  return playlists.map(playlist => {
    const count = Number(playlistCounts[playlist.id]);
    const matchCount = matchCounts[playlist.id];
    const matchFields = matchCount
      ? {
          sqliteMatchedTracks: matchCount.matched,
          sqliteMatchTrackTotal: matchCount.total,
          sqliteUnmatchedSamples: unmatchedSamples[playlist.id] || []
        }
      : {};
    if (!Number.isFinite(count) || count <= 0) return { ...playlist, ...matchFields };
    return {
      ...playlist,
      ...matchFields,
      scrobbleCount: count,
      scrobbleCountSource: 'sqlite' as const
    };
  });
}

export function summarizeTrackMatches(snapshot: PastTenseLiveSnapshot, result: TrackPlayCountResult | null | undefined): PastTenseMatchStats | null {
  if (!result?.trackCounts) return null;
  const playlistCounts = result.playlistCounts || {};
  return {
    matchedPlaylists: Object.values(playlistCounts).filter(count => Number(count) > 0).length,
    matchedTracks: Object.values(result.trackCounts).filter(count => Number(count) > 0).length,
    totalPlaylists: snapshot.stats.cachedPlaylists,
    totalTracks: snapshot.stats.cachedTracks
  };
}

function playlistTrackMatchCounts(trackCounts: Record<string, number>) {
  return Object.entries(trackCounts).reduce<Record<string, { matched: number; total: number }>>((counts, [key, value]) => {
    const playlistId = key.split('|||')[0];
    if (!playlistId) return counts;
    const current = counts[playlistId] || { matched: 0, total: 0 };
    current.total += 1;
    if (Number(value) > 0) current.matched += 1;
    counts[playlistId] = current;
    return counts;
  }, {});
}

function playlistUnmatchedSamples(trackCounts: Record<string, number>, trackRefs: PastTenseTrackRef[]) {
  return trackRefs.reduce<Record<string, PastTenseUnmatchedSample[]>>((samples, ref) => {
    if (Number(trackCounts[ref.key]) > 0) return samples;
    const current = samples[ref.playlistId] || [];
    if (current.length >= 3) return samples;
    current.push({
      trackName: ref.trackName,
      artists: ref.artists,
      label: `${ref.trackName} · ${ref.artists.join(', ')}`
    });
    samples[ref.playlistId] = current;
    return samples;
  }, {});
}

export function valueForMetric(playlist: PastTensePlaylist, metric: PastTenseMetric) {
  return metric === 'scrobbles' ? playlist.scrobbleCount : playlist.songCount;
}

export function labelForMetric(metric: PastTenseMetric) {
  return metric === 'scrobbles' ? 'scrobbles' : 'songs';
}

async function loadSpotifyPlaylistTracks(playlistId: string, token: { access_token?: string }) {
  const fields = 'items(track(id,name,uri,external_urls,duration_ms,artists(id,name),album(name,images))),next,total';
  let next: string | null = `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks?limit=100&fields=${encodeURIComponent(fields)}`;
  const tracks: PastTenseCachedTrack[] = [];
  while (next) {
    const page = await spotifyFetch(next, token);
    (page.items || []).forEach((item: { track?: PastTenseCachedTrack }) => {
      if (item?.track) tracks.push(item.track);
    });
    next = page.next || null;
  }
  return tracks;
}
