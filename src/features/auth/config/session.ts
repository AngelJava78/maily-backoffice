/** FR-020: inactivity time after which the session is closed (15 minutes). */
export const IDLE_TIMEOUT_MS = 900_000;

/** FR-020: how long before the idle logout the warning appears (1 minute, i.e. at minute 14). */
export const IDLE_PROMPT_BEFORE_MS = 60_000;

/** FR-019: how often the access is checked again while the session is open (5 minutes). */
export const ACCESS_RECHECK_INTERVAL_MS = 300_000;

/**
 * FR-005 and SC-011: time budget of each attempt to resolve the access. With 3 attempts of
 * 8 000 ms and waits of 1 000 and 2 000 ms the failure shows up at 27 000 ms, below the 30 s limit.
 */
export const ACCESS_CHECK_ATTEMPT_TIMEOUT_MS = 8_000;
