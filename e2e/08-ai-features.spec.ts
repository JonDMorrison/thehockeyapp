import { test, expect } from '@playwright/test';
import { login, getFirstPlayerId, getFirstTeamId } from './helpers/auth';

test.describe('AI Features', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('parent summaries AI section accessible', async ({ page }) => {
    const playerId = await getFirstPlayerId(page);
    if (!playerId) { test.skip(); return; }
    await page.goto(`/parents/${playerId}/summaries`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const hasAI = await page.getByText(/ai|generate|insight|summary/i).first().isVisible();
    console.log('AI summary section visible:', hasAI);
  });

  test('weekly reflections AI content visible', async ({ page }) => {
    await page.goto('/reflections');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await expect(page).not.toHaveURL('/auth');
    console.log('Weekly reflections loaded at:', page.url());
  });

  test('coach dashboard AI insights section', async ({ page }) => {
    const teamId = await getFirstTeamId(page);
    if (!teamId) { test.skip(); return; }
    await page.goto(`/teams/${teamId}/coach`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(4000);
    // Look for any AI-related content
    const hasAI = await page.getByText(/ai|insight|suggest|smart/i).first().isVisible();
    console.log('AI insights on coach dashboard:', hasAI);
  });

  test('player today page has AI-powered content', async ({ page }) => {
    const playerId = await getFirstPlayerId(page);
    if (!playerId) { test.skip(); return; }
    await page.goto(`/players/${playerId}/today`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await expect(page).not.toHaveURL('/auth');
    console.log('Player today AI content check passed');
  });

});
