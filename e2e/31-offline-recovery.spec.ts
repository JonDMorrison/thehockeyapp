import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

test.use({ viewport: { width: 390, height: 844 }, timezoneId: 'UTC' });
test('offline work remains queued through a server outage and retries exactly once after reload', async ({ page, context }) => {
  test.setTimeout(90000);
  const client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  expect((await client.auth.signInWithPassword({ email: process.env.TEST_USER_EMAIL!, password: process.env.TEST_USER_PASSWORD! })).error).toBeNull();
  const team = await client.rpc('create_team_with_owner', { p_name: `Disposable Offline Recovery ${Date.now()}`, p_age_division: 'U13', p_level: 'rep' }); expect(team.error).toBeNull();
  const teamId = team.data.team_id;
  const player = await client.rpc('create_managed_player', { p_first_name: 'RetryAuditKid', p_birth_year: 2014 }); expect(player.error).toBeNull();
  const playerId = player.data.player_id;
  fs.appendFileSync('/tmp/hockey-qa-offline-fixtures.jsonl', JSON.stringify({ teamId, playerId })+'\n');
  expect((await client.rpc('add_my_player_to_team', { p_team_id: teamId, p_player_id: playerId })).error).toBeNull();
  const card = await client.rpc('replace_team_practice_card', { p_team_id: teamId, p_date: new Date().toISOString().slice(0,10), p_publish: true, p_tier: 'rep', p_title: 'Offline retry workout', p_tasks: [{ label: 'Offline retry warm-up', task_type: 'mobility', target_type: 'none', is_required: true, sort_order: 0 }] }); expect(card.error).toBeNull();
  const cardId = card.data.card_id;
  await page.goto(`/players/${playerId}/today`);
  const task = page.getByRole('checkbox', { name: 'Offline retry warm-up' }); await expect(task).toBeVisible();
  await context.setOffline(true); await task.click(); await expect(task).toBeChecked(); await page.getByRole('button', { name: /complete session/i }).click();
  let failedRequests = 0;
  await page.route('**/rest/v1/rpc/apply_offline_event', route => { failedRequests++; return route.fulfill({ status: 503, json: { message: 'Temporary sync outage' } }); });
  await context.setOffline(false);
  await expect.poll(() => failedRequests, { timeout: 15000 }).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Retry sync', exact: true })).toBeVisible();
  // Reload while the server is still failing: local work must remain discoverable and retryable.
  await page.reload(); await expect(page.getByRole('button', { name: 'Retry sync', exact: true })).toBeVisible();
  await page.unroute('**/rest/v1/rpc/apply_offline_event'); await page.getByRole('button', { name: 'Retry sync', exact: true }).click();
  await expect.poll(async () => (await client.from('session_completions').select('status').eq('player_id', playerId).eq('practice_card_id', cardId)).data, { timeout: 20000 }).toEqual([{ status: 'complete' }]);
  await expect.poll(async () => (await client.from('task_completions').select('completed').eq('player_id', playerId)).data).toEqual([{ completed: true }]);
  await page.reload(); await expect(task).toBeChecked(); await expect(page.getByRole('button', { name: 'Retry sync' })).toHaveCount(0);
  await client.auth.signOut({ scope: 'local' });
});

test('a temporary sync outage also recovers automatically without pressing retry', async ({ page, context }) => {
  test.setTimeout(75000);
  const client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  expect((await client.auth.signInWithPassword({ email: process.env.TEST_USER_EMAIL!, password: process.env.TEST_USER_PASSWORD! })).error).toBeNull();
  const team = await client.rpc('create_team_with_owner', { p_name: `Disposable Offline Automatic ${Date.now()}`, p_age_division: 'U13', p_level: 'rep' }); expect(team.error).toBeNull();
  const player = await client.rpc('create_managed_player', { p_first_name: 'AutoRetryAuditKid', p_birth_year: 2014 }); expect(player.error).toBeNull();
  const teamId=team.data.team_id, playerId=player.data.player_id;
  fs.appendFileSync('/tmp/hockey-qa-offline-fixtures.jsonl', JSON.stringify({ teamId, playerId })+'\n');
  expect((await client.rpc('add_my_player_to_team', { p_team_id: teamId, p_player_id: playerId })).error).toBeNull();
  const card = await client.rpc('replace_team_practice_card', { p_team_id: teamId, p_date: new Date().toISOString().slice(0,10), p_publish: true, p_tier: 'rep', p_title: 'Automatic retry workout', p_tasks: [{ label: 'Automatic retry warm-up', task_type: 'mobility', target_type: 'none', is_required: true, sort_order: 0 }] }); expect(card.error).toBeNull();
  await page.goto(`/players/${playerId}/today`); const task=page.getByRole('checkbox', { name: 'Automatic retry warm-up' }); await expect(task).toBeVisible();
  await context.setOffline(true); await task.click(); await page.getByRole('button', { name: /complete session/i }).click();
  let requests=0;
  await page.route('**/rest/v1/rpc/apply_offline_event', route => ++requests === 1 ? route.fulfill({ status: 503, json: { message: 'One transient failure' } }) : route.continue());
  await context.setOffline(false); await expect(page.getByRole('button', { name: 'Retry sync' })).toBeVisible();
  await expect.poll(async () => (await client.from('session_completions').select('status').eq('player_id', playerId).eq('practice_card_id', card.data.card_id)).data, { timeout: 45000, intervals: [1000,2000] }).toEqual([{ status: 'complete' }]);
  await expect(page.getByRole('button', { name: 'Retry sync' })).toHaveCount(0);
  await client.auth.signOut({ scope: 'local' });
});
