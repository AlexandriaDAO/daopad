import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');
const hasAuth = fs.existsSync(authFile);

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
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Auto-load auth if available
    ...(hasAuth ? { storageState: authFile } : {})
  },

  projects: [
    // Setup project (runs first, creates .auth/user.json)
    // Only include if auth doesn't exist yet
    ...(hasAuth ? [] : [{
      name: 'setup',
      testMatch: /.*\.setup\.ts/
    }]),

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-logging', '--v=1']
        }
      },
      // Depend on setup only if auth doesn't exist
      ...(hasAuth ? {} : { dependencies: ['setup'] })
    },
  ],

  timeout: 120000,
});
