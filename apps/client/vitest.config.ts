import { defineConfig } from 'vitest/config';

// Unit tests live next to the source; e2e/ belongs to Playwright (`pnpm e2e`).
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
  },
});
