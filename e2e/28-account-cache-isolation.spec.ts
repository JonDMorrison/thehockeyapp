import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 390, height: 844 } });
test('another account cannot see a previous family profile through browser history', async ({ page }) => {
  test.skip(process.env.ACCOUNT_ISOLATION_RELEASE_TEST !== '1', 'Opt in to two independent fictional accounts.');
  test.setTimeout(90000);
  const run = Date.now();
  const actors: Array<{ email: string; password: string; id: string; client: ReturnType<typeof createClient> }> = [];
  for (const role of ['owner','outsider']) {
    const email = `qa-cache-${role}-${run}@example.com`, password = `QA-${randomUUID()}`;
    const client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    const result = await client.auth.signUp({ email, password, options: { data: { display_name: `QA Cache ${role}` } } });
    expect(result.error).toBeNull();
    actors.push({ email, password, id: result.data.user!.id, client });
    fs.appendFileSync('/tmp/hockey-qa-account-fixtures.jsonl', JSON.stringify({ email, userId: result.data.user!.id })+'\n');
  }
  const [owner, outsider] = actors;
  const player = await owner.client.rpc('create_managed_player', { p_first_name: 'CachePrivacyKid', p_birth_year: 2014, p_hockey_love: 'Private cached hockey story', p_photo_sharing_allowed: false, p_ai_personalization_allowed: false });
  expect(player.error).toBeNull(); const playerId = player.data.player_id;
  fs.appendFileSync('/tmp/hockey-qa-account-fixtures.jsonl', JSON.stringify({ userId: owner.id, playerId })+'\n');
  await page.goto(`/auth?mode=signin&redirect=${encodeURIComponent(`/players/${playerId}`)}`);
  await page.getByLabel(/^email/i).fill(owner.email); await page.getByLabel(/^password/i).fill(owner.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/players/${playerId}$`));
  await expect(page.locator('body')).toContainText('CachePrivacyKid');
  await page.getByRole('button', { name: 'Account menu', exact: true }).click();
  await page.getByRole('menuitem', { name: /log out|sign out/i }).click();
  await expect(page).toHaveURL(/\/(?:auth)?$/);
  if (new URL(page.url()).pathname === '/') {
    await page.getByRole('button', { name: /set up your team free/i }).first().click();
    await page.getByRole('button', { name: /already have an account/i }).click();
  }
  await page.getByLabel(/^email/i).fill(outsider.email); await page.getByLabel(/^password/i).fill(outsider.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).not.toHaveURL(/\/auth/);
  const deniedRead = page.waitForResponse(response => {
    if (!response.url().includes('/rest/v1/players?') || !response.url().includes(playerId)) return false;
    try { return JSON.parse(Buffer.from(response.request().headers().authorization.split('.')[1], 'base64url').toString()).sub === outsider.id; } catch { return false; }
  });
  for (let i=0;i<3 && new URL(page.url()).pathname !== `/players/${playerId}`;i++) await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/players/${playerId}$`));
  const denied = await deniedRead;
  expect(JSON.stringify(await denied.json())).not.toContain('CachePrivacyKid');
  await expect(page.locator('body')).not.toContainText('CachePrivacyKid');
  await expect(page.locator('body')).not.toContainText('Private cached hockey story');
  await owner.client.auth.signOut({ scope: 'local' }); await outsider.client.auth.signOut({ scope: 'local' });
});
