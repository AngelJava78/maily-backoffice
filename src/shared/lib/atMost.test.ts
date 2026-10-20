import { afterEach, describe, expect, it, vi } from 'vitest';

import { atMost, REFRESH_WAIT_MS } from './atMost';

describe('atMost', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ends with the work when it is quicker, and leaves no timer behind', async () => {
    vi.useFakeTimers();

    await atMost(10_000, Promise.resolve('listo'));

    expect(vi.getTimerCount()).toBe(0);
  });

  it('lets go after the time when the work does not end', async () => {
    vi.useFakeTimers();
    let ended = false;
    const waiting = atMost(10_000, new Promise<void>(() => undefined)).then(() => {
      ended = true;
    });

    await vi.advanceTimersByTimeAsync(9_999);
    expect(ended).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await waiting;

    expect(ended).toBe(true);
  });

  it('does not fail when the work fails: what is waited for is only that the screen has been asked', async () => {
    await expect(atMost(10_000, Promise.reject(new Error('sin red')))).resolves.toBeUndefined();
  });
});

describe('REFRESH_WAIT_MS', () => {
  it('is ten seconds', () => {
    expect(REFRESH_WAIT_MS).toBe(10_000);
  });
});
