import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 390, height: 844 } });

test('simple six-character signup reaches auth and visibility preserves the password', async ({ page }) => {
  let submittedPassword = '';
  await page.route('**/auth/v1/signup*', async route => {
    submittedPassword = route.request().postDataJSON().password;
    await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ msg: 'Signup test completed', error_code: 'test_only' }) });
  });
  await page.goto('/auth?mode=signup');
  await page.getByLabel(/^email/i).fill('password-entry-test@example.com');
  const password = page.locator('#password');
  await password.fill('hockey');
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('checkbox', { name: 'Show password', exact: true }).check();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(password).toHaveValue('hockey');
  await page.getByRole('checkbox', { name: 'Show password', exact: true }).uncheck();
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('checkbox', { name: /I agree/ }).check();
  await page.getByRole('button', { name: 'Create Account', exact: true }).click();
  await expect.poll(() => submittedPassword).toBe('hockey');
});

for (const mode of ['signin', 'reset']) {
  test(`${mode} can reveal and hide passwords without changing values`, async ({ page }) => {
    await page.goto(`/auth?mode=${mode}`);
    await page.locator('#password').fill('hockey');
    if (mode === 'reset') await page.locator('#confirmPassword').fill('hockey');
    await page.getByRole('checkbox', { name: 'Show password', exact: true }).check();
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');
    if (mode === 'reset') await expect(page.locator('#confirmPassword')).toHaveAttribute('type', 'text');
    await page.getByRole('checkbox', { name: 'Show password', exact: true }).uncheck();
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    await expect(page.locator('#password')).toHaveValue('hockey');
  });
}
