/**
 * Runs `run` with a signal that aborts when `callerSignal` does (with its reason) or after `ms`
 * milliseconds (with a `TimeoutError`). Built on `AbortController` and `setTimeout`, not on
 * `AbortSignal.timeout`, because fake timers in tests only control the former.
 */
export async function runWithTimeout<T>(
  callerSignal: AbortSignal | undefined,
  ms: number,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const abortWithCallerReason = (): void => {
    controller.abort(callerSignal?.reason);
  };

  if (callerSignal?.aborted === true) {
    abortWithCallerReason();
  } else {
    callerSignal?.addEventListener('abort', abortWithCallerReason, { once: true });
  }
  const timer = setTimeout(() => {
    controller.abort(new DOMException(`The operation timed out after ${ms} ms`, 'TimeoutError'));
  }, ms);

  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', abortWithCallerReason);
  }
}
