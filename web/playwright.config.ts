import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
  testDir: './e2e', testMatch: '**/*.spec.ts', fullyParallel: true,
  timeout: 60000, expect: {timeout: 10000}, workers: 2,
  retries: process.env.CI ? 1 : 0, forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', {open: 'never'}]],
  use: {baseURL: 'https://public-dl.github.io/health-data-vault/',
    trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure'},
  projects: [
    {name: 'desktop', use: {...devices['Desktop Chrome'], viewport: {width:1920,height:1080}}},
    {name: 'iphone', use: {...devices['iPhone 13'], defaultBrowserType:'chromium'}},
  ],
  webServer: {command: 'node e2e/serve.mjs', url: 'http://127.0.0.1:4399/health-data-vault/',
    reuseExistingServer:false, timeout:120000},
});
