import { expect, test } from '@playwright/test';

test('react renderer scaffold builds and loads', async ({ page }) => {
  await page.addInitScript(() => {
    window.melophileDesktop = {
      platform: 'test',
      isElectron: true,
      readLocalConfig: async () => ({
        lastfm: { username: 'singedphoenix', apiKey: 'present' },
        spotify: { clientId: 'present', refreshToken: 'present' },
        musicbrainz: { contact: 'melophile@example.com' }
      }),
      databaseStatus: async () => ({ scrobbles: 173971, revisions: 16619, schemaVersion: 1 }),
      importLastfmScrobbles: async () => ({}),
      trackPlayCounts: async () => ({ trackCounts: {}, playlistCounts: {} }),
      yearlyListeningRollups: async () => ({
        years: [{ year: 2020, listens: 25468 }, { year: 2022, listens: 20894 }],
        topYears: [{ year: 2020, listens: 25468, rank: 1 }]
      }),
      listeningRollups: async () => ({
        topArtists: [{ rank: 1, artist: 'the midnight', listens: 2048 }],
        topTracks: [{ rank: 1, artist: 'the midnight', track: 'los angeles', listens: 512 }],
        topAlbums: [{ rank: 1, artist: 'the midnight', album: 'endless summer', listens: 1024 }],
        months: [{ month: '2020-01', listens: 1200 }]
      }),
      recentListening: async () => ({
        scrobbles: [{
          playedAtUts: 1783468800,
          playedAtIso: '2026-07-07T00:00:00.000Z',
          artist: 'health',
          track: 'you died',
          album: 'rat wars'
        }]
      }),
      freshOverview: async () => ({
        topAlbums: [{ rank: 1, artist: 'the midnight', album: 'endless summer', listens: 1024, lastPlayedUts: 1783468800 }],
        quietArtists: [{ rank: 1, artist: 'jay-z', listens: 422, lastPlayedUts: 1766188800, daysSinceLastPlayed: 200 }],
        recentArtists: [{ rank: 1, artist: 'magdalena bay', listens: 96, firstPlayedUts: 1735689600, lastPlayedUts: 1783468800 }]
      })
    };
  });
  await page.goto('/dist/renderer/index.html');

  await expect(page.getByText('melophile metrics')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'choose a listening lens' })).toBeVisible();
  await expect(page.getByText('desktop listening archive')).toBeVisible();
  await expect(page.getByText('173,971 sqlite scrobbles')).toBeVisible();
  await expect(page.getByText('top year 2020 · 25,468 listens')).toBeVisible();
  await expect(page.getByText('top artist the midnight · 2,048 listens')).toBeVisible();
  await expect(page.getByText('latest you died · health')).toBeVisible();
  await expect(page.getByRole('button', { name: /past tense/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'settings' })).toBeVisible();
});

test('react renderer supports section hash routes', async ({ page }) => {
  await page.goto('/dist/renderer/index.html#/past-tense');

  await expect(page.getByRole('heading', { name: 'past tense' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Sections' })).toBeVisible();
  await expect(page.locator('.shell-nav-button.active')).toHaveText('past tense');
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('#/past-tense');

  await page.getByRole('button', { name: 'sections' }).click();
  await expect(page.getByRole('heading', { name: 'choose a listening lens' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Sections' })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('#/');

  await page.evaluate(() => {
    window.location.hash = '#/settings';
  });
  await expect(page.getByRole('heading', { name: 'settings' })).toBeVisible();
  await expect(page.locator('.shell-nav-button.active')).toHaveText('settings');
});

test('react renderer opens migrated Past Tense slice', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('melophile.pastTense.playlists.v2', JSON.stringify({
      '6h8yLdFD25fBxgXuiIxqzm': {
        name: 'Vol. 1970 cached test',
        url: 'https://open.spotify.com/playlist/6h8yLdFD25fBxgXuiIxqzm',
        images: [],
        tracks: { total: 77 }
      },
      '3jHRYkH2s0sRFtlj0sZzrX': {
        name: 'Vol. 1971 cached test',
        url: 'https://open.spotify.com/playlist/3jHRYkH2s0sRFtlj0sZzrX',
        images: [],
        tracks: { total: 64 }
      }
    }));
    localStorage.setItem('melophile.pastTense.tracks.v1', JSON.stringify({
      version: 2,
      updatedAtMs: Date.now(),
      playlists: {
        '6h8yLdFD25fBxgXuiIxqzm': {
          total: 3,
          tracks: [
            { name: 'one', artists: [{ name: 'cached artist' }] },
            { name: 'two', artists: [{ name: 'cached artist' }] },
            { name: 'three', artists: [{ name: 'cached artist' }] }
          ]
        },
        '3jHRYkH2s0sRFtlj0sZzrX': {
          total: 2,
          tracks: [
            { name: 'low match one', artists: [{ name: 'cached artist' }] },
            { name: 'low match two', artists: [{ name: 'cached artist' }] }
          ]
        }
      }
    }));
    window.melophileDesktop = {
      platform: 'test',
      isElectron: true,
      readLocalConfig: async () => null,
      databaseStatus: async () => ({ scrobbles: 173971, revisions: 16619, schemaVersion: 1 }),
      importLastfmScrobbles: async () => ({}),
      trackPlayCounts: async () => ({
        trackCounts: {
          '6h8yLdFD25fBxgXuiIxqzm|||0': 10,
          '6h8yLdFD25fBxgXuiIxqzm|||1': 20,
          '6h8yLdFD25fBxgXuiIxqzm|||2': 30,
          '3jHRYkH2s0sRFtlj0sZzrX|||0': 0,
          '3jHRYkH2s0sRFtlj0sZzrX|||1': 12
        },
        playlistCounts: {
          '6h8yLdFD25fBxgXuiIxqzm': 30000,
          '3jHRYkH2s0sRFtlj0sZzrX': 12
        }
      }),
      yearlyListeningRollups: async () => ({
        years: [{ year: 2020, listens: 25468 }, { year: 2022, listens: 20894 }],
        topYears: [{ year: 2020, listens: 25468, rank: 1 }]
      }),
      listeningRollups: async () => ({
        topArtists: [{ rank: 1, artist: 'the midnight', listens: 2048 }],
        topTracks: [{ rank: 1, artist: 'the midnight', track: 'los angeles', listens: 512 }],
        topAlbums: [{ rank: 1, artist: 'the midnight', album: 'endless summer', listens: 1024 }],
        months: [{ month: '2020-01', listens: 1200 }]
      }),
      recentListening: async () => ({
        scrobbles: [{
          playedAtUts: 1783468800,
          playedAtIso: '2026-07-07T00:00:00.000Z',
          artist: 'health',
          track: 'you died',
          album: 'rat wars'
        }]
      }),
      freshOverview: async () => ({ topAlbums: [], quietArtists: [], recentArtists: [] }),
      openSpotify: async url => {
        window.__lastSpotifyUrl = url;
        return { opened: true, url };
      }
    };
  });
  await page.goto('/dist/renderer/index.html');

  await page.getByRole('button', { name: /past tense/i }).click();

  await expect(page.getByRole('heading', { name: 'past tense' })).toBeVisible();
  await expect(page.getByText('173,971 sqlite scrobbles available')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'top years' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'annual preference trend' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'songs' })).toHaveClass(/active/);
  await expect(page.locator('.playlist-grid .playlist-card')).toHaveCount(57);
  await expect(page.getByText('2 playlists · 5 cached tracks')).toBeVisible();
  await expect(page.locator('.playlist-grid').getByText('Vol. 1970 cached test')).toBeVisible();
  await expect(page.getByText('1970 · 3 tracks · track cache')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'match watchlist' })).toBeVisible();
  await expect(page.getByText('1/2 · 50%')).toBeVisible();
  await expect(page.getByText('low match one · cached artist')).toBeVisible();
  await page.getByRole('button', { name: 'low match one · cached artist' }).click();
  await expect.poll(() => page.evaluate(() => window.__lastSpotifyUrl)).toBe('spotify:search:low%20match%20one%20cached%20artist');
  await page.getByRole('link', { name: /Vol\. 1970 cached test on Spotify/ }).click();
  await expect.poll(() => page.evaluate(() => window.__lastSpotifyUrl)).toBe('https://open.spotify.com/playlist/6h8yLdFD25fBxgXuiIxqzm');

  await page.getByRole('button', { name: 'scrobbles' }).click();
  await expect(page.getByRole('button', { name: 'scrobbles' })).toHaveClass(/active/);
  await expect(page.getByText('ranked by annual listening scrobbles')).toBeVisible();
  await expect(page.getByText('2 playlists · 5 cached tracks · 4/5 sqlite-matched tracks')).toBeVisible();
  await expect(page.getByText('25,468 scrobbles')).toBeVisible();
});

test('react renderer opens migrated Pulse slice', async ({ page }) => {
  await page.addInitScript(() => {
    window.melophileDesktop = {
      platform: 'test',
      isElectron: true,
      readLocalConfig: async () => null,
      databaseStatus: async () => ({ scrobbles: 173971, revisions: 16619, schemaVersion: 1 }),
      importLastfmScrobbles: async () => ({}),
      trackPlayCounts: async () => ({ trackCounts: {}, playlistCounts: {} }),
      yearlyListeningRollups: async () => ({
        years: [{ year: 2020, listens: 25468 }, { year: 2022, listens: 20894 }],
        topYears: [{ year: 2020, listens: 25468, rank: 1 }]
      }),
      listeningRollups: async () => ({
        topArtists: [{ rank: 1, artist: 'the midnight', listens: 2048 }],
        topTracks: [{ rank: 1, artist: 'health', track: 'you died', listens: 512 }],
        topAlbums: [{ rank: 1, artist: 'the midnight', album: 'endless summer', listens: 1024 }],
        months: [
          { month: '2026-01', listens: 900 },
          { month: '2026-02', listens: 1200 }
        ]
      }),
      recentListening: async () => ({
        scrobbles: [{
          playedAtUts: 1783468800,
          playedAtIso: '2026-07-07T00:00:00.000Z',
          artist: 'health',
          track: 'you died',
          album: 'rat wars'
        }]
      }),
      freshOverview: async () => ({ topAlbums: [], quietArtists: [], recentArtists: [] }),
      openSpotify: async url => {
        window.__lastSpotifyUrl = url;
        return { opened: true, url };
      }
    };
  });
  await page.goto('/dist/renderer/index.html');

  await page.getByRole('button', { name: /pulse/i }).click();

  await expect(page.getByRole('heading', { name: 'pulse' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'recent listens' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'top tracks' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'top artists' })).toBeVisible();
  await expect(page.locator('.pulse-recent-panel').getByText('you died')).toBeVisible();
  await expect(page.locator('.pulse-recent-panel').getByText('health · rat wars')).toBeVisible();
  await expect(page.getByText('the midnight')).toBeVisible();
});

test('react renderer opens migrated Dashboard slice', async ({ page }) => {
  await page.addInitScript(() => {
    window.melophileDesktop = {
      platform: 'test',
      isElectron: true,
      readLocalConfig: async () => null,
      databaseStatus: async () => ({
        scrobbles: 173971,
        revisions: 16619,
        schemaVersion: 1,
        lastSync: {
          source: 'lastfm',
          mode: 'lastfm-cache',
          finished_at: '2026-07-09T22:00:00.000Z',
          rows_seen: 173971,
          rows_inserted: 0,
          rows_updated: 12,
          rows_unchanged: 173959,
          status: 'complete',
          message: 'last.fm scrobbles imported'
        }
      }),
      importLastfmScrobbles: async () => ({}),
      trackPlayCounts: async () => ({ trackCounts: {}, playlistCounts: {} }),
      yearlyListeningRollups: async () => ({
        years: [{ year: 2020, listens: 25468 }, { year: 2022, listens: 20894 }],
        topYears: [{ year: 2020, listens: 25468, rank: 1 }]
      }),
      listeningRollups: async () => ({
        topArtists: [{ rank: 1, artist: 'the midnight', listens: 2048 }],
        topTracks: [{ rank: 1, artist: 'health', track: 'you died', listens: 512 }],
        topAlbums: [{ rank: 1, artist: 'the midnight', album: 'endless summer', listens: 1024 }],
        months: [
          { month: '2026-01', listens: 900 },
          { month: '2026-02', listens: 1200 }
        ]
      }),
      recentListening: async () => ({
        scrobbles: [{
          playedAtUts: 1783468800,
          playedAtIso: '2026-07-07T00:00:00.000Z',
          artist: 'health',
          track: 'you died',
          album: 'rat wars'
        }]
      }),
      freshOverview: async () => ({ topAlbums: [], quietArtists: [], recentArtists: [] }),
      openSpotify: async url => {
        window.__lastSpotifyUrl = url;
        return { opened: true, url };
      }
    };
  });
  await page.goto('/dist/renderer/index.html');

  await page.getByRole('button', { name: /dashboard/i }).click();

  await expect(page.getByRole('heading', { name: 'dashboard' })).toBeVisible();
  await expect(page.getByText('stored scrobbles')).toBeVisible();
  await expect(page.locator('.dashboard-metrics').getByText('173,971')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'listening leaders' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'last database sync' })).toBeVisible();
  await expect(page.getByText('monthly listening contour')).toBeVisible();
  await expect(page.getByText('endless summer')).toBeVisible();
});

test('react renderer opens migrated Gem Mines slice', async ({ page }) => {
  await page.addInitScript(() => {
    window.melophileDesktop = {
      platform: 'test',
      isElectron: true,
      readLocalConfig: async () => null,
      databaseStatus: async () => ({ scrobbles: 173971, revisions: 16619, schemaVersion: 1 }),
      importLastfmScrobbles: async () => ({}),
      trackPlayCounts: async () => ({ trackCounts: {}, playlistCounts: {} }),
      yearlyListeningRollups: async () => ({
        years: [{ year: 2020, listens: 25468 }, { year: 2022, listens: 20894 }],
        topYears: [{ year: 2020, listens: 25468, rank: 1 }]
      }),
      listeningRollups: async () => ({
        topArtists: [{ rank: 1, artist: 'the midnight', listens: 2048 }],
        topTracks: [{ rank: 1, artist: 'health', track: 'you died', listens: 512 }],
        topAlbums: [{ rank: 1, artist: 'the midnight', album: 'endless summer', listens: 1024 }],
        months: [{ month: '2026-01', listens: 900 }]
      }),
      recentListening: async () => ({
        scrobbles: [{
          playedAtUts: 1783468800,
          playedAtIso: '2026-07-07T00:00:00.000Z',
          artist: 'health',
          track: 'you died',
          album: 'rat wars'
        }]
      }),
      freshOverview: async () => ({ topAlbums: [], quietArtists: [], recentArtists: [] }),
      openSpotify: async url => {
        window.__lastSpotifyUrl = url;
        return { opened: true, url };
      }
    };
  });
  await page.goto('/dist/renderer/index.html');

  await page.getByRole('button', { name: /gem mines/i }).click();

  await expect(page.getByRole('heading', { name: 'gem mines' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ranked gems' })).toBeVisible();
  await expect(page.locator('.gem-list-panel').getByText('you died')).toBeVisible();
  await expect(page.locator('.gem-list-panel').getByText('512')).toBeVisible();
  await page.locator('.gem-list-panel .spotify-open-row').first().click();
  await expect.poll(() => page.evaluate(() => window.__lastSpotifyUrl)).toContain('spotify:search:you%20died%20health');

  await page.getByRole('button', { name: 'albums' }).click();
  await expect(page.getByRole('button', { name: 'albums' })).toHaveClass(/active/);
  await expect(page.locator('.gem-list-panel').getByText('endless summer')).toBeVisible();
  await expect(page.locator('.gem-list-panel').getByText('1,024')).toBeVisible();
});

test('react renderer opens migrated Ghosted slice', async ({ page }) => {
  await page.addInitScript(() => {
    window.melophileDesktop = {
      platform: 'test',
      isElectron: true,
      readLocalConfig: async () => null,
      databaseStatus: async () => ({ scrobbles: 173971, revisions: 16619, schemaVersion: 1 }),
      importLastfmScrobbles: async () => ({}),
      trackPlayCounts: async () => ({ trackCounts: {}, playlistCounts: {} }),
      yearlyListeningRollups: async () => ({
        years: [{ year: 2020, listens: 25468 }, { year: 2022, listens: 20894 }],
        topYears: [{ year: 2020, listens: 25468, rank: 1 }]
      }),
      listeningRollups: async () => ({
        topArtists: [{ rank: 1, artist: 'the midnight', listens: 2048 }],
        topTracks: [{ rank: 1, artist: 'health', track: 'you died', listens: 512 }],
        topAlbums: [{ rank: 1, artist: 'the midnight', album: 'endless summer', listens: 1024 }],
        months: [{ month: '2026-01', listens: 900 }]
      }),
      recentListening: async () => ({
        scrobbles: [{
          playedAtUts: 1783468800,
          playedAtIso: '2026-07-07T00:00:00.000Z',
          artist: 'health',
          track: 'you died',
          album: 'rat wars'
        }]
      }),
      ghostedTracks: async options => ({
        minListens: options?.minListens || 5,
        tracks: [{
          rank: 1,
          artist: 'tears for fears',
          track: 'head over heels',
          album: 'songs from the big chair',
          listens: 15,
          firstPlayedUts: 1609459200,
          lastPlayedUts: 1640995200,
          daysSinceLastPlayed: 1286
        }]
      }),
      freshOverview: async () => ({ topAlbums: [], quietArtists: [], recentArtists: [] })
    };
  });
  await page.goto('/dist/renderer/index.html');

  await page.getByRole('button', { name: /ghosted/i }).click();

  await expect(page.getByRole('heading', { name: 'ghosted' })).toBeVisible();
  await expect(page.locator('.ghosted-list-panel').getByText('head over heels')).toBeVisible();
  await expect(page.locator('.ghosted-list-panel').getByText('tears for fears · songs from the big chair')).toBeVisible();
  await expect(page.locator('.ghosted-list-panel').getByText('1,286 days')).toBeVisible();
  await page.getByRole('button', { name: '10+' }).click();
  await expect(page.getByRole('button', { name: '10+' })).toHaveClass(/active/);
  await expect(page.getByText('tracks with at least 10 listens')).toBeVisible();
});

test('react renderer opens migrated Settings slice', async ({ page }) => {
  await page.addInitScript(() => {
    window.melophileDesktop = {
      platform: 'test',
      isElectron: true,
      readLocalConfig: async () => ({
        lastfm: { username: 'singedphoenix', apiKey: 'present' },
        spotify: { clientId: 'present', refreshToken: 'present' },
        listenbrainz: { username: 'singedphoenix' },
        musicbrainz: { contact: 'melophile@example.com' }
      }),
      databaseStatus: async () => ({
        scrobbles: 173971,
        revisions: 16619,
        schemaVersion: 1,
        lastSync: {
          source: 'lastfm',
          mode: 'lastfm-cache',
          finished_at: '2026-07-09T22:00:00.000Z',
          rows_seen: 173971,
          rows_inserted: 0,
          rows_updated: 12,
          rows_unchanged: 173959,
          status: 'complete',
          message: 'last.fm scrobbles imported'
        }
      }),
      importLastfmScrobbles: async () => ({}),
      trackPlayCounts: async () => ({ trackCounts: {}, playlistCounts: {} }),
      yearlyListeningRollups: async () => ({ years: [], topYears: [] }),
      listeningRollups: async () => ({ topArtists: [], topTracks: [], topAlbums: [], months: [] }),
      recentListening: async () => ({ scrobbles: [] }),
      ghostedTracks: async () => ({ minListens: 5, tracks: [] }),
      freshOverview: async () => ({ topAlbums: [], quietArtists: [], recentArtists: [] })
    };
  });
  await page.goto('/dist/renderer/index.html');

  await page.getByRole('button', { name: /settings/i }).click();

  await expect(page.getByRole('heading', { name: 'settings' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'connected accounts' })).toBeVisible();
  await expect(page.getByText('signed as singedphoenix')).toBeVisible();
  await page.getByRole('button', { name: 'data' }).click();
  await expect(page.getByRole('heading', { name: 'local sqlite database' })).toBeVisible();
  await expect(page.locator('.settings-data-grid').getByText('173,971')).toBeVisible();
  await page.getByRole('button', { name: 'appearance' }).click();
  await expect(page.getByRole('heading', { name: 'appearance' })).toBeVisible();
  await expect(page.getByText('amethyst dusk')).toBeVisible();
});

test('react renderer opens migrated Fresh slice', async ({ page }) => {
  await page.addInitScript(() => {
    window.melophileDesktop = {
      platform: 'test',
      isElectron: true,
      readLocalConfig: async () => null,
      databaseStatus: async () => ({ scrobbles: 173971, revisions: 16619, schemaVersion: 1 }),
      importLastfmScrobbles: async () => ({}),
      trackPlayCounts: async () => ({ trackCounts: {}, playlistCounts: {} }),
      yearlyListeningRollups: async () => ({
        years: [
          { year: 2020, listens: 25468 },
          { year: 2026, listens: 7314 }
        ],
        topYears: [{ year: 2020, listens: 25468, rank: 1 }]
      }),
      listeningRollups: async () => ({ topArtists: [], topTracks: [], topAlbums: [], months: [] }),
      recentListening: async () => ({ scrobbles: [] }),
      ghostedTracks: async () => ({ minListens: 5, tracks: [] }),
      freshOverview: async () => ({
        topAlbums: [{ rank: 1, artist: 'the midnight', album: 'endless summer', listens: 1024, lastPlayedUts: 1783468800 }],
        quietArtists: [{ rank: 1, artist: 'jay-z', listens: 422, lastPlayedUts: 1766188800, daysSinceLastPlayed: 200 }],
        recentArtists: [{ rank: 1, artist: 'magdalena bay', listens: 96, firstPlayedUts: 1735689600, lastPlayedUts: 1783468800 }]
      })
    };
  });
  await page.goto('/dist/renderer/index.html');

  await page.getByRole('button', { name: /fresh/i }).click();

  await expect(page.getByRole('heading', { name: 'fresh' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'quiet favorite artists' })).toBeVisible();
  await expect(page.getByText('jay-z')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'recently discovered artists' })).toBeVisible();
  await expect(page.getByText('magdalena bay')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'all-time album orbit' })).toBeVisible();
  await expect(page.getByText('endless summer')).toBeVisible();
});

test('react renderer shows shared empty states for missing rollups', async ({ page }) => {
  await page.addInitScript(() => {
    window.melophileDesktop = {
      platform: 'test',
      isElectron: true,
      readLocalConfig: async () => null,
      databaseStatus: async () => ({ scrobbles: 0, revisions: 0, schemaVersion: 1 }),
      importLastfmScrobbles: async () => ({}),
      trackPlayCounts: async () => ({ trackCounts: {}, playlistCounts: {} }),
      yearlyListeningRollups: async () => ({ years: [], topYears: [] }),
      listeningRollups: async () => ({ topArtists: [], topTracks: [], topAlbums: [], months: [] }),
      recentListening: async () => ({ scrobbles: [] }),
      ghostedTracks: async () => ({ minListens: 5, tracks: [] }),
      freshOverview: async () => ({ topAlbums: [], quietArtists: [], recentArtists: [] }),
      frissonOverview: async () => ({ repeatedTracks: [], enduringTracks: [], recentAnchors: [] })
    };
  });
  await page.goto('/dist/renderer/index.html#/fresh');

  await expect(page.getByRole('heading', { name: 'fresh' })).toBeVisible();
  await expect(page.getByText('no annual rankings yet')).toBeVisible();
  await expect(page.getByText('no quiet favorites yet')).toBeVisible();
  await expect(page.getByText('no album rankings yet')).toBeVisible();

  await page.getByRole('button', { name: 'gem mines' }).click();
  await expect(page.getByText('no tracks rankings yet')).toBeVisible();
});

test('react renderer opens migrated Frisson slice', async ({ page }) => {
  await page.addInitScript(() => {
    window.melophileDesktop = {
      platform: 'test',
      isElectron: true,
      readLocalConfig: async () => null,
      databaseStatus: async () => ({ scrobbles: 173971, revisions: 16619, schemaVersion: 1 }),
      importLastfmScrobbles: async () => ({}),
      trackPlayCounts: async () => ({ trackCounts: {}, playlistCounts: {} }),
      yearlyListeningRollups: async () => ({ years: [], topYears: [] }),
      listeningRollups: async () => ({ topArtists: [], topTracks: [], topAlbums: [], months: [] }),
      recentListening: async () => ({ scrobbles: [] }),
      ghostedTracks: async () => ({ minListens: 5, tracks: [] }),
      freshOverview: async () => ({ topAlbums: [], quietArtists: [], recentArtists: [] }),
      frissonOverview: async () => ({
        repeatedTracks: [{
          rank: 1,
          artist: 'health',
          track: 'you died',
          album: 'rat wars',
          listens: 512,
          firstPlayedUts: 1609459200,
          lastPlayedUts: 1783468800,
          spanDays: 2014,
          daysSinceLastPlayed: 3
        }],
        enduringTracks: [{
          rank: 1,
          artist: 'the midnight',
          track: 'los angeles',
          album: 'endless summer',
          listens: 480,
          firstPlayedUts: 1451606400,
          lastPlayedUts: 1783468800,
          spanDays: 3840,
          daysSinceLastPlayed: 3
        }],
        recentAnchors: [{
          rank: 1,
          artist: 'health',
          track: 'you died',
          album: 'rat wars',
          listens: 8,
          firstPlayedUts: 1782864000,
          lastPlayedUts: 1783468800,
          spanDays: 7,
          daysSinceLastPlayed: 3
        }]
      })
    };
  });
  await page.goto('/dist/renderer/index.html');

  await page.getByRole('button', { name: /frisson/i }).click();

  await expect(page.getByRole('heading', { name: 'frisson' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'repeat-heavy tracks' })).toBeVisible();
  await expect(page.locator('.frisson-list-panel').getByText('you died')).toBeVisible();
  await page.getByRole('button', { name: 'enduring' }).click();
  await expect(page.getByRole('heading', { name: 'enduring attachments' })).toBeVisible();
  await expect(page.locator('.frisson-list-panel').getByText('los angeles')).toBeVisible();
  await page.getByRole('button', { name: 'recent' }).click();
  await expect(page.getByRole('heading', { name: 'recent anchors' })).toBeVisible();
});
