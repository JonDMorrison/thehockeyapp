import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

for (const timezoneId of ['America/Vancouver', 'Asia/Tokyo', 'UTC']) {
  test.describe(`local calendar in ${timezoneId}`, () => {
    test.use({ timezoneId, viewport: { width: 390, height: 844 } });
    test('Today snapshot uses the same date as the screen and preserves query preferences', async ({ page }) => {
      test.skip(!process.env.TEST_USER_EMAIL, 'Requires the dedicated QA account.');
      const client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
      expect((await client.auth.signInWithPassword({ email: process.env.TEST_USER_EMAIL!, password: process.env.TEST_USER_PASSWORD! })).error).toBeNull();
      const player = await client.from('players').select('id,player_guardians!inner(guardian_role)').limit(1).single();
      expect(player.error).toBeNull();
      const snapshotResponse = page.waitForResponse(response => response.url().includes('/rpc/get_today_snapshot'));
      await page.goto(`/players/${player.data!.id}/home`);
      const response = await snapshotResponse;
      expect(response.ok(), `${response.status()}: ${await response.text()}`).toBeTruthy();
      expect(response.request().headers()['prefer']).toContain(`timezone=${timezoneId}`);
      const snapshot = await response.json();
      const localDate = await page.evaluate(() => {
        const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      });
      expect(snapshot.date).toBe(localDate);
      expect(snapshot.success).toBe(true);
      const team = await client.from('team_roles').select('team_id').limit(1).single();
      expect(team.error).toBeNull();
      const countResponse = page.waitForResponse(r => r.url().includes('/rest/v1/practice_cards?') && (r.request().headers()['prefer'] || '').includes('count=exact'));
      await page.goto(`/teams/${team.data!.team_id}/practice`);
      const counted = await countResponse;
      expect(counted.ok(), `${counted.status()}: ${await counted.text()}`).toBeTruthy();
      expect(counted.request().headers()['prefer']).toContain('count=exact');
      expect(counted.request().headers()['prefer']).toContain(`timezone=${timezoneId}`);
      await client.auth.signOut({ scope: 'local' });
    });
  });
}
