/** How long a change waits for the screen to show what is true before it lets its dialog go. */
export const REFRESH_WAIT_MS = 10_000;

/**
 * Waits for `work`, but no longer than `ms`. A change that waits for the screen to be refreshed
 * keeps its dialog busy, and a request that hangs (a 30 s limit and two retries) would keep the
 * dialog from being closed for a minute and a half.
 */
export function atMost(ms: number, work: Promise<unknown>): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    void work.then(done, done);
  });
}
