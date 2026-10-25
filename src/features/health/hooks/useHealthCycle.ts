import {
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useEffect } from 'react';

import { ApiError, SessionExpiredError } from '@/shared/api/ApiError';
import { useHttpClients, type HttpClients } from '@/shared/api/httpClientsContext';

import { isRefreshDue, startsFallbackChain } from '../policy/refreshRules';
import type { HealthResult } from '../schemas/healthResult';
import { forgetFallbackSteps, runFallbackChain } from './fallbackChain';
import { healthKeys } from './healthKeys';
import { healthResultQuery, type HealthResultOutcome } from './healthQueries';

/** How a cycle ended (data-model §8): it did its steps, or the service refused the permission. */
export type CycleOutcome = { readonly kind: 'done' } | { readonly kind: 'forbidden' };

/** What «Salud de servicios» draws (data-model §10). */
export type HealthPageView =
  | { readonly status: 'loading' }
  | {
      readonly status: 'failed';
      /** The 503 of a permission that could not be checked: the page adds its possible cause. */
      readonly authorizationUnavailable: boolean;
    }
  | { readonly status: 'forbidden' }
  | {
      readonly status: 'ready';
      readonly result: HealthResult;
      /** When the last correct answer arrived, in milliseconds since the epoch (FR-027). */
      readonly updatedAt: number;
      /** The aggregator is being asked while its data is on screen. */
      readonly isUpdating: boolean;
      /** The last query failed: the data is the one of `updatedAt` (FR-030). */
      readonly refreshFailed: boolean;
      readonly authorizationUnavailable: boolean;
    };

export interface HealthCycle {
  readonly view: HealthPageView;
  /** «Actualizar» and «Reintentar»: a cycle now, or the one on its way (FR-025, FR-026). */
  readonly refresh: () => void;
}

// The error is `unknown`: TanStack Query takes its type from the `retry` of the step.
type ResultQuery = Pick<
  UseQueryResult<HealthResultOutcome, unknown>,
  'data' | 'error' | 'isError' | 'isFetching' | 'dataUpdatedAt'
>;
type CycleQuery = Pick<UseQueryResult<CycleOutcome>, 'isFetching'>;

function isAuthorizationUnavailable(error: unknown): boolean {
  return error instanceof ApiError && error.status === 503;
}

/**
 * The step of the aggregator and the cycle, reduced to what is drawn (research D11): a pure
 * function. A failure shows as soon as the aggregator fails, while the cycle goes on (US6-8), and a
 * refusal of a former visit shows the load while the permission is asked for again.
 */
export function toHealthPageView(result: ResultQuery, cycle: CycleQuery): HealthPageView {
  const { data } = result;
  const authorizationUnavailable = isAuthorizationUnavailable(result.error);
  if (data?.kind === 'result') {
    return {
      status: 'ready',
      result: data.result,
      updatedAt: result.dataUpdatedAt,
      isUpdating: result.isFetching,
      refreshFailed: result.isError,
      authorizationUnavailable,
    };
  }
  if (result.isFetching) {
    return { status: 'loading' };
  }
  if (result.isError) {
    return { status: 'failed', authorizationUnavailable };
  }
  if (cycle.isFetching || data === undefined) {
    return { status: 'loading' };
  }
  return { status: 'forbidden' };
}

/**
 * One cycle (data-model §9): the aggregator and, when it fails for lack of an answer, a broken
 * contract or a 5xx, the chain of the page in the same cycle (FR-067), each step through the cache
 * so that the screens see it as it goes. The aggregator that answers, or refuses the permission,
 * or another 4xx, takes the sections away. It never rejects but with `SessionExpiredError`, which
 * the session handling of feature 001 takes over (FR-033); any other failure is the state of its
 * step.
 */
async function runHealthCycle(
  queryClient: QueryClient,
  clients: HttpClients,
  signal: AbortSignal,
): Promise<CycleOutcome> {
  // Leaving the page aborts the cycle, and what it was waiting for goes with it (FR-025).
  const cancelSteps = (): void => {
    void queryClient.cancelQueries({ queryKey: healthKeys.result() });
  };
  signal.addEventListener('abort', cancelSteps, { once: true });
  try {
    const outcome = await queryClient.query(healthResultQuery(clients.subscriptions));
    forgetFallbackSteps(queryClient, 'page');
    return outcome.kind === 'forbidden' ? { kind: 'forbidden' } : { kind: 'done' };
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      throw error;
    }
    if (signal.aborted) {
      return { kind: 'done' };
    }
    if (startsFallbackChain(error)) {
      await runFallbackChain({ queryClient, clients, scope: 'page', signal });
    } else {
      forgetFallbackSteps(queryClient, 'page');
    }
    return { kind: 'done' };
  } finally {
    signal.removeEventListener('abort', cancelSteps);
  }
}

/** Whether the last cycle ended with the refusal of the permission: nothing more in the visit. */
function isForbidden(outcome: CycleOutcome | undefined): boolean {
  return outcome?.kind === 'forbidden';
}

/**
 * The cycle of «Salud de servicios» (research D6), every `refreshMs` while the page is open: a
 * query that stands for the whole cycle, which runs the step of the aggregator, and a watcher of
 * that step with its same options. Every option of the cycle is written here, because each one is
 * a rule of the spec; how each behaves was checked in the code of TanStack Query 5.104.4.
 */
export function useHealthCycle(refreshMs: number): HealthCycle {
  const queryClient = useQueryClient();
  const clients = useHttpClients();
  const result = useQuery({ ...healthResultQuery(clients.subscriptions), enabled: false });
  const cycle = useQuery({
    queryKey: healthKeys.cycle(),
    queryFn: ({ signal }) => runHealthCycle(queryClient, clients, signal),
    // Entering the page always runs a cycle, whatever the age of the data (FR-022); one already on
    // its way is reused, never doubled (FR-025).
    refetchOnMount: 'always',
    // One cycle each interval while the page is open (FR-020). The timer starts again on every
    // change of the cycle, and the cycle changes when its last step ends, so it counts from there,
    // right or wrong (FR-024). None after the service refused the permission, until the page is
    // entered again (FR-031).
    refetchInterval: (query) => (isForbidden(query.state.data) ? false : refreshMs),
    // With the tab hidden the timer goes on but runs nothing (FR-021).
    refetchIntervalInBackground: false,
    // Coming back to the tab runs a cycle only once the interval passed since the last correct
    // answer, or when there was none (FR-023). TanStack Query calls this on the `visibilitychange`
    // event, never while rendering, so reading the clock here keeps the render pure (constitution I).
    refetchOnWindowFocus: (query) =>
      !isForbidden(query.state.data) &&
      isRefreshDue(
        queryClient.getQueryState(healthKeys.result())?.dataUpdatedAt ?? 0,
        Date.now(),
        refreshMs,
      ),
    // Only the interval, entering and coming back to the tab run a cycle (FR-020).
    refetchOnReconnect: false,
    // The retries belong to each step (research D7), not to the cycle.
    retry: false,
    networkMode: 'always',
  });

  // Leaving the page cancels the steps of its chain and takes its sections away, so that each
  // appearance starts in load (FR-064, FR-070).
  useEffect(
    () => () => {
      forgetFallbackSteps(queryClient, 'page');
    },
    [queryClient],
  );

  return {
    view: toHealthPageView(result, cycle),
    refresh: () => {
      void cycle.refetch({ cancelRefetch: false });
    },
  };
}
