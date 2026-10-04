import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // The design-document comparisons parse long Markdown files; under the full Turborepo gate (every
    // package's tests in parallel) a few run past Vitest's 5 s default.
    testTimeout: 30_000,
  },
});
