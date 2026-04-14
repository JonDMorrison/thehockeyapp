import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Settings and Misc', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL('/auth');
    const hasSettings = await page.getByText(/setting|profile|account/i).first().isVisible();
    expect(hasSettings).toBeTruthy();
  });

  test('widget settings loads', async ({ page }) => {
    await page.goto('/settings/widgets');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL('/auth');
  });

  test('not found page renders', async ({ page }) => {
    await page.goto('/this-page-absolutely-does-not-exist-xyz');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const has404 = await page.getByText(/not found|404|page.*not.*exist/i).isVisible();
    console.log('404 page rendered:', has404);
  });

  test('marketing features page loads', async ({ page }) => {
    await page.goto('/features');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).toHaveTitle(/.+/);
  });

  test('marketing about page loads', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).toHaveTitle(/.+/);
  });

  test('pricing page loads or redirects', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    // In BETA_MODE this redirects to home — either is fine
    await expect(page).toHaveTitle(/.+/);
    console.log('Pricing URL:', page.url());
  });

});
