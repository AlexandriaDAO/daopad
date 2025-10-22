import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';

// Pre-flight check: Verify auth file exists
const authFile = '.auth/user.json';
if (!fs.existsSync(authFile)) {
  console.warn(`
    ⚠️  WARNING: Auth file not found at ${authFile}
    E2E tests will fail without authentication.

    Run this once to set up auth:
      npx playwright test --headed e2e/setup/auth.setup.ts
  `);
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],

  use: {
    baseURL: process.env.TEST_BASE_URL || 'https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io',
    // This auto-loads auth for all tests (path relative to this config file)
    storageState: fs.existsSync(authFile) ? authFile : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-logging', '--v=1']
        }
      },
    },
  ],

  timeout: 120000,
});
