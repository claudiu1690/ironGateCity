import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { setClockSource } from '../src/format';

afterEach(() => {
  cleanup();
  // Review 4: a test that pins the time helpers' clock gives it back.
  setClockSource(() => Date.now());
});
