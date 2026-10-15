import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 120 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5185',
    trace: 'retain-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: [
    {
      command: 'node apps/api/dist/server.js',
      url: 'http://localhost:5055/api/health',
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: 'npm run dev --workspace=apps/web',
      url: 'http://localhost:5185',
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});
