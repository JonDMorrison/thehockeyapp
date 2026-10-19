import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

test('authenticated phone route inventory has no crashes, failed reads or overflow', async ({ page }) => {
  test.skip(process.env.ROUTE_HEALTH_AUDIT !== '1', 'Opt in to the read-only route inventory.');
  test.setTimeout(240000);
  const client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  expect((await client.auth.signInWithPassword({ email: process.env.TEST_USER_EMAIL!, password: process.env.TEST_USER_PASSWORD! })).error).toBeNull();
  const team = await client.from('team_roles').select('team_id').limit(1).single();
  const player = await client.from('players').select('id,player_guardians!inner(guardian_role)').limit(1).single();
  expect(team.error).toBeNull(); expect(player.error).toBeNull();
  const t = team.data!.team_id, p = player.data!.id;
  const routes = ['/welcome','/players','/players/new','/teams','/teams/new','/onboarding/coach','/associations','/associations/new','/settings','/settings/widgets','/templates','/quick-checkoff','/reflections','/today','/solo/setup',
    ...['','/home','/today','/week','/history','/badges','/goals'].map(s=>`/players/${p}${s}`), `/parents/${p}/summaries`,
    ...['','/roster','/practice','/practice/new','/builder','/builder/new','/progress','/season-report','/settings','/assign','/shooting/new'].map(s=>`/teams/${t}${s}`),
    ...['dashboard','today','badges','planning','workout','week-planner','program','settings'].map(s=>`/solo/${s}/${p}`)];
  const report: unknown[] = [];
  const width = Number(process.env.QA_VIEWPORT_WIDTH || 390);
  await page.setViewportSize({ width, height: Number(process.env.QA_VIEWPORT_HEIGHT || 844) });
  for (const route of routes) {
    const errors: string[] = [], failures: string[] = [];
    const onError = (error: Error) => errors.push(error.message);
    const onResponse = (response: import('@playwright/test').Response) => {
      if (response.status() >= 400 && /\/rest\/v1\/|\/functions\/v1\//.test(response.url())) failures.push(`${response.status()} ${new URL(response.url()).pathname}`);
    };
    page.on('pageerror', onError); page.on('response', onResponse);
    await page.goto(route);
    await expect.soft(page.locator('main'), route).toBeVisible();
    // Allow route data and animations to settle; this audit records readiness, not benchmark timing.
    await page.waitForTimeout(1200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    const heading = await page.locator('h1,h2').allTextContents();
    const unnamedControls: Array<{ role: string; html: string }> = [];
    for (const role of ['button','checkbox','switch','combobox'] as const) {
      for (const control of await page.getByRole(role, { name: '', exact: true }).all()) {
        unnamedControls.push({ role, html: await control.evaluate(element => element.outerHTML.slice(0, 500)) });
      }
    }
    report.push({ route, unnamedControls, finalPath: new URL(page.url()).pathname, heading, errors, failures, overflow });
    expect.soft(errors, route).toEqual([]);
    expect.soft(failures, route).toEqual([]);
    expect.soft(overflow, route).toBe(false);
    expect.soft(unnamedControls, `Accessible control names: ${route}`).toEqual([]);
    page.off('pageerror', onError); page.off('response', onResponse);
  }
  fs.writeFileSync(`/tmp/hockey-route-health-${width}.json`, JSON.stringify(report, null, 2));
  await client.auth.signOut({ scope: 'local' });
});
