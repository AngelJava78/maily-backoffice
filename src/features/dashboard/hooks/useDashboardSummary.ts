import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/ApiError';
import { useHttpClients } from '@/shared/api/httpClientsContext';
import { retryDelay, shouldRetryQuery } from '@/shared/api/retry';

import { getDashboard } from '../api/dashboardApi';
import { isRefreshDue, refreshIntervalFor } from '../policy/refreshRules';
import type { DashboardSummary } from '../schemas/dashboardSummary';
import { dashboardKeys } from './dashboardKeys';

/**
 * What the query keeps (data-model.md, «Resultado guardado en la caché»): the summary, or that the
 * service refused it for lack of permission (research D6).
 */
export type DashboardResult =
  { readonly kind: 'summary'; readonly summary: DashboardSummary } | { readonly kind: 'forbidden' };

/** What the Panel draws (data-model.md, «Estados de la pantalla»). */
export type DashboardView =
  | { readonly status: 'loading' }
  | { readonly status: 'failed' }
  | { readonly status: 'forbidden' }
  | {
      readonly status: 'ready';
      readonly summary: DashboardSummary;
      /** When the last successful refresh arrived, in milliseconds since the epoch. */
      readonly updatedAt: number;
      /** A query is on its way while the data is on screen (FR-009). */
      readonly isUpdating: boolean;
      /** The last query failed: the data is the one of `updatedAt` (FR-024). */
      readonly refreshFailed: boolean;
    };

/** Whether the service refused the summary for lack of permission. */
export function isForbiddenResult(result: DashboardResult | undefined): boolean {
  return result?.kind === 'forbidden';
}

/**
 * The state of the query, reduced to what is drawn (research D8): a pure function.
 *
 * After a failure TanStack Query stays in `error`, with the data it had, until a query works: the
 * notice of the failure stays mounted while the next cycle is on its way, so it is announced when
 * it appears and not again on every cycle (FR-034).
 */
export function toDashboardView(
  query: Pick<UseQueryResult<DashboardResult>, 'data' | 'isFetching' | 'isError' | 'dataUpdatedAt'>,
): DashboardView {
  const { data } = query;
  if (data === undefined) {
    return query.isError ? { status: 'failed' } : { status: 'loading' };
  }
  if (data.kind === 'forbidden') {
    return { status: 'forbidden' };
  }
  return {
    status: 'ready',
    summary: data.summary,
    updatedAt: query.dataUpdatedAt,
    isUpdating: query.isFetching,
    refreshFailed: query.isError,
  };
}

/** The stale time that was asked for (research D5); the rules below, not it, decide each refresh. */
const STALE_TIME_MS = 30_000;

/**
 * The summary of the platform for the Panel, asked for again every `refreshIntervalMs`. Every
 * option is written here instead of relying on the defaults of the client, because each one is a
 * rule of the spec; how each behaves was checked in the code of TanStack Query 5.104.4 (research
 * D5).
 */
export function useDashboardSummary(refreshIntervalMs: number): DashboardView {
  const { subscriptions } = useHttpClients();
  const query = useQuery({
    queryKey: dashboardKeys.summary(),
    // The signal cancels the request when the Panel is left (FR-021).
    queryFn: async ({ signal }): Promise<DashboardResult> => {
      try {
        return { kind: 'summary', summary: await getDashboard(subscriptions, { signal }) };
      } catch (error) {
        // A refusal for lack of permission is a result, not an error (research D6): it replaces
        // the summary, so the data that was on screen is discarded (FR-015), and the global notice
        // of 403, which speaks of an action and would repeat the one of the Panel, is not given.
        if (error instanceof ApiError && error.status === 403) {
          return { kind: 'forbidden' };
        }
        throw error;
      }
    },
    // Entering the Panel always asks, whatever the age of the data (FR-018); a query already on
    // its way is reused, never doubled (FR-021).
    refetchOnMount: 'always',
    // One query each interval while the Panel is open (FR-016). The timer starts again on every
    // change of the query, so it counts from the end of the last one, right or wrong (FR-020).
    // None after the service refused the permission, until the Panel is entered again (FR-015).
    refetchInterval: (query) => refreshIntervalFor(query.state.data, refreshIntervalMs),
    // With the tab hidden the timer goes on but asks nothing (FR-017).
    refetchIntervalInBackground: false,
    // Coming back to the tab asks only once the interval passed since the last summary (FR-019).
    // TanStack Query calls this on the `visibilitychange` event, never while rendering, so reading
    // the clock here keeps the render pure (constitution I).
    refetchOnWindowFocus: (query) =>
      !isForbiddenResult(query.state.data) &&
      isRefreshDue(query.state.dataUpdatedAt, Date.now(), refreshIntervalMs),
    // Only the cycle, entering and coming back to the tab ask (FR-016).
    refetchOnReconnect: false,
    staleTime: STALE_TIME_MS,
    // The summary lives as long as the session: `queryClient.clear()` empties it when the session
    // ends (FR-022). With the default of 5 minutes, someone away from the Panel for longer would
    // come back to the load instead of their data.
    gcTime: Infinity,
    // At most two retries, with a wait, only for network failures and 5xx (constitution IV).
    retry: shouldRetryQuery,
    retryDelay,
    // `navigator.onLine` is unreliable: always try, so an offline browser fails instead of waiting.
    networkMode: 'always',
  });
  return toDashboardView(query);
}
