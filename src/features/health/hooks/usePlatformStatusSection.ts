import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import type { PlatformStatus } from '../schemas/publicStatus';
import type { HealthScope } from './healthKeys';
import { platformStatusQuery } from './healthQueries';

/** What the section «Estado de la plataforma» draws (data-model §11). */
export type PlatformStatusView =
  | { readonly status: 'hidden' }
  | { readonly status: 'loading' }
  | { readonly status: 'failed' }
  | { readonly status: 'empty'; readonly isRefreshing: boolean }
  | {
      readonly status: 'ready';
      readonly platform: PlatformStatus;
      /** A new query is on its way while the data is on screen. */
      readonly isRefreshing: boolean;
    };

// The error is `unknown`: TanStack Query takes its type from the `retry` of the step.
type StepQuery = Pick<UseQueryResult<PlatformStatus, unknown>, 'data' | 'isError' | 'isFetching'>;

/**
 * The step of the public status reduced to what is drawn (research D11): a pure function. A step
 * that was never asked for in this appearance (or that the cycle took away) is hidden, and a last
 * query that failed shows the failure even if there was data (decision (v) of the spec).
 */
export function toPlatformStatusView(query: StepQuery): PlatformStatusView {
  if (query.isError) {
    return { status: 'failed' };
  }
  if (query.data !== undefined) {
    return query.data.components.length === 0
      ? { status: 'empty', isRefreshing: query.isFetching }
      : { status: 'ready', platform: query.data, isRefreshing: query.isFetching };
  }
  return query.isFetching ? { status: 'loading' } : { status: 'hidden' };
}

/**
 * Watches the step of the public status of a screen with its same options (plan, «Trampa de
 * `queryOptions`»): the chain of that screen runs it, the section only draws it.
 */
export function usePlatformStatusSection(scope: HealthScope): PlatformStatusView {
  const { subscriptions } = useHttpClients();
  return toPlatformStatusView(
    useQuery({ ...platformStatusQuery(subscriptions, scope), enabled: false }),
  );
}
