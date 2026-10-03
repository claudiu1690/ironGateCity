// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/.turbo/**',
      'docs/**',
      '.idea/**',
      '.claude/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}', '**/*.config.ts', '**/scripts/**', 'apps/server/**', 'packages/db/**'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/client/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // Slice 4 (tech design §17, ADR 0026): `homeCityId` is the faction's home. Where a character
    // votes, stands, reads and takes orders is the residence: new server code goes through
    // `services/residence.ts`. A line that means the faction's home says so with a disable comment.
    files: ['apps/server/src/**/*.ts'],
    ignores: [
      // Joining: the faction's home is where a new member arrives (and lives).
      'apps/server/src/services/arrivalService.ts',
      // Story texts: `{city}` is the faction's home.
      'apps/server/src/services/story.ts',
      // Dev tools: the boost's *One of Us* is at home.
      'apps/server/src/dev/characterSeed.ts',
    ],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          property: 'homeCityId',
          message:
            "homeCityId is the faction's home. For where the character votes, reads and takes orders use residenceOf / residenceSpec (services/residence.ts); a faction-home read says so in a disable comment.",
        },
      ],
    },
  },
  {
    // The rules package is pure: no clocks, no randomness, no I/O.
    files: ['packages/rules/src/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use createRng(seed) from rng.ts.' },
        { object: 'Date', property: 'now', message: 'Pass `now` in; the rules package has no clock.' },
      ],
      'no-restricted-imports': [
        'error',
        { patterns: ['node:*', 'fs', 'path', 'crypto', 'mongoose', 'mongodb'] },
      ],
    },
  },
);
