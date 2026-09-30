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
    {
      name: 'phone',
      testIgnore: [/council\.spec\.ts/, /qa\.slice3\.spec\.ts/, /devpanel\.spec\.ts/, /landscape\.spec\.ts/],
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'small-phone',
      testMatch: /arrival\.spec\.ts/,
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 },
    },
    // Review 2 #3: a phone held sideways (812 × 375 and 667 × 375, set in the spec).
    {
      name: 'landscape',
      testMatch: /landscape\.spec\.ts/,
      use: { ...devices['Pixel 7 landscape'] },
    },
    {
      name: 'desktop',
      testMatch: /arrival\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    // Slice 3: the council cycle moves the shared test clock by a cycle and passes an ordinance in
    // Coalport, so it runs last, after every other project.
    {
      name: 'council',
      testMatch: /council\.spec\.ts/,
      dependencies: ['phone', 'small-phone', 'landscape', 'desktop'],
      use: { ...devices['Pixel 7'] },
    },
    // QA slice 3: the ballot on a phone, after the council cycle (it moves the shared clock too).
    {
      name: 'qa-council',
      testMatch: /qa\.slice3\.spec\.ts/,
      dependencies: ['council'],
      use: { ...devices['Pixel 7'] },
    },
    // The dev time-skip panel skips phases on the shared clock: after everything else.
    {
      name: 'dev-panel',
      testMatch: /devpanel\.spec\.ts/,
      dependencies: ['qa-council'],
      use: { ...devices['Pixel 7'] },
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
        // POST /api/test/clock, /city-day and /character (tech design §7.8, slice-3 §8.6);
        // refused outside DB_MODE=memory.
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
