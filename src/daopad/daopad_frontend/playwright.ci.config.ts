import { defineConfig, devices } from '@playwright/test';

// CI-friendly configuration that doesn't require real auth
export default defineConfig({
  testDir: './e2e',
  forbidOnly: true,
  retries: 2,
  workers: 2,
  reporter: [['json', { outputFile: 'test-results.json' }]],

  use: {
    baseURL: 'https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'anonymous-tests',
      testMatch: [
        '**/activity.spec.ts',
        '**/agreement.spec.ts',
        '**/app-route.spec.ts',
        '**/debug-page-load.spec.ts',
        '**/minimal-smoke.spec.ts',
        '**/settings.spec.ts'
      ],
      use: { ...devices['Desktop Chrome'] },
      fullyParallel: true,
    }
  ],
});