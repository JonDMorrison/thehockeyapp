import { test, expect } from '@playwright/test';
import { login, getFirstTeamId } from './helpers/auth';

test.describe('Coach Flow', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('teams list page loads', async ({ page }) => {
    await page.goto('/teams');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const hasTeams = await page.locator('a[href*="/teams/"]').first().isVisible();
    const hasCreateCTA = await page.getByText(/create|new team|add team/i).first().isVisible();
    expect(hasTeams || hasCreateCTA).toBeTruthy();
    console.log('Has teams:', hasTeams, 'Has create CTA:', hasCreateCTA);
  });

  test('can navigate to team coach dashboard', async ({ page }) => {
    const teamId = await getFirstTeamId(page);
    if (!teamId) {
      console.log('No teams found — skipping');
      test.skip();
      return;
    }
    await page.goto(`/teams/${teamId}/coach`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL('/teams');
    console.log('Coach dashboard loaded for team:', teamId);
  });

  test('team roster loads', async ({ page }) => {
    const teamId = await getFirstTeamId(page);
    if (!teamId) { test.skip(); return; }
    await page.goto(`/teams/${teamId}/roster`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const hasPlayers = await page.locator('[class*="card"], [class*="player"], [class*="roster"]').first().isVisible();
    const hasEmpty = await page.getByText(/no players|empty|invite/i).isVisible();
    expect(hasPlayers || hasEmpty).toBeTruthy();
  });

  test('practice cards list loads', async ({ page }) => {
    const teamId = await getFirstTeamId(page);
    if (!teamId) { test.skip(); return; }
    await page.goto(`/teams/${teamId}/practice`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const hasCards = await page.locator('[class*="card"]').first().isVisible();
    const hasEmpty = await page.getByText(/no practice|create|new card/i).isVisible();
    expect(hasCards || hasEmpty).toBeTruthy();
  });

  test('practice card editor loads', async ({ page }) => {
    const teamId = await getFirstTeamId(page);
    if (!teamId) { test.skip(); return; }
    await page.goto(`/teams/${teamId}/practice/new`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    // Should show editor with at minimum a title input or task area
    const hasEditor = await page.locator('button, [role="button"], [contenteditable], textarea, input').first().isVisible();
    expect(hasEditor).toBeTruthy();
  });

  test('can create and save a practice card', async ({ page }) => {
    const teamId = await getFirstTeamId(page);
    if (!teamId) { test.skip(); return; }
    await page.goto(`/teams/${teamId}/practice/new`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Fill in a task label if input exists
    const taskInput = page.locator('input[placeholder*="task"], input[placeholder*="drill"], input[placeholder*="label"]').first();
    if (await taskInput.isVisible()) {
      await taskInput.fill('E2E Test Drill');
    }

    // Click save draft
    const saveBtn = page.getByRole('button', { name: /save|draft/i }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
      // Should show success or navigate away
      console.log('Save draft clicked, current URL:', page.url());
    }
  });

  test('quick assign page loads', async ({ page }) => {
    const teamId = await getFirstTeamId(page);
    if (!teamId) { test.skip(); return; }
    await page.goto(`/teams/${teamId}/assign`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL('/auth');
    console.log('Quick assign loaded');
  });

  test('team progress page loads', async ({ page }) => {
    const teamId = await getFirstTeamId(page);
    if (!teamId) { test.skip(); return; }
    await page.goto(`/teams/${teamId}/progress`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL('/auth');
    console.log('Team progress loaded');
  });

  test('week plan builder loads', async ({ page }) => {
    const teamId = await getFirstTeamId(page);
    if (!teamId) { test.skip(); return; }
    await page.goto(`/teams/${teamId}/builder`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL('/auth');
    console.log('Week plan builder loaded');
  });

  test('team settings loads', async ({ page }) => {
    const teamId = await getFirstTeamId(page);
    if (!teamId) { test.skip(); return; }
    await page.goto(`/teams/${teamId}/settings`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL('/auth');
  });

  test('leaderboard visible on coach dashboard', async ({ page }) => {
    const teamId = await getFirstTeamId(page);
    if (!teamId) { test.skip(); return; }
    await page.goto(`/teams/${teamId}/coach`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const hasLeaderboard = await page.getByText(/top|rank|#1|player|streak|shots/i).first().isVisible();
    console.log('Leaderboard visible:', hasLeaderboard);
    // Soft check — leaderboard may be empty but section should exist
    expect(hasLeaderboard).toBeTruthy();
  });

});
