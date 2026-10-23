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

// jsdom does not implement `matchMedia` at all (009-dark-mode-toggle: `ThemeModeProvider` reads it
// on every mount to resolve the system's light/dark preference, research.md D4) — without a stub,
// every test that renders the app would throw "window.matchMedia is not a function" on mount, not
// just the tests about theming. Reports "no preference" (light) by default; tests that care about
// the system preference itself (`ThemeModeProvider.test.tsx`) replace it with their own double.
Object.assign(window, {
  matchMedia: (media: string) => ({
    matches: false,
    media,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => true,
    addListener: () => undefined, // deprecated MediaQueryList API
    removeListener: () => undefined,
  }),
});

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

afterEach(async () => {
  cleanup();
  // A request that was aborted (a timeout, a query left behind by an unmounted screen) finishes
  // being cleaned up in the next turn of the event loop. If the handlers are reset before that, the
  // second request of the next test can go past MSW to the real network and fail (MSW 3 with Node
  // 24): one turn is enough for it to settle.
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
  server.resetHandlers();
  sessionStorage.clear();
  localStorage.clear();
});

afterAll(() => {
  server.close();
});
