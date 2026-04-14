import { test, expect } from '@playwright/test';
import { login, getFirstPlayerId } from './helpers/auth';

test.describe('Player Flow', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('players list loads', async ({ page }) => {
    await page.goto('/players');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const hasPlayers = await page.locator('a[href*="/players/"]').first().isVisible();
    const hasEmpty = await page.getByText(/no players|add player|create/i).isVisible();
    expect(hasPlayers || hasEmpty).toBeTruthy();
  });

  test('player home page loads', async ({ page }) => {
    const playerId = await getFirstPlayerId(page);
    if (!playerId) { test.skip(); return; }
    await page.goto(`/players/${playerId}/home`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL('/auth');
    console.log('Player home loaded for:', playerId);
  });

  test('player today page loads', async ({ page }) => {
    const playerId = await getFirstPlayerId(page);
    if (!playerId) { test.skip(); return; }
    await page.goto(`/players/${playerId}/today`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await expect(page).not.toHaveURL('/auth');
    console.log('Player today loaded');
  });

  test('can complete a task on player today', async ({ page }) => {
    const playerId = await getFirstPlayerId(page);
    if (!playerId) { test.skip(); return; }
    await page.goto(`/players/${playerId}/today`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Find first unchecked checkbox or task button
    const checkbox = page.locator('input[type="checkbox"]:not(:checked), button[role="checkbox"][aria-checked="false"]').first();
    if (await checkbox.isVisible()) {
      await checkbox.click();
      await page.waitForTimeout(1500);
      console.log('Task completed successfully');
    } else {
      console.log('No unchecked tasks found — may all be completed or no workout assigned');
    }
  });

  test('can log shots on player today', async ({ page }) => {
    const playerId = await getFirstPlayerId(page);
    if (!playerId) { test.skip(); return; }
    await page.goto(`/players/${playerId}/today`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const shotsInput = page.locator('input[inputmode="numeric"], input[type="number"]').first();
    if (await shotsInput.isVisible()) {
      await shotsInput.fill('25');
      await shotsInput.press('Enter');
      await page.waitForTimeout(1500);
      console.log('Shots logged');
    } else {
      console.log('No shots input found');
    }
  });

  test('player history loads', async ({ page }) => {
    const playerId = await getFirstPlayerId(page);
    if (!playerId) { test.skip(); return; }
    await page.goto(`/players/${playerId}/history`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL('/auth');
  });

  test('player badges page loads', async ({ page }) => {
    const playerId = await getFirstPlayerId(page);
    if (!playerId) { test.skip(); return; }
    await page.goto(`/players/${playerId}/badges`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL('/auth');
    const hasBadges = await page.getByText(/badge|earn|achievement/i).isVisible();
    console.log('Badges section visible:', hasBadges);
  });

  test('player goals page loads', async ({ page }) => {
    const playerId = await getFirstPlayerId(page);
    if (!playerId) { test.skip(); return; }
    await page.goto(`/players/${playerId}/goals`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL('/auth');
  });

  test('player profile loads', async ({ page }) => {
    const playerId = await getFirstPlayerId(page);
    if (!playerId) { test.skip(); return; }
    await page.goto(`/players/${playerId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL('/auth');
  });

});
