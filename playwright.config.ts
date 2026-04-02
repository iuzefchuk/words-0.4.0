import { defineConfig } from '@playwright/test';

const PORT = process.env.VITE_PORT ?? 5173;
const URL = `http://localhost:${PORT}`;

export default defineConfig({
  expect: {
    timeout: 5000,
  },
  forbidOnly: Boolean(process.env.CI),
  outputDir: './tests/e2e/.results',
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  reporter: process.env.CI ? [['dot'], ['html', { open: 'never' }]] : 'list',
  retries: process.env.CI ? 2 : 0,
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: URL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run serve',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: URL,
  },
  workers: process.env.CI ? 1 : undefined,
});
