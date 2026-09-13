import { expect, test } from '@playwright/test';

test.describe('Public launch experience', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('association offer is prominent and contactable', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /turn the days between practices/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Association' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: /see which teams need support/i })).toBeVisible();

    await page.getByRole('link', { name: /plan an association rollout/i }).click();
    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.getByRole('heading', { name: /talk to a real person/i })).toBeVisible();
  });

  test('private team join does not expose a directory', async ({ page }) => {
    await page.goto('/join');

    await expect(page.getByRole('heading', { name: 'Join a Team' })).toBeVisible();
    await expect(page.getByText(/team names and rosters are not publicly searchable/i)).toBeVisible();
    await expect(page.getByPlaceholder(/paste invite code or link/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /join with code/i })).toBeDisabled();
  });

  test('account creation requires terms acknowledgement', async ({ page }) => {
    await page.goto('/auth?mode=signup');

    await expect(page.getByLabel(/your name/i)).toBeVisible();
    await expect(page.getByLabel(/i agree to the terms/i)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
  });

  test('legal pages are reachable', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: /privacy/i }).first()).toBeVisible();

    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: /terms/i }).first()).toBeVisible();
  });
});
