import { defineConfig, devices } from '@playwright/test';

// NOTE: StorageState doesn't work with II auth (uses IndexedDB not localStorage)
// Treasury tests requiring auth must be run in --headed mode with manual login

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
