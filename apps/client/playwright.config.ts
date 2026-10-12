import { defineConfig, devices } from '@playwright/test';

/**
 * E2E: the built server in DB_MODE=memory (ADR 0004, no Docker) behind `vite preview` with the
 * same /api proxy as dev and production (ADR 0001). Mobile-first, so the default project is a phone.
 */
// The ports, overridable when another program holds one (E2E_API_PORT, E2E_WEB_PORT).
const API_PORT = Number(process.env.E2E_API_PORT ?? 3101);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 4173);
const WEB_URL = `http://localhost:${WEB_PORT}`;
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
      testIgnore: [
        /council\.spec\.ts/,
        /qa\.slice3\.spec\.ts/,
        /devpanel\.spec\.ts/,
        /landscape\.spec\.ts/,
        /travel\.spec\.ts/,
        /capital\.spec\.ts/,
        /qa\.slice4\.spec\.ts/,
        /homeMap\.spec\.ts/,
        /missions\.spec\.ts/,
        /(^|[\\/])rival\.spec\.ts$/,
        /qa\.slice5\.spec\.ts/,
        /review4\.spec\.ts/,
        /qa\.review4\.spec\.ts/,
        /review5\.spec\.ts/,
        /qa\.review5\.spec\.ts/,
        // The voting rework: its own serial project, last (it moves the shared clock by whole cycles).
        /(^|[\\/])voting\.spec\.ts$/,
        /qa\.voting(\.screens|\.irongate)?\.spec\.ts/,
      ],
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
    // Slice 4 (tech design §15.1): the first trip and the capital, each in its own project after the
    // existing ones (the capital moves the shared clock by cycles and to a Monday).
    {
      name: 'travel',
      testMatch: /travel\.spec\.ts/,
      dependencies: ['dev-panel'],
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'capital',
      testMatch: /capital\.spec\.ts/,
      dependencies: ['travel'],
      use: { ...devices['Pixel 7'] },
    },
    // QA slice 4: the capital's overview, the tram bar, double taps, the keyboard and the capital's
    // ballot on a short phone; last, since it moves the shared clock to the capital's polls.
    {
      name: 'qa-capital',
      testMatch: /qa\.slice4\.spec\.ts/,
      dependencies: ['capital'],
      use: { ...devices['Pixel 7'] },
    },
    // Slice 5 (tech design §15.1): the home map (review 4: one map, homeMap.spec.ts), missions and the street, and rival ground, each in
    // its own project after the capital's, in this order.
    {
      name: 'home-map',
      testMatch: /homeMap\.spec\.ts/,
      dependencies: ['qa-capital'],
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'missions',
      testMatch: /missions\.spec\.ts/,
      dependencies: ['home-map'],
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'rival',
      // Not `arrival.spec.ts`.
      testMatch: /(^|[\\/])rival\.spec\.ts$/,
      dependencies: ['missions'],
      use: { ...devices['Pixel 7'] },
    },
    // QA slice 5: the new screens' targets and layout, double taps, the keyboard, plain words and the
    // overviews; after rival ground (it sets no clock of its own).
    {
      name: 'qa-risk',
      testMatch: /qa\.slice5\.spec\.ts/,
      dependencies: ['rival'],
      use: { ...devices['Pixel 7'] },
    },
    // Review 4 (tech design §18.2, T28): a walk through the notes a new member meets, with the
    // vocabulary sweep on every screen; last, after everything else.
    {
      name: 'review4',
      // Not `qa.review4.spec.ts`.
      testMatch: /(^|[\\/])review4\.spec\.ts$/,
      dependencies: ['qa-risk'],
      use: { ...devices['Pixel 7'] },
    },
    // QA review 4 (client half): the opening for the other two parties, the journey on the map, the
    // maps and halls, Live here and the bed, the cells, the HUD, the desk and the editions, with the
    // known bugs as expected failures (QA_SHOW_BUGS=1 shows them); last, it moves the shared clock.
    {
      name: 'qa-review4',
      testMatch: /qa\.review4\.spec\.ts/,
      dependencies: ['review4'],
      use: { ...devices['Pixel 7'] },
    },
    // Design Review 2 quick fixes (#4 scroll bars, #6 Health under Energy, #7 the journey card): on
    // a desktop browser (classic scroll bars), each test setting its own size; last, it moves the
    // shared clock to the journey card's moment.
    {
      name: 'review5',
      testMatch: /(^|[\\/])review5\.spec\.ts$/,
      dependencies: ['qa-review4'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    // QA review 5 (docs/qa/review-5-report.md): the API halves (treatment, the patrol's buckets, quiet and
    // cap, the Unrest prize's farming cases, the night windows at their edges) and the screens at the six
    // sizes. Last: it moves the shared clock by weeks and sets the night seam (restored to day).
    {
      name: 'qa-review5',
      testMatch: /qa\.review5\.spec\.ts/,
      dependencies: ['review5'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    // The voting rework (docs/tech/voting-rework.md §15.2): the rule vote, its API block first (phase 2),
    // its screens with phases 3–5. Serial and last: it moves the shared clock by whole cycles.
    {
      name: 'voting',
      testMatch: /(^|[\\/])voting\.spec\.ts$/,
      dependencies: ['qa-review5'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    // QA of the voting rework (docs/qa/voting-rework-report.md): the edge cases (double taps, key replay,
    // windows, ties, Unrest, shared cards) and the screenshots. Serial and last, like `voting`.
    {
      name: 'qa-voting',
      testMatch: /qa\.voting(\.screens|\.irongate)?\.spec\.ts/,
      dependencies: ['voting'],
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
        // POST /api/test/clock, /city-day and /character (tech design §7.8, slice-3 §8.6);
        // refused outside DB_MODE=memory.
        E2E_TEST_HOOKS: '1',
        // Review 5 (ADR 0079): the town held at day, so a third of all times being night never makes
        // a spec flaky; night specs switch it with POST /api/test/night and restore it.
        E2E_NIGHT: 'day',
        // Review 5 (ADR 0081): no patrol rolls unless a spec asks (POST /api/test/patrol).
        E2E_PATROL: 'never',
      },
    },
    {
      command: `pnpm build && pnpm preview --port ${WEB_PORT} --strictPort`,
      url: WEB_URL,
      timeout: 240_000,
      reuseExistingServer: false,
      // Maps v3 (§7): a tile origin nothing serves, so every spec runs the stills (the fallback) unless
      // it routes the tiles itself (tiles.spec.ts).
      env: {
        ...process.env,
        API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}`,
        VITE_SENTRY_DSN: '',
        VITE_TILES_ORIGIN: '/e2e-tiles',
      },
    },
  ],
});
