import { ApiError } from '@/shared/api/ApiError';
import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';

const MS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

/**
 * Whether coming back to the tab must run a cycle (FR-023): only once the interval passed since the
 * last correct answer, or when there was none yet (`lastSuccessAt` is 0). Otherwise the next
 * automatic cycle comes when the interval is over.
 */
export function isRefreshDue(lastSuccessAt: number, now: number, intervalMs: number): boolean {
  return lastSuccessAt === 0 || now - lastSuccessAt >= intervalMs;
}

/**
 * How long ago the data on screen arrived (FR-027, research D13): in seconds below a minute, in
 * minutes below an hour and, from then on, the date and the time with the seconds. Never negative:
 * a clock out of step counts as 0 s.
 */
export function formatElapsed(updatedAt: number, now: number): string {
  const { page } = messages.health;
  const seconds = Math.max(0, Math.floor((now - updatedAt) / MS_PER_SECOND));
  if (seconds < SECONDS_PER_MINUTE) {
    return page.updatedSecondsAgo(seconds);
  }
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) {
    return page.updatedMinutesAgo(minutes);
  }
  return page.updatedAt(formatDateTime(new Date(updatedAt).toISOString(), { seconds: true }));
}

/**
 * Whether a failure of the aggregator starts the chain (FR-067, research D8): no answer (network,
 * time-out), a broken contract or a 5xx, the 503 of a permission that could not be checked
 * included. A 401, a 403 or another 4xx is an answer of the service, which the chain cannot improve.
 */
export function startsFallbackChain(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }
  return (
    error.kind === 'network' ||
    error.kind === 'timeout' ||
    error.kind === 'contract' ||
    (error.status !== null && error.status >= 500)
  );
}
