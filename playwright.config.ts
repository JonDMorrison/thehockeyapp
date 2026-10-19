import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env.test', quiet: true });

const baseURL = process.env.TEST_BASE_URL || 'http://localhost:8080';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'html',
  globalSetup: './e2e/helpers/global-setup.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    storageState: process.env.TEST_AUTH_STATE_FILE || 'e2e/.auth/user.json',
  },
  webServer: process.env.TEST_BASE_URL ? undefined : {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...(process.env.QA_CROSS_BROWSER === '1' ? [
      { name: 'webkit', use: { ...devices['Desktop Safari'] } },
      { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    ] : []),
  ],
});
