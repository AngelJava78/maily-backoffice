import { ApiError } from './ApiError';

/** Constitution IV: GET requests are retried at most twice, only for network failures and 5xx. */
const MAX_QUERY_RETRIES = 2;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 4_000;

/**
 * A `retry` option of TanStack Query that repeats a GET at most `max` times, only for network
 * failures, time-outs and 5xx (constitution IV); `failureCount` is 0 for the first failure. The
 * health monitoring (016) retries once, so that a cycle stays within its time.
 */
export function retryUpTo(max: number): (failureCount: number, error: unknown) => boolean {
  return (failureCount, error) =>
    failureCount < max && error instanceof ApiError && error.isRetryable;
}

/** `retry` option of TanStack Query: at most two retries. */
export const shouldRetryQuery = retryUpTo(MAX_QUERY_RETRIES);

/** `retryDelay` option of TanStack Query: 1 s, 2 s, then 4 s at most. */
export function retryDelay(attempt: number): number {
  return Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
}

/** A mutation is never repeated on its own: it could duplicate its effect. */
export const MUTATION_RETRY = false;
