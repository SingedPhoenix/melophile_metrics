import { expect, test } from '@playwright/test';

test('react renderer scaffold builds and loads', async ({ page }) => {
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
        topTracks: [{ rank: 1, artist: 'the midnight', track: 'los angeles', listens: 512 }],
        topAlbums: [{ rank: 1, artist: 'the midnight', album: 'endless summer', listens: 1024 }],
        months: [{ month: '2020-01', listens: 1200 }]
      })
    };
  });
  await page.goto('/dist/renderer/index.html');

  await expect(page.getByText('melophile metrics')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'the new architecture starts here' })).toBeVisible();
  await expect(page.getByText('react migration shell')).toBeVisible();
  await expect(page.getByText('173,971 sqlite scrobbles')).toBeVisible();
  await expect(page.getByText('top year 2020 · 25,468 listens')).toBeVisible();
  await expect(page.getByText('top artist the midnight · 2,048 listens')).toBeVisible();
  await expect(page.getByRole('button', { name: /past tense/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'settings' })).toBeVisible();
});

test('react renderer opens migrated Past Tense slice', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('melophile.pastTense.playlists.v2', JSON.stringify({
      '6h8yLdFD25fBxgXuiIxqzm': {
        name: 'Vol. 1970 cached test',
        url: 'https://open.spotify.com/playlist/6h8yLdFD25fBxgXuiIxqzm',
        images: [],
        tracks: { total: 77 }
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
        trackCounts: {},
        playlistCounts: {
          '6h8yLdFD25fBxgXuiIxqzm': 30000
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
      })
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
  await expect(page.getByText('1 playlists · 3 cached tracks')).toBeVisible();
  await expect(page.getByText('Vol. 1970 cached test')).toBeVisible();
  await expect(page.getByText('1970 · 3 tracks · track cache')).toBeVisible();

  await page.getByRole('button', { name: 'scrobbles' }).click();
  await expect(page.getByRole('button', { name: 'scrobbles' })).toHaveClass(/active/);
  await expect(page.getByText('ranked by annual listening scrobbles')).toBeVisible();
  await expect(page.getByText('1 playlists · 3 cached tracks · sqlite listens')).toBeVisible();
  await expect(page.getByText('25,468 scrobbles')).toBeVisible();
});
