import { test, expect } from '@playwright/test';
import { login, logout } from './helpers/auth';

test.describe('Authentication', () => {

  test('marketing home page loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/.+/);
    console.log('Home page title:', await page.title());
  });

  test('auth page loads', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('forgot password link is visible', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    const forgotLink = page.getByText(/forgot/i);
    await expect(forgotLink).toBeVisible();
  });

  test('sign in with valid credentials', async ({ page }) => {
    await login(page);
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/auth');
    console.log('Redirected to:', currentUrl);
  });

  test('sign out works', async ({ page }) => {
    await login(page);
    await logout(page);
    // App redirects to / or /auth after sign out
    const url = page.url();
    const loggedOut = url.endsWith('/') || url.includes('/auth');
    expect(loggedOut).toBeTruthy();
  });

  // Run invalid credentials LAST to avoid burning Supabase rate limit attempts
  // before the valid login tests above
  test('sign in with invalid credentials shows error', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/email/i).fill('wrong@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(3000);
    // Should still be on auth page or show error
    const currentUrl = page.url();
    const hasError = currentUrl.includes('/auth') || await page.getByText(/invalid|error|incorrect/i).isVisible();
    expect(hasError).toBeTruthy();
  });

});
