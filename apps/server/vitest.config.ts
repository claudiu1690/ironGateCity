import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/globalSetup.ts'],
    // Review 5 (ADR 0079): the night seam pinned to day; night tests opt into the clock.
    setupFiles: ['test/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
