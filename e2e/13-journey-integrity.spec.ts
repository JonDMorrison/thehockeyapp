import { expect, test } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { format } from 'date-fns';

dotenv.config({ path: '.env.local', quiet: true });
let client: SupabaseClient;
let teamId: string;
let playerId: string;
let cardId: string;
const today = format(new Date(), 'yyyy-MM-dd');

test.describe('persisted parent and coach journey', () => {
  test.beforeAll(async () => {
    test.skip(!process.env.TEST_USER_EMAIL || !process.env.VITE_SUPABASE_URL, 'Requires a dedicated test account and local API configuration.');
    client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    const login = await client.auth.signInWithPassword({ email: process.env.TEST_USER_EMAIL!, password: process.env.TEST_USER_PASSWORD! });
    expect(login.error).toBeNull();
    const team = await client.rpc('create_team_with_owner', { p_name: `Disposable Journey ${Date.now()}`, p_age_division: 'U13', p_level: 'rep' });
    expect(team.error).toBeNull();
    teamId = team.data.team_id;
    const player = await client.rpc('create_managed_player', { p_first_name: 'JourneyPlayer', p_birth_year: 2014, p_photo_sharing_allowed: false, p_ai_personalization_allowed: false });
    expect(player.error).toBeNull();
    playerId = player.data.player_id;
    const membership = await client.rpc('add_my_player_to_team', { p_team_id: teamId, p_player_id: playerId });
    expect(membership.error).toBeNull();
    const card = await client.rpc('replace_team_practice_card', {
      p_team_id: teamId, p_date: today, p_publish: true, p_tier: 'rep', p_title: 'Audit daily win',
      p_tasks: [{ label: 'Audit gentle warm-up', task_type: 'mobility', target_type: 'none', is_required: true, sort_order: 0 }],
    });
    expect(card.error).toBeNull();
    cardId = card.data.card_id;
  });

  test('a real session requires work, persists completion, and updates coach reporting', async ({ page }) => {
    await page.goto(`/players/${playerId}/today`);
    const finish = page.getByRole('button', { name: /complete session/i });
    await expect(finish).toBeDisabled();
    const task = page.getByRole('checkbox', { name: /audit gentle warm-up/i });
    await expect(task).toBeVisible();
    await task.press('Space');
    await expect(task).toBeChecked();
    await expect(finish).toBeEnabled();
    await finish.click();
    await expect.poll(async () => {
      const result = await client.from('session_completions').select('status').eq('player_id', playerId).eq('practice_card_id', cardId).maybeSingle();
      expect(result.error).toBeNull();
      return result.data?.status;
    }).toBe('complete');
    await page.reload();
    await expect(page.getByRole('checkbox', { name: /audit gentle warm-up/i })).toBeChecked();
    const dashboard = await client.rpc('get_team_dashboard_snapshot', { p_team_id: teamId });
    expect(dashboard.error).toBeNull();
    expect(dashboard.data.pulse.players_count).toBe(1);
    expect(dashboard.data.pulse.active_today_count).toBe(1);
    expect(dashboard.data.pulse.sessions_complete_today).toBe(1);
    expect(dashboard.data.today.practice_card.card_id).toBe(cardId);
    await page.goto(`/teams/${teamId}`);
    await expect(page.getByText(/couldn.t load|something went wrong/i)).toHaveCount(0);
    await expect(page.getByText('Audit daily win').first()).toBeVisible();
  });

  test('anonymous visitors cannot read the fixture player, roster, or workout', async () => {
    const anonymous = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    for (const [table, id] of [['players', playerId], ['teams', teamId], ['practice_cards', cardId]]) {
      const result = await anonymous.from(table).select('id').eq('id', id);
      expect(result.data ?? [], table).toEqual([]);
    }
    const dashboard = await anonymous.rpc('get_team_dashboard_snapshot', { p_team_id: teamId });
    expect(dashboard.error || dashboard.data?.success === false).toBeTruthy();
  });

  test('welcome recovers clearly from a workspace lookup failure', async ({ page }) => {
    await page.route('**/rest/v1/team_roles*', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Simulated temporary outage' }) }));
    await page.goto('/welcome');
    await expect(page.getByRole('heading', { name: 'We couldn’t load your workspace' })).toBeVisible({ timeout: 20000 });
    await page.unroute('**/rest/v1/team_roles*');
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(page).toHaveURL(/\/(teams|players|associations)\//, { timeout: 20000 });
  });

  test('the solo planner uses the existing database date column', async ({ page }) => {
    const failures: string[] = [];
    page.on('response', response => {
      if (response.url().includes('personal_practice_cards') && response.status() >= 400) failures.push(response.url());
    });
    await page.goto(`/solo/planning/${playerId}`);
    // Check the actual route is resolved; a 404 must not count as a passing planner test.
    await expect(page.getByText(/page not found/i)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Plan Training', exact: true })).toBeVisible();
    expect(failures).toEqual([]);
  });
  test('offline work syncs exactly once after the connection returns', async ({ page, context }) => {
    const player = await client.rpc('create_managed_player', { p_first_name: 'OfflineAudit', p_birth_year: 2014 });
    expect(player.error).toBeNull();
    const offlinePlayerId = player.data.player_id;
    expect((await client.rpc('add_my_player_to_team', { p_team_id: teamId, p_player_id: offlinePlayerId })).error).toBeNull();
    await page.goto(`/players/${offlinePlayerId}/today`);
    const task = page.getByRole('checkbox', { name: /audit gentle warm-up/i });
    await expect(task).toBeVisible();
    await context.setOffline(true);
    try {
      await expect(page.getByText('Offline', { exact: true }).first()).toBeVisible();
      await task.click();
      await expect(task).toBeChecked();
      await expect(page.getByRole('button', { name: /complete session/i })).toBeEnabled();
      await page.getByRole('button', { name: /complete session/i }).click();
    } finally {
      await context.setOffline(false);
    }
    await expect.poll(async () => {
      const result = await client.from('session_completions').select('id, status').eq('player_id', offlinePlayerId).eq('practice_card_id', cardId);
      expect(result.error).toBeNull();
      return result.data;
    }, { timeout: 20000 }).toEqual([expect.objectContaining({ status: 'complete' })]);
    await page.reload();
    await expect(page.getByRole('checkbox', { name: /audit gentle warm-up/i })).toBeChecked();
  });

  test('failed template tasks never produce a successful import message', async ({ page }) => {
    let incompleteDraftRemoved = false;
    await page.route('**/rest/v1/program_templates*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 'audit-template', title: 'Audit import failure', description: '', age_divisions: [], levels: [], weeks: 1, tasks: [{ day: 1, label: 'Audit drill', task_type: 'mobility', target_type: 'none', target_value: null, shot_type: 'none', shots_expected: null }] }]) }));
    await page.route('**/rest/v1/practice_cards*', route => {
      if (route.request().method() === 'POST') return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: '00000000-0000-4000-8000-000000000001' }) });
      if (route.request().method() === 'DELETE') { incompleteDraftRemoved = true; return route.fulfill({ status: 204 }); }
      return route.continue();
    });
    await page.route('**/rest/v1/practice_tasks*', route => route.request().method() === 'POST' ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Simulated failed task insert' }) }) : route.continue());
    await page.goto('/onboarding/coach');
    await page.getByLabel(/team name/i).fill('Disposable Template Failure Audit');
    await page.getByRole('button', { name: 'Create team & continue' }).click();
    await page.getByRole('button', { name: 'Start a program', exact: true }).click();
    await page.getByRole('button', { name: 'Browse more templates', exact: true }).click();
    await page.getByRole('button', { name: 'Use this template', exact: true }).click();
    await expect(page.getByText("Couldn't add the template. Please try again.", { exact: true })).toBeVisible();
    expect(incompleteDraftRemoved).toBe(true);
    await expect(page.getByText(/added 1 day to your team as drafts/i)).toHaveCount(0);
  });

});
