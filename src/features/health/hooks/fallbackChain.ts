import type { QueryClient, QueryKey } from '@tanstack/react-query';

import type { HttpClients } from '@/shared/api/httpClientsContext';

import { directCheckTargets } from '../api/directCheckApi';
import { healthKeys, type HealthScope } from './healthKeys';
import { directCheckQuery, platformStatusQuery } from './healthQueries';

/** What the chain needs: the cache, the clients of the services, its screen and its signal. */
export interface FallbackChainContext {
  readonly queryClient: QueryClient;
  readonly clients: HttpClients;
  readonly scope: HealthScope;
  readonly signal: AbortSignal;
  /**
   * A step that ended (right or wrong) at this time or later is not asked again: a round of the
   * failure screen that was cut short only completes what it did not finish (research D9).
   */
  readonly settledSince?: number;
}

/** The steps of the chain of a screen, which show as its sections. */
export function fallbackStepKeys(scope: HealthScope) {
  return [healthKeys.platformStatus(scope), healthKeys.directCheck(scope)] as const;
}

/** Cancels what the chain of a screen was waiting for and takes its sections away. */
export function forgetFallbackSteps(queryClient: QueryClient, scope: HealthScope): void {
  for (const queryKey of fallbackStepKeys(scope)) {
    // Removing a query cancels what it was fetching.
    queryClient.removeQueries({ queryKey, exact: true });
  }
}

/** How a step ended since `since`, or `null` when it did not end since then. */
function endedSince(
  queryClient: QueryClient,
  queryKey: QueryKey,
  since: number | undefined,
): 'success' | 'error' | null {
  const state = queryClient.getQueryState(queryKey);
  if (since === undefined || state === undefined) {
    return null;
  }
  if (state.status === 'error' && state.errorUpdatedAt >= since) {
    return 'error';
  }
  return state.status === 'success' && state.dataUpdatedAt >= since ? 'success' : null;
}

/** Asks for a step through the cache: whether it answered. A failure is the state of the step. */
async function answers(run: () => Promise<unknown>): Promise<boolean> {
  try {
    await run();
    return true;
  } catch {
    return false;
  }
}

/**
 * The chain when the aggregator cannot be used (research D6, FR-067): the public status of
 * maily-system-api, without the token, and, when it fails too, the direct check (user story 6).
 * The public status that answers takes the direct check away: it is no longer needed (FR-070).
 * Each step goes through the cache, so its section sees it as it goes, and the chain never
 * rejects. The signal of the cycle (or of the round) cancels it.
 */
export async function runFallbackChain({
  queryClient,
  clients,
  scope,
  signal,
  settledSince,
}: FallbackChainContext): Promise<void> {
  const cancelSteps = (): void => {
    for (const queryKey of fallbackStepKeys(scope)) {
      void queryClient.cancelQueries({ queryKey, exact: true });
    }
  };
  signal.addEventListener('abort', cancelSteps, { once: true });
  try {
    const platform = endedSince(queryClient, healthKeys.platformStatus(scope), settledSince);
    const platformAnswered =
      platform === null
        ? await answers(() => queryClient.query(platformStatusQuery(clients.subscriptions, scope)))
        : platform === 'success';
    if (platformAnswered || signal.aborted) {
      if (platformAnswered) {
        queryClient.removeQueries({ queryKey: healthKeys.directCheck(scope), exact: true });
      }
      return;
    }
    // The public status failed too: the browser checks the services by itself (user story 6).
    if (endedSince(queryClient, healthKeys.directCheck(scope), settledSince) === null) {
      await answers(() => queryClient.query(directCheckQuery(directCheckTargets(clients), scope)));
    }
  } finally {
    signal.removeEventListener('abort', cancelSteps);
  }
}
