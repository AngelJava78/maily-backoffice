import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { fallbackStepKeys, forgetFallbackSteps, runFallbackChain } from './fallbackChain';
import { healthKeys } from './healthKeys';

/**
 * The chain of «No se pudo comprobar el acceso» (research D9, data-model §12), once per `round`:
 * the round 0 when the screen appears and a new one after each «Reintentar» that fails again. It
 * never runs while the access is being checked (`paused`, FR-065): that cancels what was on its
 * way, which is completed when the check fails again, without asking again what already ended in
 * the round (FR-071). The time, the tab and the checks nobody asked for never start a round
 * (SC-015, SC-021). Leaving the screen cancels everything and takes the sections away.
 */
export function useAccessCheckFallback({
  round,
  paused,
}: {
  readonly round: number;
  readonly paused: boolean;
}): void {
  const queryClient = useQueryClient();
  const clients = useHttpClients();
  // When each round started, so a round that was cut short only asks for what it did not finish.
  const startedAt = useRef(new Map<number, number>());

  useQuery({
    queryKey: healthKeys.accessChain(round),
    queryFn: async ({ signal }) => {
      const since = startedAt.current.get(round) ?? Date.now();
      startedAt.current.set(round, since);
      await runFallbackChain({
        queryClient,
        clients,
        scope: 'access',
        signal,
        settledSince: since,
      });
      return 'done' as const;
    },
    enabled: !paused,
    // A round that ended never runs again: only a new round asks again.
    staleTime: Infinity,
    gcTime: 0,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    networkMode: 'always',
  });

  // Checking the access again pauses the chain: what is on its way is cancelled (FR-065).
  useEffect(() => {
    if (paused) {
      void queryClient.cancelQueries({ queryKey: healthKeys.accessChain(round), exact: true });
      for (const queryKey of fallbackStepKeys('access')) {
        void queryClient.cancelQueries({ queryKey, exact: true });
      }
    }
  }, [paused, round, queryClient]);

  // Leaving the screen, the chain goes with it and each appearance starts again in load (FR-064).
  useEffect(
    () => () => {
      void queryClient.cancelQueries({ queryKey: [...healthKeys.all, 'access-chain'] });
      forgetFallbackSteps(queryClient, 'access');
    },
    [queryClient],
  );
}
