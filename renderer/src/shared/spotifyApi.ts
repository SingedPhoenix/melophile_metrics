const spotifyClientIdKey = 'melophile.spotify.clientId';
const spotifyTokenKey = 'melophile.spotify.token';
const spotifyAuthorizationKey = 'melophile.spotify.authorization';
const spotifyAuthNoticeKey = 'melophile.spotify.authNotice';
const spotifyScopes = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-modify-playback-state'
];

export type SpotifyToken = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
};

export type SpotifyAudioFeaturesProbe =
  | { state: 'available'; fields: string[] }
  | { state: 'not-authorized' }
  | { state: 'unavailable'; status: number };

type SpotifyAuthorization = {
  verifier: string;
  state: string;
  createdAt: number;
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

export function readStoredSpotifyToken() {
  return readJson<SpotifyToken | null>(spotifyTokenKey, null);
}

export function readActiveSpotifyToken() {
  const token = readStoredSpotifyToken();
  if (!token?.access_token || !token.expires_at) return null;
  return Date.now() > token.expires_at - 60_000 ? null : token;
}

export function hasSpotifyAuthorization() {
  const token = readStoredSpotifyToken();
  return Boolean(token?.access_token || token?.refresh_token);
}

export function getSpotifyRedirectUri() {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}`;
}

export async function beginSpotifyAuthorization(clientId?: string) {
  if (typeof window === 'undefined') throw new Error('spotify authorization needs a browser window');
  const resolvedClientId = (clientId || window.localStorage.getItem(spotifyClientIdKey) || '').trim();
  if (!resolvedClientId) throw new Error('spotify client id is required');

  const verifier = generateCodeVerifier();
  const state = generateCodeVerifier().slice(0, 32);
  const challenge = await generateCodeChallenge(verifier);
  writeJson(spotifyAuthorizationKey, { verifier, state, createdAt: Date.now() } satisfies SpotifyAuthorization);
  window.localStorage.removeItem(spotifyAuthNoticeKey);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: resolvedClientId,
    scope: spotifyScopes.join(' '),
    redirect_uri: getSpotifyRedirectUri(),
    state,
    code_challenge_method: 'S256',
    code_challenge: challenge
  });
  window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`);
}

export async function completeSpotifyAuthorization(): Promise<'idle' | 'connected' | 'canceled' | 'failed'> {
  if (typeof window === 'undefined') return 'idle';
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const authorizationError = params.get('error');
  if (!code && !authorizationError) return 'idle';

  const cleanUrl = `${window.location.pathname}#/settings`;
  if (authorizationError) {
    window.localStorage.setItem(spotifyAuthNoticeKey, 'spotify authorization was canceled');
    window.history.replaceState({}, document.title, cleanUrl);
    return 'canceled';
  }
  if (!code) return 'idle';

  const authorization = readJson<SpotifyAuthorization | null>(spotifyAuthorizationKey, null);
  const clientId = (window.localStorage.getItem(spotifyClientIdKey) || '').trim();
  if (!authorization?.verifier || authorization.state !== state || !clientId) {
    window.localStorage.setItem(spotifyAuthNoticeKey, 'spotify authorization could not be verified');
    window.history.replaceState({}, document.title, cleanUrl);
    return 'failed';
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: getSpotifyRedirectUri(),
        code_verifier: authorization.verifier
      })
    });
    if (!response.ok) throw new Error('spotify token exchange failed');
    const refreshed = await response.json();
    writeJson(spotifyTokenKey, {
      ...refreshed,
      expires_at: Date.now() + (refreshed.expires_in || 3600) * 1000
    });
    window.localStorage.removeItem(spotifyAuthorizationKey);
    window.localStorage.removeItem(spotifyAuthNoticeKey);
    window.history.replaceState({}, document.title, cleanUrl);
    return 'connected';
  } catch {
    window.localStorage.setItem(spotifyAuthNoticeKey, 'spotify authorization failed. reconnect spotify to try again.');
    window.history.replaceState({}, document.title, cleanUrl);
    return 'failed';
  }
}

export async function getValidSpotifyToken(clientId?: string) {
  const activeToken = readActiveSpotifyToken();
  if (activeToken) return activeToken;

  const storedToken = readStoredSpotifyToken();
  if (!storedToken?.refresh_token) return null;
  const resolvedClientId = (clientId || window.localStorage.getItem(spotifyClientIdKey) || '').trim();
  if (!resolvedClientId) return null;

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: resolvedClientId,
      grant_type: 'refresh_token',
      refresh_token: storedToken.refresh_token
    })
  });
  if (!response.ok) {
    window.localStorage.setItem(spotifyAuthNoticeKey, 'spotify authorization expired');
    return null;
  }

  const refreshed = await response.json();
  const token = {
    ...storedToken,
    ...refreshed,
    refresh_token: refreshed.refresh_token || storedToken.refresh_token,
    expires_at: Date.now() + (refreshed.expires_in || 3600) * 1000
  };
  writeJson(spotifyTokenKey, token);
  window.localStorage.removeItem(spotifyAuthNoticeKey);
  return token;
}

export async function probeSpotifyAudioFeatures(clientId?: string): Promise<SpotifyAudioFeaturesProbe> {
  const token = await getValidSpotifyToken(clientId);
  if (!token?.access_token) return { state: 'not-authorized' };

  // Public Spotify track used only to test whether this app may read audio features.
  const response = await fetch('https://api.spotify.com/v1/audio-features/3n3Ppam7vgaVa1iaRUc9Lp', {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });
  if (!response.ok) return { state: 'unavailable', status: response.status };
  const payload = await response.json() as Record<string, unknown>;
  const fields = ['acousticness', 'danceability', 'energy', 'instrumentalness', 'loudness', 'valence']
    .filter(field => typeof payload[field] === 'number');
  return { state: 'available', fields };
}

export async function spotifyFetch(pathOrUrl: string, token: { access_token?: string }, attempt = 0): Promise<any> {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `https://api.spotify.com${pathOrUrl}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });
  if (response.status === 429 && attempt < 2) {
    const retryAfter = Number(response.headers.get('Retry-After') || '2');
    await sleep(Math.max(1, retryAfter) * 1000);
    return spotifyFetch(pathOrUrl, token, attempt + 1);
  }
  if (!response.ok) throw new Error(response.status === 401 ? 'spotify authorization expired' : 'spotify request failed');
  return response.json();
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateCodeVerifier() {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

async function generateCodeChallenge(verifier: string) {
  const bytes = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes: Uint8Array) {
  let value = '';
  bytes.forEach(byte => { value += String.fromCharCode(byte); });
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
