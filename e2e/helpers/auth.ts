import { Page } from '@playwright/test';

export async function login(page: Page) {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');

  // Already logged in — redirect will happen automatically
  if (!page.url().includes('/auth')) return;

  const emailInput = page.getByLabel(/email/i);
  const passwordInput = page.getByLabel(/password/i);

  await emailInput.fill(process.env.TEST_EMAIL!);
  await passwordInput.fill(process.env.TEST_PASSWORD!);
  await page.getByRole('button', { name: /sign in/i }).click({ force: true });

  // Poll for SPA client-side redirect
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(500);
    if (!page.url().includes('/auth')) return;
  }

  throw new Error(`Login failed — still on ${page.url()} after 15s`);
}

export async function logout(page: Page) {
  await page.goto('/settings');
  await page.waitForLoadState('networkidle');
  const signOutBtn = page.getByRole('button', { name: /sign out/i });
  if (await signOutBtn.isVisible()) {
    await signOutBtn.click();
    // App may redirect to /auth or / after sign out
    await page.waitForURL(url => {
      const path = new URL(url.toString()).pathname;
      return path === '/' || path.includes('/auth');
    }, { timeout: 8000 });
  }
}

export async function getFirstTeamId(page: Page): Promise<string | null> {
  await page.goto('/teams');
  await page.waitForLoadState('networkidle');
  const teamLink = page.locator('a[href*="/teams/"]').first();
  if (await teamLink.isVisible()) {
    const href = await teamLink.getAttribute('href');
    const match = href?.match(/\/teams\/([^\/]+)/);
    return match ? match[1] : null;
  }
  return null;
}

export async function getFirstPlayerId(page: Page): Promise<string | null> {
  await page.goto('/players');
  await page.waitForLoadState('networkidle');
  const playerLink = page.locator('a[href*="/players/"]').first();
  if (await playerLink.isVisible()) {
    const href = await playerLink.getAttribute('href');
    const match = href?.match(/\/players\/([^\/]+)/);
    return match ? match[1] : null;
  }
  return null;
}
