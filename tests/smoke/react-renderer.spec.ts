import { expect, test } from '@playwright/test';

test('react renderer scaffold builds and loads', async ({ page }) => {
  await page.goto('/dist/renderer/index.html');

  await expect(page.getByText('melophile metrics')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'the new architecture starts here' })).toBeVisible();
  await expect(page.getByText('react migration shell')).toBeVisible();
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
      databaseStatus: async () => ({}),
      importLastfmScrobbles: async () => ({}),
      trackPlayCounts: async () => ({
        trackCounts: {},
        playlistCounts: {
          '6h8yLdFD25fBxgXuiIxqzm': 30000
        }
      })
    };
  });
  await page.goto('/dist/renderer/index.html');

  await page.getByRole('button', { name: /past tense/i }).click();

  await expect(page.getByRole('heading', { name: 'past tense' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'top release years' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'annual preference trend' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'songs' })).toHaveClass(/active/);
  await expect(page.locator('.playlist-grid .playlist-card')).toHaveCount(57);
  await expect(page.getByText('1 playlists · 3 cached tracks')).toBeVisible();
  await expect(page.getByText('Vol. 1970 cached test')).toBeVisible();
  await expect(page.getByText('1970 · 3 tracks · track cache')).toBeVisible();

  await page.getByRole('button', { name: 'scrobbles' }).click();
  await expect(page.getByRole('button', { name: 'scrobbles' })).toHaveClass(/active/);
  await expect(page.getByText('ranked by playlist scrobbles')).toBeVisible();
  await expect(page.getByText('1 playlists · 3 cached tracks · sqlite listens')).toBeVisible();
  await expect(page.getByText('30,000 scrobbles')).toBeVisible();
});
