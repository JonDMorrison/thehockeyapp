import { Page } from '@playwright/test';

export async function login(page: Page) {
  // Session is pre-loaded via storageState in playwright.config.ts
  // Just navigate to the app — Supabase session will be picked up automatically
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // If we end up on /auth, the session expired — fail clearly
  if (page.url().includes('/auth')) {
    throw new Error('Session expired — refresh e2e/.auth/user.json with a new token from hockeyapp.ca DevTools');
  }
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

export async function dismissModals(page: Page) {
  // Dismiss onboarding tour or any modal overlay
  const skipTour = page.getByText(/skip tour/i).first();
  if (await skipTour.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skipTour.click();
    await page.waitForTimeout(500);
  }
  // Also try pressing Escape for any remaining modals
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

export async function getFirstTeamId(page: Page): Promise<string | null> {
  await page.goto('/teams');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Dismiss any onboarding modal that may be blocking
  await dismissModals(page);

  // Try multiple link patterns
  const selectors = [
    'a[href*="/teams/"]',
    '[data-team-id]',
    'button[data-id]',
  ];

  for (const selector of selectors) {
    const el = page.locator(selector).first();
    if (await el.isVisible()) {
      const href = await el.getAttribute('href');
      if (href) {
        const match = href.match(/\/teams\/([^\/]+)/);
        if (match) return match[1];
      }
    }
  }

  // Last resort: click the first team card and extract ID from URL
  const teamCard = page.locator('[class*="card"][class*="cursor-pointer"]').first();
  if (await teamCard.isVisible()) {
    await teamCard.click({ force: true });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const url = page.url();
    const match = url.match(/\/teams\/([^\/]+)/);
    if (match) return match[1];
  }

  return null;
}

export async function getFirstPlayerId(page: Page): Promise<string | null> {
  await page.goto('/players');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Try direct link pattern first
  const playerLink = page.locator('a[href*="/players/"]').first();
  if (await playerLink.isVisible()) {
    const href = await playerLink.getAttribute('href');
    const match = href?.match(/\/players\/([^\/]+)/);
    if (match) return match[1];
  }

  // Try clicking first player card
  const playerCard = page.locator('[class*="card"], [class*="player"]').first();
  if (await playerCard.isVisible()) {
    await playerCard.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const url = page.url();
    const match = url.match(/\/players\/([^\/]+)/);
    if (match) return match[1];
    await page.goBack();
  }

  return null;
}
