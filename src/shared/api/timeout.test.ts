import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runWithTimeout } from './timeout';

/** Settles like an abortable request: it rejects with the reason of the signal when it aborts. */
function untilAborted(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    const rejectWithReason = (): void => {
      // Like fetch, it rejects with whatever the signal was aborted with.
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      reject(signal.reason);
    };
    if (signal.aborted) {
      rejectWithReason();
      return;
    }
    signal.addEventListener('abort', rejectWithReason, { once: true });
  });
}

describe('runWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns what run returns and leaves no timer behind', async () => {
    const result = await runWithTimeout(undefined, 8_000, () => Promise.resolve('done'));

    expect(result).toBe('done');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not abort before the time limit and aborts with a TimeoutError at it', async () => {
    let received: AbortSignal | undefined;
    const outcome = runWithTimeout(undefined, 8_000, (signal) => {
      received = signal;
      return untilAborted(signal);
    });
    const assertion = expect(outcome).rejects.toMatchObject({ name: 'TimeoutError' });

    await vi.advanceTimersByTimeAsync(7_999);
    expect(received?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(received?.aborted).toBe(true);
    expect(received?.reason).toMatchObject({ name: 'TimeoutError' });
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('passes the reason of the caller when the caller aborts', async () => {
    const caller = new AbortController();
    let received: AbortSignal | undefined;
    const outcome = runWithTimeout(caller.signal, 8_000, (signal) => {
      received = signal;
      return untilAborted(signal);
    });
    const reason = new Error('cancelled by the caller');
    const assertion = expect(outcome).rejects.toBe(reason);

    caller.abort(reason);

    await assertion;
    expect(received?.reason).toBe(reason);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('hands over an already aborted signal when the caller had aborted', async () => {
    const caller = new AbortController();
    const reason = new Error('aborted before starting');
    caller.abort(reason);

    await expect(runWithTimeout(caller.signal, 8_000, untilAborted)).rejects.toBe(reason);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the timer when run rejects', async () => {
    await expect(
      runWithTimeout(undefined, 8_000, () => Promise.reject(new Error('failed'))),
    ).rejects.toThrow('failed');

    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not abort the signal of a run that already finished', async () => {
    let received: AbortSignal | undefined;
    await runWithTimeout(undefined, 8_000, (signal) => {
      received = signal;
      return Promise.resolve();
    });

    await vi.advanceTimersByTimeAsync(60_000);

    expect(received?.aborted).toBe(false);
  });

  it('ignores a later abort of the caller once run has finished', async () => {
    const caller = new AbortController();
    let received: AbortSignal | undefined;
    await runWithTimeout(caller.signal, 8_000, (signal) => {
      received = signal;
      return Promise.resolve();
    });

    caller.abort(new Error('too late'));

    expect(received?.aborted).toBe(false);
  });
});
