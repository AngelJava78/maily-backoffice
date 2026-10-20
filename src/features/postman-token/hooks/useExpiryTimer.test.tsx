import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TokenAction } from './tokenReducer';
import { useExpiryTimer } from './useExpiryTimer';

const START = new Date('2026-10-19T12:00:00Z');
const MAX_TIMEOUT_MS = 2_147_483_647;
const DAY_MS = 86_400_000;

function setup(initial: { readonly expiresAt: string | null; readonly now: number }) {
  const dispatch = vi.fn<(action: TokenAction) => void>();
  const hook = renderHook(
    (props) => {
      useExpiryTimer(props.expiresAt, props.now, dispatch);
    },
    { initialProps: initial },
  );
  return { dispatch, ...hook };
}

const inMilliseconds = (milliseconds: number) => new Date(Date.now() + milliseconds).toISOString();

function setVisibility(state: 'visible' | 'hidden'): void {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useExpiryTimer (research D8)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('schedules nothing and listens to nothing while there is no token', () => {
    const add = vi.spyOn(document, 'addEventListener');

    setup({ expiresAt: null, now: Date.now() });

    expect(vi.getTimerCount()).toBe(0);
    expect(add.mock.calls.some(([type]) => type === 'visibilitychange')).toBe(false);
  });

  it('ticks once, at the exact moment the token expires', () => {
    const { dispatch } = setup({ expiresAt: inMilliseconds(120_000), now: Date.now() });

    vi.advanceTimersByTime(119_999);
    expect(dispatch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: 'ticked',
      now: START.getTime() + 120_000,
    });
  });

  it('schedules nothing for a token that has already expired', () => {
    setup({ expiresAt: inMilliseconds(-1_000), now: Date.now() });

    expect(vi.getTimerCount()).toBe(0);
  });

  it('never asks a timer to wait more than it can: it ticks at the most and schedules the rest afterwards', () => {
    const expiresAt = inMilliseconds(40 * DAY_MS);
    const { dispatch, rerender } = setup({ expiresAt, now: Date.now() });

    // A delay above 2^31 - 1 ms would fire at once, so it must not be asked for.
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(MAX_TIMEOUT_MS - 1);
    expect(dispatch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: 'ticked',
      now: START.getTime() + MAX_TIMEOUT_MS,
    });

    // The reducer writes the clock that `ticked` brought, and the effect schedules what is left.
    rerender({ expiresAt, now: START.getTime() + MAX_TIMEOUT_MS });
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(40 * DAY_MS - MAX_TIMEOUT_MS - 1);
    expect(dispatch).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenLastCalledWith({
      type: 'ticked',
      now: START.getTime() + 40 * DAY_MS,
    });
  });

  it('ticks when the person comes back to the tab, because a hidden tab delays its timers', () => {
    const { dispatch } = setup({ expiresAt: inMilliseconds(120_000), now: Date.now() });

    setVisibility('hidden');
    expect(dispatch).not.toHaveBeenCalled();

    vi.setSystemTime(START.getTime() + 200_000);
    setVisibility('visible');
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: 'ticked',
      now: START.getTime() + 200_000,
    });
  });

  it('clears the timer and the listener when the screen goes away', () => {
    const { dispatch, unmount } = setup({ expiresAt: inMilliseconds(120_000), now: Date.now() });

    unmount();

    expect(vi.getTimerCount()).toBe(0);
    setVisibility('visible');
    vi.advanceTimersByTime(200_000);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('starts again, and forgets the old timer, when the expiration changes (a new token)', () => {
    const { dispatch, rerender } = setup({
      expiresAt: inMilliseconds(120_000),
      now: Date.now(),
    });

    rerender({ expiresAt: inMilliseconds(300_000), now: Date.now() });
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(120_000);
    expect(dispatch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(180_000);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: 'ticked',
      now: START.getTime() + 300_000,
    });
  });
});
