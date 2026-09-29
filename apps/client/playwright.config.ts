import { defineConfig, devices } from '@playwright/test';

/**
 * E2E: the built server in DB_MODE=memory (ADR 0004, no Docker) behind `vite preview` with the
 * same /api proxy as dev and production (ADR 0001). Mobile-first, so the default project is a phone.
 */
const API_PORT = 3101;
const WEB_URL = 'http://localhost:4173';
const CI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  // One worker: day.spec moves the server's test clock, which every spec shares.
  workers: 1,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  timeout: 60_000,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Slice 2 (§12.3): every spec on a phone; the arrival also on a 360 px touch phone and a desktop.
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    {
      name: 'small-phone',
      testMatch: /arrival\.spec\.ts/,
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 },
    },
    {
      name: 'desktop',
      testMatch: /arrival\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @irongate/server build && node ../server/dist/index.js',
      url: `http://127.0.0.1:${API_PORT}/healthz`,
      timeout: 240_000,
      reuseExistingServer: false,
      stdout: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        DB_MODE: 'memory',
        PORT: String(API_PORT),
        HOST: '127.0.0.1',
        PUBLIC_ORIGIN: WEB_URL,
        BETTER_AUTH_SECRET: 'e2e-only-secret-e2e-only-secret-e2e-only',
        LOG_LEVEL: 'warn',
        SENTRY_DSN: '',
        // POST /api/test/clock for day.spec (tech design §7.8); refused outside DB_MODE=memory.
        E2E_TEST_HOOKS: '1',
      },
    },
    {
      command: 'pnpm build && pnpm preview',
      url: WEB_URL,
      timeout: 240_000,
      reuseExistingServer: false,
      env: { ...process.env, API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}`, VITE_SENTRY_DSN: '' },
    },
  ],
});
