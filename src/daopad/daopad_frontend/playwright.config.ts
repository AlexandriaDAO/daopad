import { defineConfig, devices } from '@playwright/test';

// NOTE: II authentication requires IndexedDB (not capturable by storageState)
// For authenticated tests: Login once manually, II delegation persists in browser
// OR run tests in --headed mode with manual login each time

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Set at project level instead
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4, // Increase workers for parallel tests
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
      name: 'anonymous-parallel',
      testMatch: [
        '**/activity.spec.ts',
        '**/agreement.spec.ts',
        '**/app-route.spec.ts',
        '**/debug-page-load.spec.ts',
        '**/minimal-smoke.spec.ts',
        '**/settings.spec.ts'
      ],
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-logging', '--v=1']
        }
      },
      fullyParallel: true,
    },
    {
      name: 'authenticated-serial',
      testMatch: [
        '**/treasury*.spec.ts',
        '**/canisters.spec.ts',
        '**/manual-auth-setup.spec.ts'
      ],
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-logging', '--v=1']
        },
        // Attempt to use storage state if it exists
        storageState: '.auth/user.json',
      },
      fullyParallel: false, // Serial execution for auth tests
    },
  ],

  timeout: 120000,
});
