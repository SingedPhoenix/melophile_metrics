const spotifyClientIdKey = 'melophile.spotify.clientId';
const spotifyTokenKey = 'melophile.spotify.token';
const spotifyAuthNoticeKey = 'melophile.spotify.authNotice';

export type SpotifyToken = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
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
