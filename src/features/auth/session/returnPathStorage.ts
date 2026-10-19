import { sanitizeReturnPathForStorage, toSafeInternalPath } from '@/shared/lib/safeReturnPath';

/**
 * The only place that touches `sessionStorage` (constitution V, exception registered in the plan):
 * it holds the screen the person was on when the session closed for inactivity, so that signing in
 * brings them back to it (research D11). It never holds a token, and the path it keeps has been
 * stripped of everything but the pagination and sort parameters.
 */
const STORAGE_KEY = 'mailysoft-backoffice:return-path';

/** Remembers where the person was. Failing to store (private mode, quota) only loses the shortcut. */
export function saveReturnPath(location: {
  readonly pathname: unknown;
  readonly search?: unknown;
}): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, sanitizeReturnPathForStorage(location));
  } catch {
    // Nothing is remembered: after signing in the person lands on the home page.
  }
}

/**
 * Returns the remembered path once and forgets it, or `/` when there is none. What comes out of
 * storage is a boundary, so a value that is not an internal path becomes `/`.
 */
export function consumeReturnPath(): string {
  try {
    const stored: unknown = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return toSafeInternalPath(stored);
  } catch {
    return '/';
  }
}
