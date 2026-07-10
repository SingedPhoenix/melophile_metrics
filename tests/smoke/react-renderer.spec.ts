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
  await page.goto('/dist/renderer/index.html');

  await page.getByRole('button', { name: /past tense/i }).click();

  await expect(page.getByRole('heading', { name: 'past tense' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'top release years' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'annual preference trend' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'songs' })).toHaveClass(/active/);
  await expect(page.locator('.playlist-grid .playlist-card')).toHaveCount(57);

  await page.getByRole('button', { name: 'scrobbles' }).click();
  await expect(page.getByRole('button', { name: 'scrobbles' })).toHaveClass(/active/);
  await expect(page.getByText('ranked by playlist scrobbles')).toBeVisible();
});
