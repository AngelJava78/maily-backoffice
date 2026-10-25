import { queryOptions } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/ApiError';
import type { HttpClient } from '@/shared/api/httpClient';
import { retryDelay, retryUpTo } from '@/shared/api/retry';

import { checkDirectTargets, type DirectCheckTarget } from '../api/directCheckApi';
import { getHealthResult, getPublicStatus } from '../api/healthApi';
import type { HealthResult } from '../schemas/healthResult';
import { healthKeys, type HealthScope } from './healthKeys';

/**
 * What the step of the aggregator keeps (data-model §8): the result, or that the service refused
 * it for lack of permission (research D8).
 */
export type HealthResultOutcome =
  { readonly kind: 'result'; readonly result: HealthResult } | { readonly kind: 'forbidden' };

/**
 * The step of the aggregator, shared by the cycle that runs it and by the screens that watch it.
 * Both use these same options: a watcher with other ones would replace the function or the
 * retries of the step that the cycle runs (plan, «Trampa de `queryOptions`»).
 */
export function healthResultQuery(subscriptions: HttpClient) {
  return queryOptions({
    queryKey: healthKeys.result(),
    // The signal cancels the request when the page is left (FR-025).
    queryFn: async ({ signal }): Promise<HealthResultOutcome> => {
      try {
        return { kind: 'result', result: await getHealthResult(subscriptions, { signal }) };
      } catch (error) {
        // A refusal for lack of permission is a result, not an error (research D8, as D6 of 007):
        // it replaces the data, stops the cycle for the visit and keeps away the global notice of
        // 403, which speaks of an action and would repeat the one of the page.
        if (error instanceof ApiError && error.status === 403) {
          return { kind: 'forbidden' };
        }
        throw error;
      }
    },
    // One retry, a second later, only for network failures, time-outs and 5xx (research D7), so
    // that a cycle stays within its time.
    retry: retryUpTo(1),
    retryDelay,
    // The cycle decides when to ask; the step always asks when the cycle runs it.
    staleTime: 0,
    // The result lives as long as the session: `queryClient.clear()` empties it when the session
    // ends, and `useForgetHealthData` when the permission is lost (research D21).
    gcTime: Infinity,
    // `navigator.onLine` is unreliable: always try, so an offline browser fails instead of waiting.
    networkMode: 'always',
  });
}

/**
 * The step of the public status of a screen (research D6, D9), shared by the chain that runs it and
 * by the section that watches it, with these same options. The two screens never share it.
 */
export function platformStatusQuery(subscriptions: HttpClient, scope: HealthScope) {
  return queryOptions({
    queryKey: healthKeys.platformStatus(scope),
    queryFn: ({ signal }) => getPublicStatus(subscriptions, { signal }),
    // One retry, a second later, only for network failures, time-outs and 5xx (research D7).
    retry: retryUpTo(1),
    retryDelay,
    // The chain decides when to ask; the step always asks when the chain runs it.
    staleTime: 0,
    // It lives while its section is on screen: the chain and the screen take it away.
    gcTime: Infinity,
    networkMode: 'always',
  });
}

/**
 * The step of the direct check of a screen (research D10): one round of probes, without retries
 * (each probe has 5 s and the round ends when all of them did), shared by the chain and the section.
 */
export function directCheckQuery(targets: readonly DirectCheckTarget[], scope: HealthScope) {
  return queryOptions({
    queryKey: healthKeys.directCheck(scope),
    queryFn: ({ signal }) => checkDirectTargets(targets, { signal }),
    retry: false,
    staleTime: 0,
    gcTime: Infinity,
    networkMode: 'always',
  });
}
