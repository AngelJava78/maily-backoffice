import { ApiError } from './ApiError';

/** Constitution IV: GET requests are retried at most twice, only for network failures and 5xx. */
const MAX_QUERY_RETRIES = 2;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 4_000;

/** `retry` option of TanStack Query; `failureCount` is 0 for the first failure. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_QUERY_RETRIES && error instanceof ApiError && error.isRetryable;
}

/** `retryDelay` option of TanStack Query: 1 s, 2 s, then 4 s at most. */
export function retryDelay(attempt: number): number {
  return Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
}

/** A mutation is never repeated on its own: it could duplicate its effect. */
export const MUTATION_RETRY = false;
