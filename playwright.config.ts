import { defineConfig } from '@playwright/test';
import path from 'node:path';

const URL = `http://localhost:${process.env.VITE_PORT ?? 5173}`;

export default defineConfig({
  expect: {
    timeout: 5000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
  forbidOnly: Boolean(process.env.CI),
  outputDir: path.resolve(__dirname, '.playwright'),
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  reporter: process.env.CI ? [['dot'], ['html', { open: 'never' }]] : 'list',
  retries: process.env.CI ? 2 : 0,
  testDir: path.resolve(__dirname, './tests/e2e'),
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
  ...(process.env.CI && { workers: 1 }),
});
