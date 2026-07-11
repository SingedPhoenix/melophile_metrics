export type SpotifyCorrectionType = 'track' | 'artist' | 'album';
export type GenreProfileType = 'artist' | 'album' | 'track';

export type SpotifyLinkCorrection = {
  type: SpotifyCorrectionType;
  name: string;
  artist: string;
  url: string;
  updatedAt: number;
};

export type GenreProfile = {
  type: GenreProfileType;
  name: string;
  artist: string;
  family: string;
  primary: string;
  subgenres: string[];
  notes: string;
  source: 'manual';
  locked: boolean;
  updatedAt: number;
};

const spotifyLinkOverrideKey = 'melophile.spotify.linkOverrides';
const genreProfileKeyName = 'melophile.genreProfiles.v1';

function readJsonMap<T>(key: string): Record<string, T> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as Record<string, T> : {};
  } catch {
    return {};
  }
}

function writeJsonMap(key: string, value: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value || {}));
}

export function normalizeEntityText(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\b(remaster(?:ed)?|deluxe|edition|explicit|version|mono|stereo)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function correctionKey(type: string, name: string, artist = '') {
  return [type || 'track', normalizeEntityText(artist), normalizeEntityText(name)].join('|||');
}

export function normalizeSpotifyManualLink(value: string, expectedType: SpotifyCorrectionType) {
  const link = String(value || '').trim();
  if (!link) return '';
  const uriMatch = link.match(/^spotify:(track|album|artist|playlist):[A-Za-z0-9]+$/);
  if (uriMatch) return uriMatch[1] === expectedType ? link : '';
  try {
    const url = new URL(link);
    if (url.hostname !== 'open.spotify.com') return '';
    const pathMatch = url.pathname.match(/^\/(track|album|artist|playlist)\/[A-Za-z0-9]+/);
    if (!pathMatch || pathMatch[1] !== expectedType) return '';
    return `${url.origin}${url.pathname}`;
  } catch {
    return '';
  }
}

export function readSpotifyCorrections() {
  return readJsonMap<SpotifyLinkCorrection>(spotifyLinkOverrideKey);
}

export function spotifyCorrectionEntries() {
  return Object.entries(readSpotifyCorrections())
    .map(([key, correction]) => ({ key, ...correction }))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0) || String(a.name || '').localeCompare(String(b.name || '')));
}

export function saveSpotifyCorrection(correction: Omit<SpotifyLinkCorrection, 'updatedAt'>) {
  const key = correctionKey(correction.type, correction.name, correction.artist);
  const corrections = readSpotifyCorrections();
  corrections[key] = {
    ...correction,
    updatedAt: Date.now()
  };
  writeJsonMap(spotifyLinkOverrideKey, corrections);
  window.dispatchEvent(new Event('melophile:settings-corrections-updated'));
  return corrections[key];
}

export function clearSpotifyCorrection(type: SpotifyCorrectionType, name: string, artist = '') {
  const key = correctionKey(type, name, artist);
  const corrections = readSpotifyCorrections();
  const existed = Boolean(corrections[key]);
  delete corrections[key];
  writeJsonMap(spotifyLinkOverrideKey, corrections);
  window.dispatchEvent(new Event('melophile:settings-corrections-updated'));
  return existed;
}

export function splitGenreList(value: string) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export function readGenreProfiles() {
  return readJsonMap<GenreProfile>(genreProfileKeyName);
}

export function genreProfileEntries() {
  return Object.entries(readGenreProfiles())
    .map(([key, profile]) => ({ key, ...profile }))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0) || String(a.name || '').localeCompare(String(b.name || '')));
}

export function genreProfileCounts() {
  return genreProfileEntries().reduce((counts, profile) => {
    counts.total += 1;
    counts[profile.type] = (counts[profile.type] || 0) + 1;
    return counts;
  }, { total: 0, artist: 0, album: 0, track: 0 } as Record<GenreProfileType | 'total', number>);
}

export function saveGenreProfile(profile: Omit<GenreProfile, 'source' | 'locked' | 'updatedAt'>) {
  const key = correctionKey(profile.type, profile.name, profile.artist);
  const profiles = readGenreProfiles();
  profiles[key] = {
    ...profile,
    source: 'manual',
    locked: true,
    updatedAt: Date.now()
  };
  writeJsonMap(genreProfileKeyName, profiles);
  window.dispatchEvent(new Event('melophile:settings-corrections-updated'));
  return profiles[key];
}

export function clearGenreProfile(type: GenreProfileType, name: string, artist = '') {
  const key = correctionKey(type, name, artist);
  const profiles = readGenreProfiles();
  const existed = Boolean(profiles[key]);
  delete profiles[key];
  writeJsonMap(genreProfileKeyName, profiles);
  window.dispatchEvent(new Event('melophile:settings-corrections-updated'));
  return existed;
}
