import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

/**
 * End-to-end tests. They sign in at a real Auth0 tenant with real test accounts, so each spec is
 * skipped unless the `E2E_AUTH0_*` variables are set (see e2e/fixtures/accounts.ts).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // Creating, blocking or deleting a user calls Auth0 through the service, which waits up to 10 s
  // (and a rate limit can add to it): the default 5 s of an assertion would fail steps that work.
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
});
