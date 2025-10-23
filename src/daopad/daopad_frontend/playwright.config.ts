import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use persistent browser profile to maintain II auth across test runs
// This persists IndexedDB (where II stores auth) unlike storageState
const userDataDir = join(__dirname, '.playwright-profile');

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
    launchOptions: {
      // Persistent profile - maintains ALL browser state including IndexedDB
      args: [
        '--enable-logging',
        '--v=1',
        `--user-data-dir=${userDataDir}`
      ]
    }
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  timeout: 120000,
});
