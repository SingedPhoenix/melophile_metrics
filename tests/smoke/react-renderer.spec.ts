import { expect, test } from '@playwright/test';

test('react renderer scaffold builds and loads', async ({ page }) => {
  await page.goto('/dist/renderer/index.html');

  await expect(page.getByText('melophile metrics')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'the new architecture starts here' })).toBeVisible();
  await expect(page.getByText('react migration shell')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'past tense' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'settings' })).toBeVisible();
});
