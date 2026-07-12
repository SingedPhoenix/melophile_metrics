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
      importLastfmScrobbles: async rows => ({
        rowsInserted: rows.length,
        rowsUpdated: 0,
        rowsUnchanged: 0
      }),
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
      }),
      harvestRankings: async ({ type = 'tracks', window: windowKey = '1' } = {}) => ({
        type,
        window: windowKey,
        label: 'last 1 month',
        cutoffUts: 1780876800,
        anchorUts: 1783468800,
        rows: type === 'artists'
          ? [{ rank: 1, name: 'new harvest artist', artist: '', album: '', listens: 19, firstPlayedUts: 1780876800 }]
          : [{ rank: 1, name: 'velvet daylight', artist: 'new harvest artist', album: 'first crop', listens: 19, firstPlayedUts: 1780876800 }]
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
  await page.route('https://api.spotify.com/v1/artists**', async route => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        artists: [
          {
            id: 'artist-one',
            name: 'cached artist',
            genres: ['synthpop', 'new wave'],
            images: [{ url: 'https://example.com/cached-artist.jpg' }]
          },
          {
            id: 'artist-two',
            name: 'other cached artist',
            genres: ['new wave'],
            images: []
          }
        ]
      }
    });
  });
  await page.addInitScript(() => {
    localStorage.setItem('melophile.spotify.clientId', 'present');
    localStorage.setItem('melophile.spotify.token', JSON.stringify({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_at: Date.now() + 3600000
    }));
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
            { name: 'one', uri: 'spotify:track:one', duration_ms: 181000, artists: [{ id: 'artist-one', name: 'cached artist' }], album: { name: 'first album' } },
            { name: 'two', duration_ms: 182000, artists: [{ id: 'artist-one', name: 'cached artist' }], album: { name: 'first album' } },
            { name: 'three', duration_ms: 183000, artists: [{ id: 'artist-two', name: 'other cached artist' }], album: { name: 'second album' } }
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
    localStorage.setItem('melophile.pastTense.artistGenres.v1', JSON.stringify({}));
    window.melophileDesktop = {
      platform: 'test',
      isElectron: true,
      readLocalConfig: async () => ({ spotify: { clientId: 'present', refreshToken: 'present' } }),
      databaseStatus: async () => ({ scrobbles: 173971, revisions: 16619, schemaVersion: 1 }),
      importLastfmScrobbles: async rows => ({
        rowsInserted: rows.length,
        rowsUpdated: 0,
        rowsUnchanged: 0
      }),
      trackPlayCounts: async () => ({
        trackCounts: {
          '6h8yLdFD25fBxgXuiIxqzm|||0': 10,
          '6h8yLdFD25fBxgXuiIxqzm|||1': 20,
          '6h8yLdFD25fBxgXuiIxqzm|||2': 30,
          '3jHRYkH2s0sRFtlj0sZzrX|||0': 0,
          '3jHRYkH2s0sRFtlj0sZzrX|||1': 12
        },
        trackGems: {
          '6h8yLdFD25fBxgXuiIxqzm|||0': {
            name: 'diamond',
            label: 'diamond',
            color: '#A8D8EA',
            rank: 42,
            count: 10
          }
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
  await page.getByRole('button', { name: 'open Vol. 1970 cached test details' }).click();
  await expect(page.getByRole('heading', { name: 'Vol. 1970 cached test' })).toBeVisible();
  await expect(page.getByText('3 cached tracks from 1970')).toBeVisible();
  await expect(page.getByText('top artists of 1970')).toBeVisible();
  await expect(page.getByText('top genre')).toBeVisible();
  await expect(page.getByText('new wave')).toBeVisible();
  await expect(page.locator('.past-tense-artist-image')).toHaveCount(1);
  await expect(page.getByText('playlist tracks')).toBeVisible();
  await expect(page.getByText('one')).toBeVisible();
  await expect(page.locator('.past-tense-track-list li').first().getByText('cached artist · first album')).toBeVisible();
  await expect(page.locator('.past-tense-track-list li').first().getByText('diamond')).toBeVisible();
  await page.getByRole('button', { name: 'open playlist in spotify' }).click();
  await expect.poll(() => page.evaluate(() => window.__lastSpotifyUrl)).toBe('https://open.spotify.com/playlist/6h8yLdFD25fBxgXuiIxqzm');
  await page.getByText('one').click();
  await expect.poll(() => page.evaluate(() => window.__lastSpotifyUrl)).toBe('spotify:track:one');
  await page.getByRole('button', { name: 'back to years' }).click();
  await expect(page.getByRole('heading', { name: 'release-year volumes' })).toBeVisible();

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
      importLastfmScrobbles: async rows => ({
        rowsInserted: rows.length,
        rowsUpdated: 0,
        rowsUnchanged: 0
      }),
      trackPlayCounts: async () => ({ trackCounts: {}, playlistCounts: {} }),
      yearlyListeningRollups: async () => ({
        years: [{ year: 2020, listens: 25468 }, { year: 2022, listens: 20894 }],
        topYears: [{ year: 2020, listens: 25468, rank: 1 }]
      }),
      yearlyEntityRankings: async ({ year = 2022, type = 'tracks' } = {}) => ({
        year,
        type,
        rows: type === 'artists'
          ? [{ rank: 1, artist: 'the midnight', listens: 480 }]
          : type === 'albums'
            ? [{ rank: 1, artist: 'the midnight', album: 'endless summer', listens: 260 }]
            : Array.from({ length: 65 }, (_, index) => ({
                rank: index + 1,
                artist: index === 0 ? 'health' : 'the midnight',
                track: year === 2020 && index === 0 ? 'feel nothing' : index === 0 ? 'you died' : `momentous track ${index + 1}`,
                listens: 128 - index
              }))
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
  await expect(page.locator('.pulse-side-stack').getByText('the midnight')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'momentous' })).toBeVisible();
  await expect(page.locator('.pulse-momentous-panel').getByText('2022 · top tracks')).toBeVisible();
  await expect(page.locator('.pulse-momentous-panel').getByText('128')).toBeVisible();
  await expect(page.locator('.pulse-momentous-panel').getByText('showing #1-#50 of 65')).toBeVisible();
  await page.locator('.pulse-momentous-panel').getByRole('button', { name: 'next 50' }).click();
  await expect(page.locator('.pulse-momentous-panel').getByText('showing #51-#65 of 65')).toBeVisible();
  await expect(page.locator('.pulse-momentous-panel').getByText('momentous track 51')).toBeVisible();
  await page.locator('.pulse-momentous-panel').getByRole('button', { name: 'previous 50' }).click();
  await expect(page.locator('.pulse-momentous-panel').getByText('showing #1-#50 of 65')).toBeVisible();

  await page.locator('.pulse-momentous-panel').getByRole('button', { name: '2020' }).click();
  await expect(page.locator('.pulse-momentous-panel').getByText('feel nothing')).toBeVisible();

  await page.locator('.pulse-momentous-panel').getByRole('button', { name: 'artists' }).click();
  await expect(page.locator('.pulse-momentous-panel').getByText('480')).toBeVisible();
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
      importLastfmScrobbles: async rows => ({
        rowsInserted: rows.length,
        rowsUpdated: 0,
        rowsUnchanged: 0
      }),
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
      yearlyEntityRankings: async ({ year = 2022, type = 'tracks' } = {}) => ({
        year,
        type,
        rows: type === 'artists'
          ? [{ rank: 1, artist: 'poppy', listens: 77 }]
          : type === 'albums'
            ? [{ rank: 1, artist: 'the cure', album: 'wish', listens: 88 }]
            : [{ rank: 1, artist: 'health', track: year === 2020 ? 'feel nothing' : 'ashamed', listens: year === 2020 ? 99 : 66 }]
      }),
      listeningRollups: async () => ({
        topArtists: [{ rank: 1, artist: 'the midnight', listens: 2048 }],
        topTracks: [{ rank: 1, artist: 'health', track: 'you died', listens: 512 }],
        topAlbums: [{ rank: 1, artist: 'the midnight', album: 'endless summer', listens: 1024 }],
        months: [{ month: '2026-01', listens: 900 }]
      }),
      entityRankings: async ({ type = 'tracks' } = {}) => ({
        type,
        rows: type === 'artists'
          ? [
              { rank: 1, artist: 'the midnight', listens: 2048 },
              { rank: 14, artist: 'health', listens: 900 }
            ]
          : type === 'albums'
            ? [
                { rank: 1, artist: 'the midnight', album: 'endless summer', listens: 1024 },
                { rank: 11, artist: 'health', album: 'rat wars', listens: 420 }
              ]
            : [
                { rank: 1, artist: 'health', track: 'you died', listens: 512 },
                { rank: 26, artist: 'the midnight', track: 'los angeles', listens: 320 }
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

  await page.getByRole('button', { name: /gem mines/i }).click();

  await expect(page.getByRole('heading', { name: 'gem mines' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ranked gems' })).toBeVisible();
  await expect(page.locator('.gem-list-panel').getByText('black opal (#1-#30)')).toBeVisible();
  await expect(page.locator('.gem-list-panel').getByText('you died')).toBeVisible();
  await expect(page.locator('.gem-list-panel').getByText('512')).toBeVisible();
  await page.locator('.gem-list-panel .spotify-open-row').first().click();
  await expect.poll(() => page.evaluate(() => window.__lastSpotifyUrl)).toContain('spotify:search:you%20died%20health');
  await page.locator('.gem-scope-row').getByRole('button', { name: '2022' }).click();
  await expect(page.locator('.gem-list-panel').getByText('2022 tracks · black opal (#1-#30)')).toBeVisible();
  await expect(page.locator('.gem-list-panel').getByText('ashamed')).toBeVisible();
  await page.locator('.gem-scope-row').getByRole('button', { name: 'all-time' }).click();

  await page.locator('.gem-list-panel').getByRole('button', { name: 'diamond' }).click();
  await expect(page.locator('.gem-list-panel').getByText('los angeles')).toBeVisible();
  await expect(page.locator('.gem-list-panel').getByText('320')).toBeVisible();

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
      ghostedTracks: async options => {
        const type = options?.type || 'tracks';
        const base = {
          rank: 1,
          key: `${type}|||tears for fears|||head over heels`,
          type,
          artist: 'tears for fears',
          track: type === 'tracks' ? 'head over heels' : '',
          album: type === 'albums' ? 'songs from the big chair' : type === 'tracks' ? 'songs from the big chair' : '',
          title: type === 'artists' ? 'tears for fears' : type === 'albums' ? 'songs from the big chair' : 'head over heels',
          subtitle: type === 'artists' ? 'artist' : 'tears for fears',
          listens: 15,
          firstPlayedUts: 1609459200,
          lastPlayedUts: 1640995200,
          daysSinceLastPlayed: options?.window === 12 ? 1586 : 1286
        };
        return {
          anchorUts: 1783468800,
          entries: [base],
          minListens: options?.minListens || 5,
          tracks: type === 'tracks' ? [base] : [],
          type,
          window: options?.window || 6
        };
      },
      apotheosisWatchlist: async () => ({
        anchorUts: 1783468800,
        windowMonths: 6,
        artists: [{
          rank: 1,
          key: 'tears for fears',
          artist: 'tears for fears',
          listens: 404,
          newestTrack: 'everybody wants to rule the world',
          newestTrackUts: 1640995200,
          monthsSinceNewestTrack: 49
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

  await page.getByRole('button', { name: /ghosted/i }).click();

  await expect(page.getByRole('heading', { name: 'ghosted' })).toBeVisible();
  await expect(page.locator('.ghosted-list-panel').getByText('head over heels')).toBeVisible();
  await expect(page.locator('.ghosted-list-panel').getByText('tears for fears · last heard 1,286 days ago')).toBeVisible();
  await expect(page.locator('.ghosted-list-panel').getByText('1,286 days')).toBeVisible();
  await page.locator('.ghosted-list-panel').getByRole('button', { name: 'reshuffle' }).click();
  await expect(page.locator('.ghosted-list-panel').getByText('shuffled 100 queue · tracks')).toBeVisible();
  await page.locator('.ghosted-list-panel').getByRole('button', { name: 'reset', exact: true }).click();
  await page.getByRole('button', { name: '10+' }).click();
  await expect(page.getByRole('button', { name: '10+' })).toHaveClass(/active/);
  await expect(page.getByText('tracks not heard in 6 months · 10+ listens')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'expansion watchlist' })).toBeVisible();
  await expect(page.locator('.ghosted-expansion-panel').getByText('15 plays')).toBeVisible();
  await expect(page.locator('.ghosted-expansion-panel').getByText('last heard in your records')).toBeVisible();
  await page.locator('.ghosted-expansion-panel .spotify-open-row').first().click();
  await expect.poll(() => page.evaluate(() => window.__lastSpotifyUrl)).toContain('spotify:search:tears%20for%20fears');
  await page.locator('.ghosted-controls').getByRole('button', { name: '1 year' }).click();
  await expect(page.locator('.ghosted-list-panel').getByText('tears for fears · last heard 1,586 days ago')).toBeVisible();
  await page.locator('.ghosted-controls').getByRole('button', { name: 'artists' }).click();
  await expect(page.locator('.ghosted-list-panel').getByText('tears for fears')).toBeVisible();
  await expect(page.locator('.ghosted-list-panel').getByText('artist · last heard 1,586 days ago')).toBeVisible();
  await page.locator('.ghosted-list-panel').getByRole('button', { name: 'skip', exact: true }).click();
  await expect(page.getByText('no quiet favorites found')).toBeVisible();
  await page.locator('.ghosted-list-panel').getByRole('button', { name: 'reset skipped' }).click();
  await expect(page.locator('.ghosted-list-panel').getByText('artist · last heard 1,586 days ago')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'apotheosis' })).toBeVisible();
  await expect(page.locator('.apotheosis-panel').getByText('top 100 artists · no newly-added track in the last 6 months')).toBeVisible();
  await expect(page.locator('.apotheosis-panel').getByText('tears for fears')).toBeVisible();
  await expect(page.locator('.apotheosis-panel').getByText('newest track logged 49 months ago · everybody wants to rule the world')).toBeVisible();
  await page.locator('.apotheosis-panel .spotify-open-row').first().click();
  await expect.poll(() => page.evaluate(() => window.__lastSpotifyUrl)).toContain('spotify:search:tears%20for%20fears');
  await page.locator('.apotheosis-panel').getByRole('button', { name: 'shuffle' }).click();
  await expect(page.locator('.apotheosis-panel').getByText('shuffled 100 artists · no newly-added track in the last 6 months')).toBeVisible();
  await page.locator('.apotheosis-panel').getByRole('button', { name: 'skip', exact: true }).click();
  await expect(page.getByText('no artists found for this watchlist')).toBeVisible();
  await page.locator('.apotheosis-panel').getByRole('button', { name: 'reset skipped' }).click();
  await expect(page.locator('.apotheosis-panel').getByText('tears for fears')).toBeVisible();
});

test('react renderer opens migrated Settings slice', async ({ page }) => {
  await page.route('https://ws.audioscrobbler.com/2.0/**', async route => {
    const url = new URL(route.request().url());
    const method = url.searchParams.get('method');
    if (method === 'user.getinfo') {
      await route.fulfill({
        contentType: 'application/json',
        json: { user: { playcount: '3' } }
      });
      return;
    }
    if (method === 'user.getrecenttracks') {
      await route.fulfill({
        contentType: 'application/json',
        json: {
          recenttracks: {
            '@attr': { totalPages: '1', page: '1', total: '1' },
            track: [{
              name: 'synced new song',
              artist: { '#text': 'settings sync artist' },
              album: { '#text': 'settings sync album' },
              date: { uts: '1783760200' }
            }]
          }
        }
      });
      return;
    }
    await route.fulfill({ status: 404, body: '{}' });
  });
  await page.route('https://api.spotify.com/**', async route => {
    const url = new URL(route.request().url());
    const playlistMatch = url.pathname.match(/\/v1\/playlists\/([^/]+)$/);
    const tracksMatch = url.pathname.match(/\/v1\/playlists\/([^/]+)\/tracks$/);
    if (playlistMatch) {
      await route.fulfill({
        contentType: 'application/json',
        json: {
          id: playlistMatch[1],
          name: `Vol. ${playlistMatch[1].slice(0, 4)}`,
          uri: `spotify:playlist:${playlistMatch[1]}`,
          external_urls: { spotify: `https://open.spotify.com/playlist/${playlistMatch[1]}` },
          images: [],
          tracks: { total: 1 }
        }
      });
      return;
    }
    if (tracksMatch) {
      await route.fulfill({
        contentType: 'application/json',
        json: {
          items: [{
            track: {
              id: `track-${tracksMatch[1]}`,
              name: 'cached refresh track',
              uri: `spotify:track:${tracksMatch[1]}`,
              duration_ms: 180000,
              artists: [{ id: 'artist-refresh', name: 'refresh artist' }],
              album: { name: 'refresh album', images: [] }
            }
          }],
          next: null,
          total: 1
        }
      });
      return;
    }
    if (url.pathname === '/v1/search') {
      const query = url.searchParams.get('q') || 'artist';
      const id = query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'artist';
      await route.fulfill({
        contentType: 'application/json',
        json: {
          artists: {
            items: [{ id: `artist-${id}`, name: query }]
          }
        }
      });
      return;
    }
    if (url.pathname.startsWith('/v1/artists/') && url.pathname.endsWith('/albums')) {
      const artistId = url.pathname.split('/')[3];
      const isRecent = artistId.includes('recent');
      await route.fulfill({
        contentType: 'application/json',
        json: {
          items: [{
            id: isRecent ? 'settings-recent-release' : 'settings-seed-release',
            name: isRecent ? 'Settings Recent Single' : 'Settings Seed Single',
            album_type: 'single',
            release_date: '2026-07-01',
            uri: isRecent ? 'spotify:album:settings-recent-release' : 'spotify:album:settings-seed-release',
            external_urls: { spotify: isRecent ? 'https://open.spotify.com/album/settings-recent-release' : 'https://open.spotify.com/album/settings-seed-release' },
            images: [{ url: 'https://example.com/settings-release.jpg' }],
            artists: [{ name: isRecent ? 'settings recent artist' : 'settings seed artist' }]
          }]
        }
      });
      return;
    }
    await route.fulfill({ status: 404, body: '{}' });
  });
  await page.addInitScript(() => {
    localStorage.setItem('melophile.spotify.clientId', 'present');
    localStorage.setItem('melophile.spotify.token', JSON.stringify({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_at: Date.now() + 3600000
    }));
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
      importLastfmScrobbles: async rows => ({
        rowsInserted: rows.length,
        rowsUpdated: 0,
        rowsUnchanged: 0
      }),
      trackPlayCounts: async () => ({ trackCounts: {}, playlistCounts: {} }),
      yearlyListeningRollups: async () => ({ years: [], topYears: [] }),
      listeningRollups: async () => ({ topArtists: [], topTracks: [], topAlbums: [], months: [] }),
      entityRankings: async ({ type = 'tracks' } = {}) => ({ type, rows: [] }),
      recentListening: async () => ({ scrobbles: [] }),
      ghostedTracks: async () => ({ minListens: 5, tracks: [] }),
      freshOverview: async () => ({
        topAlbums: [],
        quietArtists: [{ rank: 1, artist: 'settings seed artist', listens: 120, lastPlayedUts: 1766188800, daysSinceLastPlayed: 200 }],
        recentArtists: [{ rank: 1, artist: 'settings recent artist', listens: 42, firstPlayedUts: 1735689600, lastPlayedUts: 1783468800 }]
      })
    };
  });
  await page.goto('/dist/renderer/index.html');
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('melophile-lastfm-cache', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('scrobbles')) db.createObjectStore('scrobbles', { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('scrobbles', 'readwrite');
        const store = tx.objectStore('scrobbles');
        store.put({ id: '1|settings artist|settings song', uts: '1783760000', artist: 'settings artist', track: 'settings song', album: 'settings album' });
        store.put({ id: '2|settings artist|second song', uts: '1783760100', artist: 'settings artist', track: 'second song', album: 'settings album' });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
    localStorage.setItem('melophile.lastfm.lastSyncAt', '2026-07-09T22:00:00.000Z');
    localStorage.setItem('melophile.lastfm.lastRebuildAt', '2026-07-09T22:00:00.000Z');
  });

  await page.getByRole('button', { name: /settings/i }).click();

  await expect(page.getByRole('heading', { name: 'settings' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'connected accounts' })).toBeVisible();
  await expect(page.getByText('signed as singedphoenix')).toBeVisible();
  await page.getByRole('button', { name: 'data' }).click();
  await expect(page.getByRole('heading', { name: 'local sqlite database' })).toBeVisible();
  await expect(page.locator('.settings-data-grid').getByText('173,971')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'last.fm data integrity' })).toBeVisible();
  await page.getByRole('button', { name: 'load cached history' }).click();
  await expect(page.getByText('2 cached scrobbles loaded.')).toBeVisible();
  await page.getByRole('button', { name: 'save cache to sqlite' }).click();
  await expect(page.getByText('Last.fm cache saved to SQLite · 2 inserted · 0 updated · 0 unchanged')).toBeVisible();
  await page.getByRole('button', { name: 'sync new scrobbles' }).click();
  await expect(page.getByText(/3 cached scrobbles synced from Last\.fm/)).toBeVisible();
  await expect.poll(() => page.evaluate(async () => {
    return new Promise<number>((resolve, reject) => {
      const request = indexedDB.open('melophile-lastfm-cache', 1);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('scrobbles', 'readonly');
        const countRequest = tx.objectStore('scrobbles').count();
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => reject(countRequest.error);
      };
      request.onerror = () => reject(request.error);
    });
  })).toBe(3);
  await expect(page.getByRole('heading', { name: 'spotify maintenance' })).toBeVisible();
  await expect(page.getByText(/scheduled scans wait/)).toBeVisible();
  await page.getByRole('button', { name: 'run seed scan now' }).click();
  await expect(page.getByText('2 seed releases stored')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'past tense cache' })).toBeVisible();
  await expect(page.getByText('refresh needed')).toBeVisible();
  await expect(page.locator('section[aria-labelledby="past-tense-cache-title"]').getByText('next refresh', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'refresh past tense cache' }).click();
  await expect(page.getByText('57 playlists · 57 tracks cached')).toBeVisible({ timeout: 12000 });
  await expect.poll(() => page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('melophile.pastTense.tracks.v1') || '{}');
    return Object.keys(stored.playlists || {}).length;
  })).toBe(57);
  await page.getByRole('button', { name: 'run scheduled refresh now' }).click();
  await expect(page.getByText('past tense cache is fresh; next refresh scheduled')).toBeVisible({ timeout: 12000 });
  await expect.poll(() => page.evaluate(() => {
    const schedule = JSON.parse(localStorage.getItem('melophile.pastTense.cacheSchedule.v1') || '{}');
    return Boolean(schedule.lastRefreshMs && schedule.nextRefreshMs && /next refresh/.test(schedule.lastStatus || ''));
  })).toBe(true);
  await page.getByRole('button', { name: 'corrections' }).click();
  await expect(page.getByRole('heading', { name: 'spotify link corrections' })).toBeVisible();
  await page.getByPlaceholder('track, artist, or album name').fill('settings test song');
  await page.getByPlaceholder('artist name if needed').first().fill('settings artist');
  await page.getByPlaceholder('correct open.spotify.com or spotify: url').fill('https://open.spotify.com/track/1234567890abcdef123456');
  await page.getByRole('button', { name: 'apply correction' }).click();
  await expect(page.getByText('correction saved for settings test song.')).toBeVisible();
  await expect(page.getByText('settings test song', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'edit' }).first().click();
  await expect(page.getByPlaceholder('correct open.spotify.com or spotify: url')).toHaveValue('https://open.spotify.com/track/1234567890abcdef123456');
  await expect.poll(() => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('melophile.spotify.linkOverrides') || '{}')).length)).toBe(1);
  await page.getByPlaceholder('artist, album, or track name').fill('settings genre artist');
  await page.getByPlaceholder('genre family').fill('electronic');
  await page.getByPlaceholder('primary genre').fill('synthpop');
  await page.getByPlaceholder('subgenres, comma separated').fill('dream pop, indie electronic');
  await page.getByRole('button', { name: 'save genre' }).click();
  await expect(page.getByText('saved manual genre profile for settings genre artist.')).toBeVisible();
  await expect(page.getByText('dream pop, indie electronic')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('melophile.genreProfiles.v1') || '{}')).length)).toBe(1);
  await page.getByRole('button', { name: 'appearance' }).click();
  await expect(page.getByRole('heading', { name: 'appearance' })).toBeVisible();
  await expect(page.getByText('amethyst dusk')).toBeVisible();
});

test('react renderer opens migrated Fresh slice', async ({ page }) => {
  await page.route('https://api.spotify.com/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/v1/me/playlists') {
      await route.fulfill({
        contentType: 'application/json',
        json: {
          items: [
            {
              id: 'fresh-seeds-one',
              name: 'Fresh Seeds Vol. 1',
              uri: 'spotify:playlist:fresh-seeds-one',
              external_urls: { spotify: 'https://open.spotify.com/playlist/fresh-seeds-one' },
              images: [{ url: 'https://example.com/seed.jpg' }],
              owner: { display_name: 'melophile' },
              tracks: { total: 32 }
            },
            {
              id: 'harvest-one',
              name: 'Fresh Harvest Vol. 1',
              uri: 'spotify:playlist:harvest-one',
              external_urls: { spotify: 'https://open.spotify.com/playlist/harvest-one' },
              images: [{ url: 'https://example.com/harvest.jpg' }],
              owner: { display_name: 'melophile' },
              tracks: { total: 44 }
            }
          ],
          next: null
        }
      });
      return;
    }
    if (url.pathname.startsWith('/v1/playlists/') && url.pathname.endsWith('/tracks')) {
      const playlistId = url.pathname.split('/')[3];
      const isHarvest = playlistId === 'harvest-one';
      const isCompost = playlistId === '1LQdBqvVyYOWWXE7wkh7Cf';
      await route.fulfill({
        contentType: 'application/json',
        json: {
          items: [
            {
              track: {
                id: isCompost ? 'compost-track-one' : isHarvest ? 'harvest-track-one' : 'seed-track-one',
                name: isCompost ? 'Moonlit Test Single' : isHarvest ? 'ripe harvest song' : 'new seed song',
                uri: isCompost ? 'spotify:track:compost-track-one' : isHarvest ? 'spotify:track:harvest-track-one' : 'spotify:track:seed-track-one',
                duration_ms: 188000,
                artists: [{ id: 'artist-new-harvest', name: isCompost ? 'magdalena bay' : isHarvest ? 'new harvest artist' : 'magdalena bay' }],
                album: { name: isCompost ? 'Moonlit Test Single' : isHarvest ? 'first crop' : 'seedling' }
              }
            },
            {
              track: {
                id: isCompost ? 'compost-track-two' : isHarvest ? 'harvest-track-two' : 'seed-track-two',
                name: isCompost ? 'compost filler' : isHarvest ? 'quiet harvest song' : 'second seed song',
                uri: isCompost ? 'spotify:track:compost-track-two' : isHarvest ? 'spotify:track:harvest-track-two' : 'spotify:track:seed-track-two',
                duration_ms: 191000,
                artists: [{ id: 'artist-jay-z', name: isHarvest ? 'jay-z' : 'magdalena bay' }],
                album: { name: isHarvest ? 'return basket' : 'seedling' }
              }
            }
          ],
          next: null,
          total: 2
        }
      });
      return;
    }
    if (url.pathname === '/v1/search') {
      const query = url.searchParams.get('q') || 'artist';
      const id = query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'artist';
      await route.fulfill({
        contentType: 'application/json',
        json: {
          artists: {
            items: [{ id: `artist-${id}`, name: query }]
          }
        }
      });
      return;
    }
    if (url.pathname.startsWith('/v1/artists/') && url.pathname.endsWith('/albums')) {
      const artistId = url.pathname.split('/')[3];
      const isRecent = artistId.includes('magdalena');
      await route.fulfill({
        contentType: 'application/json',
        json: {
          items: [{
            id: isRecent ? 'moonlit-test-single' : 'blueprint-return',
            name: isRecent ? 'Moonlit Test Single' : 'Blueprint Return',
            album_type: 'single',
            release_date: '2026-07-01',
            uri: isRecent ? 'spotify:album:moonlit-test-single' : 'spotify:album:blueprint-return',
            external_urls: { spotify: 'https://open.spotify.com/album/test-release' },
            images: [{ url: 'https://example.com/release.jpg' }],
            artists: [{ name: isRecent ? 'magdalena bay' : 'jay-z' }]
          }]
        }
      });
      return;
    }
    await route.fulfill({ status: 404, body: '{}' });
  });
  await page.addInitScript(() => {
    localStorage.setItem('melophile.spotify.clientId', 'present');
    localStorage.setItem('melophile.spotify.token', JSON.stringify({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_at: Date.now() + 3600000
    }));
    window.melophileDesktop = {
      platform: 'test',
      isElectron: true,
      openSpotify: async url => {
        window.__lastSpotifyUrl = url;
        return { opened: true, url };
      },
      readLocalConfig: async () => null,
      databaseStatus: async () => ({ scrobbles: 173971, revisions: 16619, schemaVersion: 1 }),
      importLastfmScrobbles: async () => ({}),
      trackPlayCounts: async tracks => ({
        trackCounts: Object.fromEntries(tracks.map(track => [track.key, track.trackName === 'ripe harvest song' ? 14 : 3])),
        playlistCounts: {}
      }),
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
      }),
      harvestRankings: async ({ type = 'tracks', window: windowKey = '1' } = {}) => ({
        type,
        window: windowKey,
        label: 'last 1 month',
        cutoffUts: 1780876800,
        anchorUts: 1783468800,
        rows: type === 'artists'
          ? [{ rank: 1, name: 'new harvest artist', artist: '', album: '', listens: 19, firstPlayedUts: 1780876800 }]
          : [{ rank: 1, name: 'velvet daylight', artist: 'new harvest artist', album: 'first crop', listens: 19, firstPlayedUts: 1780876800 }]
      })
    };
  });
  await page.goto('/dist/renderer/index.html');

  await page.getByRole('button', { name: /fresh/i }).click();

  await expect(page.getByRole('heading', { name: 'fresh' })).toBeVisible();
  await expect(page.getByRole('button', { name: /seed/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /harvest/i })).toBeVisible();
  await page.getByRole('button', { name: /seed/i }).click();
  await expect(page.getByRole('heading', { name: 'seed playlists' })).toBeVisible();
  await expect(page.getByText(/scheduled scans wait/)).toBeVisible();
  await page.getByRole('button', { name: 'load spotify playlists' }).click();
  await expect(page.getByText('2 spotify playlists loaded')).toBeVisible();
  await expect(page.getByRole('button', { name: /Fresh Seeds Vol\. 1/i })).toBeVisible();
  await page.getByRole('button', { name: /Fresh Seeds Vol\. 1/i }).click();
  await expect(page.getByRole('heading', { name: 'Fresh Seeds Vol. 1' })).toBeVisible();
  await expect(page.getByText('new seed song')).toBeVisible();
  await page.getByRole('button', { name: 'open in spotify' }).click();
  await expect.poll(() => page.evaluate(() => window.__lastSpotifyUrl)).toBe('spotify:playlist:fresh-seeds-one');
  await page.getByRole('button', { name: 'scan releases' }).click();
  await expect(page.getByText('2 fresh releases scanned')).toBeVisible();
  await expect(page.getByText(/2 releases stored/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Moonlit Test Single/i })).toBeVisible();
  await page.getByRole('button', { name: /Moonlit Test Single/i }).click();
  await expect.poll(() => page.evaluate(() => window.__lastSpotifyUrl)).toBe('spotify:album:moonlit-test-single');
  await page.getByRole('button', { name: 'refresh decision index' }).click();
  await expect(page.getByText('1 hidden by decision index')).toBeVisible();
  await expect(page.getByRole('button', { name: /Moonlit Test Single/i })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'recent discovery queue' })).toBeVisible();
  await expect(page.getByRole('article').filter({ hasText: 'recent discovery queue' }).getByText('magdalena bay')).toBeVisible();
  await page.getByRole('button', { name: 'fresh home' }).click();
  await page.getByRole('button', { name: /harvest/i }).click();
  await expect(page.getByRole('heading', { name: 'harvest playlists' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Fresh Harvest Vol\. 1/i })).toBeVisible();
  await page.getByRole('button', { name: /Fresh Harvest Vol\. 1/i }).click();
  await expect(page.getByRole('heading', { name: 'Fresh Harvest Vol. 1' })).toBeVisible();
  await expect(page.getByText('ripe harvest song')).toBeVisible();
  await expect(page.getByText('1 ready to prune at 12+ scrobbles')).toBeVisible();
  await expect(page.getByText('14 scrobbles')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'harvest rankings' })).toBeVisible();
  await expect(page.getByRole('button', { name: /velvet daylight/i })).toBeVisible();
  await page.getByRole('button', { name: /velvet daylight/i }).click();
  await expect.poll(() => page.evaluate(() => window.__lastSpotifyUrl)).toBe('spotify:search:velvet%20daylight%20new%20harvest%20artist');
  await page.getByRole('button', { name: 'artists' }).click();
  await expect(page.getByRole('button', { name: /new harvest artist/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'expansion watchlist' })).toBeVisible();
  await expect(page.getByRole('article').filter({ hasText: 'expansion watchlist' }).getByText('jay-z')).toBeVisible();
  await page.getByRole('button', { name: 'fresh home' }).click();
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
  await expect(page.getByText('no entries found in this mine')).toBeVisible();
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
