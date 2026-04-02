import { defineConfig } from '@playwright/test';

const URL = `http://localhost:${Number(process.env.LOCALHOST_PORT) || 5173}`;

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  outputDir: './tests/e2e/.results',
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  reporter: 'list',
  retries: process.env.CI ? 2 : 0,
  testDir: './tests/e2e',
  use: {
    baseURL: URL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run serve',
    reuseExistingServer: !process.env.CI,
    url: URL,
  },
  workers: process.env.CI ? 1 : undefined,
});
