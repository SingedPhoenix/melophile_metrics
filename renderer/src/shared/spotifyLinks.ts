export type SpotifyEntityType = 'track' | 'album' | 'artist' | 'playlist';

export function spotifySearchUri(type: SpotifyEntityType, name: string, artist = '') {
  const query = type === 'artist' ? name : `${name} ${artist}`.trim();
  if (!query) return '';
  return `spotify:search:${encodeURIComponent(query)}`;
}

export function openSpotifySearch(type: SpotifyEntityType, name: string, artist = '') {
  const uri = spotifySearchUri(type, name, artist);
  if (!uri) return Promise.resolve({ opened: false, url: '' });
  return window.melophileDesktop?.openSpotify
    ? window.melophileDesktop.openSpotify(uri)
    : Promise.resolve({ opened: false, url: uri });
}

export function openSpotifyUrl(url: string) {
  const value = String(url || '').trim();
  if (!value) return Promise.resolve({ opened: false, url: '' });
  return window.melophileDesktop?.openSpotify
    ? window.melophileDesktop.openSpotify(value)
    : Promise.resolve({ opened: false, url: value });
}
