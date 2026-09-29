import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/testing/**', 'src/index.ts', 'src/types.ts'],
      reporter: ['text-summary', 'text'],
      thresholds: {
        // T2: every branch of the check formula and the lazy Energy timer is covered.
        'src/check.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
        'src/energy.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
      },
    },
  },
});
