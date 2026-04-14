import { test, expect } from '@playwright/test';
import { login, getFirstPlayerId } from './helpers/auth';

test.describe('Parent Flow', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('parent summaries page loads', async ({ page }) => {
    const playerId = await getFirstPlayerId(page);
    if (!playerId) { test.skip(); return; }
    await page.goto(`/parents/${playerId}/summaries`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await expect(page).not.toHaveURL('/auth');
    const hasContent = await page.locator('[class*="card"], [class*="summary"]').first().isVisible();
    const hasEmpty = await page.getByText(/no summary|no data|not yet/i).isVisible();
    console.log('Parent summaries - has content:', hasContent, 'has empty:', hasEmpty);
  });

  test('weekly reflections page loads', async ({ page }) => {
    await page.goto('/reflections');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL('/auth');
    console.log('Weekly reflections loaded');
  });

  test('guardian join page renders', async ({ page }) => {
    await page.goto('/guardian/join/test-token-123');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    // Page should render even with invalid token
    await expect(page).not.toHaveURL('/auth');
  });

});
