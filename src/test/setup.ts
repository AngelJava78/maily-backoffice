import '@testing-library/jest-dom/vitest';

import { cleanup, configure } from '@testing-library/react';
import axeCore from 'axe-core';
import { afterAll, afterEach, beforeAll, expect, vi } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';

import { server } from './server';

expect.extend(axeMatchers);

// jsdom cannot paint, so the colour contrast rule cannot run there (it only floods the output
// with "not implemented" warnings); contrast is checked in a real browser by the E2E suite.
axeCore.configure({ rules: [{ id: 'color-contrast', enabled: false }] });

// The first time a lazy route is visited its module has to be transformed, which is slow when many
// test files run at once: wait longer than the default second before giving up on a screen.
configure({ asyncUtilTimeout: 4_000 });

// Testing Library looks for fake timers through the `jest` global and hangs on `userEvent` and
// `waitFor` without it; point it at the fake clock of Vitest.
Object.assign(globalThis, {
  jest: { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) },
});

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  sessionStorage.clear();
});

afterAll(() => {
  server.close();
});
