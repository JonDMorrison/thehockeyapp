import { expect, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('an unusable password reset link explains how to recover', async ({ page }) => {
  await page.goto('/auth?mode=reset&code=invalid-audit-code');
  await expect(page.getByText(/this reset link has expired or could not be opened/i)).toBeVisible();
  await page.getByRole('link', { name: 'Back to sign in to request a new link' }).click();
  await expect(page.getByRole('button', { name: /sign in/i, exact: true })).toBeVisible();
});

test('header team setup opens coach signup directly', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('link', { name: /set up your team/i }).click();
  await expect(page.getByRole('heading', { name: 'Create your coach account' })).toBeVisible();
});

test('sample instructions expand and sample progress resets on reload', async ({ page }) => {
  await page.goto('/demo');
  await page.getByText('How to do it', { exact: true }).first().click();
  await expect(page.getByText(/move the puck side to side/i)).toBeVisible();
  await page.getByRole('button', { name: /wrist shots/i }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
  await page.reload();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
});

test('finished sample stays complete when perspectives change', async ({ page }) => {
  await page.goto('/demo');
  for (const name of ['Quick hands warm-up', 'Wrist shots', 'Cool down']) await page.getByRole('button', { name: new RegExp(name) }).click();
  await page.getByRole('button', { name: 'Finish sample session' }).click();
  for (const role of ['Coach view', 'Parent view']) {
    await page.getByRole('group', { name: 'Sample perspective' }).getByRole('button', { name: role }).click();
    await expect(page.getByText(/sample player finished today’s session/i)).toBeVisible();
  }
});

test('signup submits normalized email and name without changing the password', async ({ page }) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route('**/auth/v1/signup*', route => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ msg: 'Simulated rejection; no account created' }) });
  });
  await page.goto('/auth?mode=signup');
  await page.getByLabel(/your name/i).fill('  Audit Parent  ');
  await page.getByLabel(/email/i).fill('  audit@example.com  ');
  await page.getByLabel(/^password/i).fill('  example-password  ');
  await page.getByLabel(/i agree to the terms/i).check();
  await page.getByRole('button', { name: /create account/i }).click();
  await expect.poll(() => submitted?.email).toBe('audit@example.com');
  expect(submitted?.password).toBe('  example-password  ');
  expect((submitted?.data as Record<string, unknown>).display_name).toBe('Audit Parent');
});

for (const height of [568, 844]) {
  test(`role picker is scrollable on a 390x${height} phone`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height });
    await page.goto('/features');
    await page.getByRole('button', { name: /set up your team free/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
    await dialog.getByRole('button', { name: /association/i }).click();
    await expect(page).toHaveURL(/auth\?mode=signup/);
  });
}


test('deep-page links open the intended section rather than retaining the old scroll position', async ({ page }) => {
  await page.goto('/about');
  const sampleLink = page.getByRole('link', { name: 'Try the daily routine', exact: true });
  await sampleLink.scrollIntoViewIfNeeded();
  await sampleLink.click();
  await expect(page.locator('#sample-workout-heading')).toBeInViewport();
  const contactLink = page.getByRole('link', { name: 'Contact', exact: true });
  await contactLink.scrollIntoViewIfNeeded();
  await contactLink.click();
  await expect(page.getByRole('heading', { name: /talk to a real person/i })).toBeInViewport();
});
