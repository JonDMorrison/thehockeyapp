import { expect, test } from '@playwright/test';
import path from 'node:path';

test.use({ storageState: { cookies: [], origins: [] } });

for (const width of [390, 1280]) {
  test.describe(`first visit at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 } });

    test('a parent can start from the parent card', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1, name: 'Better hockey. Starts at home.' })).toBeVisible();
      if (process.env.AUDIT_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.AUDIT_SCREENSHOT_DIR, `home-hero-${width}.png`) });
      await page.getByRole('button', { name: 'Start for my child', exact: true }).click();
      await expect(page).toHaveURL(/auth\?mode=signup/);
      await expect(page.getByRole('heading', { name: 'Create your family account' })).toBeVisible();
    });

    test('a family with an invite can find the code entry', async ({ page }) => {
      await page.goto('/');
      if (width < 768) await page.getByRole('button', { name: 'Open navigation' }).click();
      await page.getByRole('navigation').getByRole('link', { name: 'Join a team', exact: true }).click();
      await expect(page.getByLabel('Team invite code or link')).toBeVisible();
      await expect(page.getByRole('button', { name: /join with code/i })).toBeDisabled();
    });

    test('the sample is usable without creating an account', async ({ page }) => {
      const writes: string[] = [];
      page.on('request', request => {
        if (request.method() === 'POST' && request.url().includes('.supabase.co')) writes.push(request.url());
      });
      await page.goto('/');
      await page.getByRole('link', { name: 'Try the demo', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Your first small win starts here.' })).toBeVisible();
      const finish = page.getByRole('button', { name: 'Finish sample session' });
      await expect(finish).toBeDisabled();
      for (const name of ['Quick hands warm-up', 'Wrist shots', 'Cool down']) {
        await page.getByRole('button', { name: new RegExp(name) }).click();
      }
      await expect(page.getByRole('progressbar', { name: 'Sample workout progress' })).toHaveAttribute('aria-valuenow', '100');
      await expect(finish).toBeEnabled();
      await finish.click();
      await expect(page.getByRole('heading', { name: 'Small session. Big high-five!' })).toBeVisible();
      await expect(page.getByRole('button', { name: /wrist shots/i })).toBeDisabled();
      if (process.env.AUDIT_SCREENSHOT_DIR) await page.locator('#sample-workout').screenshot({ path: path.join(process.env.AUDIT_SCREENSHOT_DIR, `sample-finished-${width}.png`) });
      expect(writes).toEqual([]);
    });

    test('unchecking an exercise makes the sample incomplete again', async ({ page }) => {
      await page.goto('/demo');
      const drill = page.getByRole('button', { name: /wrist shots/i });
      await drill.click();
      await expect(drill).toHaveAttribute('aria-pressed', 'true');
      await drill.click();
      await expect(drill).toHaveAttribute('aria-pressed', 'false');
      await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
      await expect(page.getByRole('button', { name: 'Finish sample session' })).toBeDisabled();
    });

    test('coach and parent perspectives reflect the same progress', async ({ page }) => {
      await page.goto('/demo');
      await page.getByRole('button', { name: /wrist shots/i }).click();
      const perspectives = page.getByRole('group', { name: 'Sample perspective' });
      await perspectives.getByRole('button', { name: 'Coach view' }).click();
      await expect(page.getByText('1 of 3 exercises checked off. The session is still in progress.')).toBeVisible();
      await perspectives.getByRole('button', { name: 'Parent view' }).click();
      await expect(page.getByRole('heading', { name: 'Celebrate the effort' })).toBeVisible();
      await page.getByRole('button', { name: 'Back to sample checklist' }).click();
      await expect(page.getByRole('button', { name: /wrist shots/i })).toHaveAttribute('aria-pressed', 'true');
      await page.getByRole('button', { name: 'Reset sample' }).click();
      await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    });

    test('sample coach handoff preserves the chosen purpose', async ({ page }) => {
      await page.goto('/demo');
      await page.getByRole('button', { name: 'Use this with my team' }).click();
      await expect(page.getByRole('heading', { name: 'Create your coach account' })).toBeVisible();
    });

    test('sample family handoff preserves the chosen purpose', async ({ page }) => {
      await page.goto('/demo');
      await page.getByRole('button', { name: 'Start for my child', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Create your family account' })).toBeVisible();
    });

    test('malformed pasted links do not crash the join page', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/join');
      await page.getByLabel('Team invite code or link').fill('https://www.hockeyapp.ca/join/%E0%A4%A');
      await expect(page.getByRole('button', { name: /join with code/i })).toBeDisabled();
      await page.getByLabel('Team invite code or link').fill('  ab12cd  ');
      await expect(page.getByRole('button', { name: /join with code/i })).toBeEnabled();
      await page.getByRole('button', { name: /join with code/i }).click();
      await expect(page).toHaveURL(/\/join\/AB12CD$/);
      expect(errors).toEqual([]);
    });

    test('a full invite link extracts only the case-sensitive token', async ({ page }) => {
      await page.goto('/join');
      await page.getByLabel('Team invite code or link').fill('https://www.hockeyapp.ca/join/AbC-123?source=message');
      await page.getByLabel('Team invite code or link').press('Enter');
      await expect(page).toHaveURL(/\/join\/AbC-123$/);
    });

    test('the parent action works with the keyboard', async ({ page }) => {
      await page.goto('/');
      const start = page.getByRole('article', { name: 'For parents', exact: true }).getByRole('button', { name: 'Start for my child', exact: true });
      await start.focus();
      await expect(start).toBeFocused();
      await start.press('Enter');
      await expect(page.getByRole('heading', { name: 'Create your family account' })).toBeVisible();
    });

    test('public pages fit the viewport and avoid runtime errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const route of ['/', '/demo', '/join', '/auth?mode=signup', '/features', '/about', '/contact']) {
        await page.goto(route);
        await expect(page.locator('h1').first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), route).toBe(true);
        if (process.env.AUDIT_SCREENSHOT_DIR && route === '/') {
          await page.getByRole('region', { name: 'One team. Everyone involved.' }).screenshot({ path: path.join(process.env.AUDIT_SCREENSHOT_DIR, `home-people-${width}.png`), style: "nav { visibility: hidden; }" });
          await page.screenshot({ path: path.join(process.env.AUDIT_SCREENSHOT_DIR, `home-full-${width}.png`), fullPage: true, style: "nav { visibility: hidden; }" });
        }
        if (process.env.AUDIT_SCREENSHOT_DIR && route === '/about') {
          await page.getByRole('region', { name: /practice ends/i }).screenshot({ path: path.join(process.env.AUDIT_SCREENSHOT_DIR, `about-team-story-${width}.png`), style: "nav { visibility: hidden; }" });
          await page.screenshot({ path: path.join(process.env.AUDIT_SCREENSHOT_DIR, `about-full-${width}.png`), fullPage: true, style: "nav { visibility: hidden; }" });
        }
      }
      expect(errors).toEqual([]);
    });

    test('switching sign-in mode keeps the team invitation return path', async ({ page }) => {
      await page.goto('/auth?redirect=%2Fjoin%2Fdemo-code%2Fplayer');
      await page.getByRole('button', { name: /don't have an account/i }).click();
      await expect(page).toHaveURL(/redirect=%2Fjoin%2Fdemo-code%2Fplayer.*mode=signup/);
      await expect(page.getByLabel(/i agree to the terms/i)).toBeVisible();
    });
  });
}


test('homepage cards and previews fit a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  for (const section of [page.getByRole('region', { name: 'One team. Everyone involved.' }), page.getByRole('region', { name: /More shots.\s*More fun./ }), page.getByRole('region', { name: /See it. Try it. Check it off./ })]) {
    await section.scrollIntoViewIfNeeded();
    const box = await section.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(321);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  if (process.env.AUDIT_SCREENSHOT_DIR) await page.getByRole('region', { name: 'One team. Everyone involved.' }).screenshot({ path: path.join(process.env.AUDIT_SCREENSHOT_DIR, 'home-people-320.png'), style: "nav { visibility: hidden; }" });
});
