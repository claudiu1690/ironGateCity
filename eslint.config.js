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
