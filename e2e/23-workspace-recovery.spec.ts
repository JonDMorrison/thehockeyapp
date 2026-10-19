import { expect, test } from '@playwright/test';

// Read-only failure injection against the dedicated authenticated QA fixture.
for (const scenario of [
  { route: '/teams', table: 'team_roles', title: 'Couldn’t load your teams' },
  { route: '/players', table: 'players', title: 'Couldn’t load your players' },
  { route: '/associations', table: 'association_roles', title: 'Couldn’t load your associations' },
]) {
  test(`${scenario.route} distinguishes an outage from an empty workspace and recovers`, async ({ page }) => {
    test.skip(!process.env.TEST_USER_EMAIL, 'Requires the dedicated test account.');
    await page.setViewportSize({ width: 390, height: 844 });
    let outage = true;
    await page.route(`**/rest/v1/${scenario.table}?*`, async route => {
      if (outage) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Simulated QA read outage' }) });
      else await route.continue();
    });
    await page.goto(scenario.route);
    const alert = page.getByRole('alert').filter({ hasText: scenario.title });
    await expect(alert).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/no teams yet|no players yet|create your association workspace/i)).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    outage = false;
    await alert.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(alert).toBeHidden();
    await expect(page.locator('main')).toBeVisible();
    await expect(page).not.toHaveURL(/\/auth/);
  });
}

for (const scenario of [
  { suffix: 'practice', table: 'practice_cards', title: 'Couldn’t load your practices' },
  { suffix: 'builder', table: 'team_week_plans', title: 'Couldn’t load your programs' },
]) {
  test(`${scenario.suffix} does not offer a replacement plan during a read outage`, async ({ page }) => {
    test.skip(!process.env.TEST_USER_EMAIL, 'Requires the dedicated test account.');
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    expect((await client.auth.signInWithPassword({ email: process.env.TEST_USER_EMAIL!, password: process.env.TEST_USER_PASSWORD! })).error).toBeNull();
    const team = await client.from('team_roles').select('team_id').limit(1).single();
    expect(team.error).toBeNull();
    let outage = true;
    await page.route(`**/rest/v1/${scenario.table}?*`, async route => {
      if (outage) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Simulated QA read outage' }) });
      else await route.continue();
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/teams/${team.data!.team_id}/${scenario.suffix}`);
    const alert = page.getByRole('alert').filter({ hasText: scenario.title });
    await expect(alert).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: /^new|create.*practice|create.*plan/i })).toHaveCount(0);
    outage = false;
    await alert.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(alert).toBeHidden();
    await expect(page.locator('main')).toBeVisible();
    await client.auth.signOut({ scope: 'local' });
  });
}

test('quick mode without a player provides a way forward', async ({ page }) => {
  test.skip(!process.env.TEST_USER_EMAIL, 'Requires the dedicated test account.');
  await page.goto('/quick-checkoff');
  await expect(page.getByRole('heading', { name: 'Choose a player', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Choose player', exact: true }).click();
  await expect(page).toHaveURL(/\/players(?:\/|$)/);
});
