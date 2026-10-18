import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/ApiError';
import { MUTATION_RETRY, retryDelay, shouldRetryQuery } from '@/shared/api/retry';

export interface CreateQueryClientOptions {
  /** Called when a query or mutation is refused with a 403; the session stays open (FR-014). */
  readonly onForbidden?: (error: ApiError) => void;
}

const QUERY_STALE_TIME_MS = 30_000;

export function createQueryClient({ onForbidden }: CreateQueryClientOptions = {}): QueryClient {
  const reportForbidden = (error: unknown): void => {
    if (error instanceof ApiError && error.status === 403) {
      onForbidden?.(error);
    }
  };

  return new QueryClient({
    queryCache: new QueryCache({ onError: reportForbidden }),
    mutationCache: new MutationCache({ onError: reportForbidden }),
    defaultOptions: {
      // `navigator.onLine` is unreliable and, by default, a call made while it says "offline" is
      // paused instead of failing: the screen would wait for ever. Always trying makes a missing
      // connection an error the person sees (constitution IV and VI).
      queries: {
        retry: shouldRetryQuery,
        retryDelay,
        staleTime: QUERY_STALE_TIME_MS,
        networkMode: 'always',
      },
      mutations: { retry: MUTATION_RETRY, networkMode: 'always' },
    },
  });
}
