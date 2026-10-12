// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// PW_CHROMIUM_PATH lets the suite run against a preinstalled Chromium
// (no download). In CI, `npx playwright install chromium` is used instead.
const launchOptions = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure', launchOptions },
  webServer: { command: 'node tests/serve.js 4173', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, launchOptions } },
    { name: 'phone', use: { ...devices['Pixel 7'], launchOptions } },
  ],
});
