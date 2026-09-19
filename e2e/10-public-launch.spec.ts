import { expect, test } from '@playwright/test';

test.describe('Public launch experience', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('association offer is prominent and contactable', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /off-ice training delivers on-ice results/i })).toBeVisible();
    await expect(page.getByText(/give every coach a simple weekly plan/i)).toBeVisible();
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

  test('contact form explains errors and focuses the first required field', async ({ page }) => {
    await page.goto('/contact');

    await expect(page.locator('label .sr-only')).toHaveCount(3);
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.locator('#contact-name')).toBeFocused();
    await expect(page.getByText('Enter your name')).toBeVisible();
    await expect(page.getByText('Enter your email address')).toBeVisible();
    await expect(page.getByText('Tell us how we can help')).toBeVisible();
  });

  test('skill-video experience appears on Home and How It Works', async ({ page }) => {
    for (const route of ['/', '/demo']) {
      await page.goto(route);

      await expect(page.getByRole('heading', { name: /see it\. try it\. check it off/i })).toBeVisible();
      await expect(page.getByText('Inside the drill')).toBeVisible();
      await expect(page.getByText('Today\'s workout')).toBeVisible();

      const poster = page.getByAltText(/hockey canada quick release lesson shown inside/i);
      await expect(poster).toBeVisible();
      await expect(poster).toHaveAttribute('src', 'https://i.ytimg.com/vi/iHHmFJ17m58/maxresdefault.jpg');

      const preview = page.getByTestId('marketing-video-preview-play');
      await expect(preview).toBeVisible();
      await expect(preview).not.toHaveAttribute('role', 'button');
      await expect(preview.locator('xpath=ancestor::a')).toHaveCount(0);
    }
  });
});
