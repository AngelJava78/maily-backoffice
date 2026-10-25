import { useSyncExternalStore } from 'react';

const TICK_MS = 1_000;

// A clock shared by everything on screen (research D13): one timer for every reader, which only
// runs while someone reads it and only moves while the tab is visible.
const listeners = new Set<() => void>();
let now = Date.now();
let timer: ReturnType<typeof setInterval> | undefined;

function tick(): void {
  if (document.visibilityState === 'hidden') {
    return;
  }
  now = Date.now();
  for (const listener of listeners) {
    listener();
  }
}

/** Coming back to the tab moves the clock at once, without waiting for the next second. */
function onVisibilityChange(): void {
  if (document.visibilityState === 'visible') {
    tick();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === undefined) {
    timer = setInterval(tick, TICK_MS);
    // The browser sends the event to the document and it bubbles up to `window`.
    window.addEventListener('visibilitychange', onVisibilityChange);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
      window.removeEventListener('visibilitychange', onVisibilityChange);
    }
  };
}

function getSnapshot(): number {
  // Without readers the clock does not tick, so whoever reads it first gets the current time. It
  // only changes when it is a second off, so two reads in a row give the same value.
  if (timer === undefined && Math.abs(Date.now() - now) >= TICK_MS) {
    now = Date.now();
  }
  return now;
}

/**
 * The time of the browser, in milliseconds since the epoch, moved every second while the tab is
 * visible. «Actualizado hace» and the return line of the database read it: the render takes the
 * time from this store, never from `Date.now()` (constitution I, `react-hooks/purity`).
 */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot);
}
