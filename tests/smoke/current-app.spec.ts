import { expect, test } from '@playwright/test';

test('current app opens home and Past Tense', async ({ page }) => {
  await page.goto('/melophile_metrics_v2.html');

  await expect(page.locator('#screenSelect.screen.active')).toBeVisible();
  await expect(page.getByRole('button', { name: /fresh/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /past tense/i })).toBeVisible();

  await page.getByRole('button', { name: /past tense/i }).click();
  await expect(page.locator('#screenYearsReview.screen.active')).toBeVisible();
  await expect(page.locator('.past-tense-stats-band')).toBeVisible();
  await expect(page.locator('#pastTensePlaylistGrid .past-tense-card').first()).toBeVisible();
});

test('current app opens settings sections', async ({ page }) => {
  await page.goto('/melophile_metrics_v2.html');

  await page.getByRole('button', { name: /settings/i }).click();
  await expect(page.locator('#screenSettings.screen.active')).toBeVisible();
  await expect(page.getByRole('button', { name: 'connected accounts' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'data' })).toBeVisible();
  await expect(page.getByText('spotify access')).toBeVisible();

  await page.getByRole('button', { name: 'data' }).click();
  await expect(page.getByText('local listening data')).toBeVisible();
});
