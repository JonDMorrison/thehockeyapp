import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'fs';

async function globalSetup(config: FullConfig) {
  fs.mkdirSync('e2e/.auth', { recursive: true });

  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    fs.writeFileSync('e2e/.auth/user.json', JSON.stringify({
      cookies: [],
      origins: []
    }));
    return;
  }

  const baseURL = String(config.projects[0]?.use?.baseURL || 'http://localhost:8080');
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await page.goto(`${baseURL}/auth?mode=signin`);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 15_000 });
    await page.context().storageState({ path: 'e2e/.auth/user.json' });
  } finally {
    await browser.close();
  }
}

export default globalSetup;
