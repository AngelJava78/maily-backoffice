import { useEffect, type Dispatch } from 'react';

import type { TokenAction } from './tokenReducer';

/** The longest a timer can wait: a larger delay would make `setTimeout` fire at once. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Tells the screen when the token reaches its expiration, so that it can say "Expirado" without the
 * person reloading anything (FR-013, research D8). It waits with a single timer for the moment of
 * the expiration, and also listens to `visibilitychange` because the timers of a tab in the
 * background run late. Both write the clock of the screen with `ticked`, from a callback: the state
 * is never written while rendering or synchronously in the effect.
 *
 * `now` is the clock the screen already has: when a `ticked` moves it, the effect runs again and
 * schedules what is left, which is how an expiration further away than a timer can wait is reached.
 */
export function useExpiryTimer(
  expiresAt: string | null,
  now: number,
  dispatch: Dispatch<TokenAction>,
): void {
  useEffect(() => {
    if (expiresAt === null) {
      return undefined;
    }
    const remaining = Date.parse(expiresAt) - now;
    if (remaining <= 0) {
      return undefined;
    }

    const tick = (): void => {
      dispatch({ type: 'ticked', now: Date.now() });
    };
    const timer = setTimeout(tick, Math.min(remaining, MAX_TIMEOUT_MS));
    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [expiresAt, now, dispatch]);
}
