import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Solo Training Flow', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('solo setup page loads', async ({ page }) => {
    await page.goto('/solo/setup');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL('/auth');
    console.log('Solo setup loaded');
  });

  test('solo player flows accessible', async ({ page }) => {
    // Navigate to players to find any solo player
    await page.goto('/players');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Try to find a solo player link
    const soloLink = page.locator('a[href*="/solo/"]').first();
    if (await soloLink.isVisible()) {
      const href = await soloLink.getAttribute('href');
      console.log('Found solo link:', href);
      await soloLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await expect(page).not.toHaveURL('/auth');
    } else {
      console.log('No solo player found — checking /solo/setup');
      await page.goto('/solo/setup');
      await expect(page).not.toHaveURL('/auth');
    }
  });

});
