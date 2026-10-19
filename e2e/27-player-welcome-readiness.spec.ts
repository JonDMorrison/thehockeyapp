import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

test.use({ viewport: { width: 320, height: 568 } });
test('welcome waits for preferences and workout data, traps focus and closes with Escape', async ({ page }) => {
  test.skip(process.env.WELCOME_RELEASE_TEST !== '1', 'Opt in to a fictional first-run player.');
  const client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  expect((await client.auth.signInWithPassword({ email: process.env.TEST_USER_EMAIL!, password: process.env.TEST_USER_PASSWORD! })).error).toBeNull();
  const team = await client.rpc('create_team_with_owner', { p_name: `Disposable Welcome QA ${Date.now()}` });
  expect(team.error).toBeNull(); const teamId = team.data.team_id;
  fs.appendFileSync('/tmp/hockey-qa-calendar-fixtures.jsonl', JSON.stringify({ teamId })+'\n');
  const player = await client.rpc('create_managed_player', { p_first_name: 'WelcomeKid', p_birth_year: 2014 });
  expect(player.error).toBeNull(); const playerId = player.data.player_id;
  fs.appendFileSync('/tmp/hockey-qa-calendar-fixtures.jsonl', JSON.stringify({ teamId, playerId })+'\n');
  expect((await client.rpc('add_my_player_to_team', { p_team_id: teamId, p_player_id: playerId })).error).toBeNull();
  let releasePreferences!: () => void, releaseSnapshot!: () => void;
  const preferencesGate = new Promise<void>(resolve => { releasePreferences = resolve; });
  const snapshotGate = new Promise<void>(resolve => { releaseSnapshot = resolve; });
  let preferencesPending = false, snapshotPending = false;
  await page.route('**/rest/v1/player_team_preferences?*', async route => {
    if (route.request().url().includes(playerId)) { preferencesPending = true; await preferencesGate; }
    await route.continue();
  });
  await page.route('**/rest/v1/rpc/get_today_snapshot', async route => { snapshotPending = true; await snapshotGate; await route.continue(); });
  await page.goto(`/players/${playerId}/home`);
  await expect.poll(() => preferencesPending).toBe(true);
  await page.waitForTimeout(500); // Keep the independent preference request delayed after the player read resolves.
  await expect(page.getByRole('dialog')).toHaveCount(0);
  releasePreferences(); await expect.poll(() => snapshotPending).toBe(true);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  releaseSnapshot();
  const welcome = page.getByRole('dialog'); await expect(welcome).toBeVisible();
  const bounds = await welcome.boundingBox(); expect(bounds!.y).toBeGreaterThanOrEqual(0); expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(568);
  for (let i=0;i<5;i++) {
    await page.keyboard.press('Tab');
    expect(await welcome.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape'); await expect(welcome).toBeHidden();
  expect(await page.evaluate(id => localStorage.getItem(`first_run_dismissed_${id}`), playerId)).toBe('true');
  await page.reload(); await expect(page.getByRole('dialog')).toHaveCount(0);
  await client.auth.signOut({ scope: 'local' });
});
