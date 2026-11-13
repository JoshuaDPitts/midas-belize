import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 1 local retry cushions cold Next.js dev-compile + external-tile-service
  // timing flakes (Cesium ion streaming, OpenFreeMap MVT) without paying the
  // retry cost on every test. CI stays at 2.
  retries: process.env.CI ? 2 : 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3123',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3123',
    reuseExistingServer: !process.env.CI,
  },
});
