import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

for (const timezoneId of ['America/Vancouver', 'Asia/Tokyo']) {
  test.describe(`workout calendar in ${timezoneId}`, () => {
    test.use({ timezoneId, viewport: { width: 390, height: 844 } });
    test('today assignment, player completion and coach totals share one local day', async ({ page }) => {
      test.skip(process.env.LOCAL_WORKOUT_RELEASE_TEST !== '1', 'Opt in to creating fictional calendar fixtures.');
      const client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!, {
        auth: { persistSession: false }, global: { headers: { Prefer: `timezone=${timezoneId}` } },
      });
      expect((await client.auth.signInWithPassword({ email: process.env.TEST_USER_EMAIL!, password: process.env.TEST_USER_PASSWORD! })).error).toBeNull();
      const date = new Intl.DateTimeFormat('en-CA', { timeZone: timezoneId, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const teamName = `Disposable Calendar QA ${Date.now()} ${timezoneId}`;
      const team = await client.rpc('create_team_with_owner', { p_name: teamName });
      expect(team.error).toBeNull(); const teamId = team.data.team_id;
      fs.appendFileSync('/tmp/hockey-qa-calendar-fixtures.jsonl', JSON.stringify({ teamId })+'\n');
      const player = await client.rpc('create_managed_player', { p_first_name: 'CalendarKid', p_birth_year: 2014, p_photo_sharing_allowed: false, p_ai_personalization_allowed: false });
      expect(player.error).toBeNull(); const playerId = player.data.player_id;
      fs.appendFileSync('/tmp/hockey-qa-calendar-fixtures.jsonl', JSON.stringify({ teamId, playerId })+'\n');
      expect((await client.rpc('add_my_player_to_team', { p_team_id: teamId, p_player_id: playerId })).error).toBeNull();
      const card = await client.rpc('replace_team_practice_card', { p_team_id: teamId, p_date: date, p_publish: true, p_tier: 'rep', p_title: 'Calendar warm-up',
        p_tasks: [{ label: 'Calendar gentle warm-up', task_type: 'mobility', target_type: 'none', is_required: true, sort_order: 0 }],
      });
      expect(card.error).toBeNull();
      const snapshotResponse = page.waitForResponse(response => response.url().includes('/rpc/get_today_snapshot'));
      await page.goto(`/players/${playerId}/home`);
      const snapshot = await (await snapshotResponse).json();
      expect(snapshot.date).toBe(date); expect(snapshot.has_card).toBe(true);
      await page.goto(`/players/${playerId}/today`);
      const finish = page.getByRole('button', { name: /complete session/i });
      await expect(finish).toBeDisabled();
      const task = page.getByRole('checkbox', { name: /calendar gentle warm-up/i });
      await task.press('Space'); await expect(task).toBeChecked();
      await expect(finish).toBeEnabled(); await finish.click();
      await expect.poll(async () => {
        const completion = await client.from('session_completions').select('status').eq('player_id', playerId).eq('practice_card_id', card.data.card_id).maybeSingle();
        expect(completion.error).toBeNull(); return completion.data?.status;
      }).toBe('complete');
      await page.reload(); await expect(task).toBeChecked();
      const totals = await client.rpc('get_team_dashboard_snapshot', { p_team_id: teamId });
      expect(totals.error).toBeNull(); expect(totals.data.today.date).toBe(date);
      expect(totals.data.today.practice_card.card_id).toBe(card.data.card_id);
      expect(totals.data.pulse.sessions_complete_today).toBe(1);
      await page.goto(`/teams/${teamId}`);
      await expect(page.getByRole('heading', { name: teamName, exact: true })).toBeVisible();
      await expect(page.getByText('Calendar warm-up', { exact: true }).first()).toBeVisible();
      await client.auth.signOut({ scope: 'local' });
    });
  });
}
