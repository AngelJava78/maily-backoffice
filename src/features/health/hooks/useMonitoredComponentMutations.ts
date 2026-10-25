import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';

import { ApiError } from '@/shared/api/ApiError';
import { useHttpClients } from '@/shared/api/httpClientsContext';
import { MUTATION_RETRY } from '@/shared/api/retry';
import { atMost, REFRESH_WAIT_MS } from '@/shared/lib/atMost';

import {
  createMonitoredComponent,
  deleteMonitoredComponent,
  updateMonitoredComponent,
} from '../api/monitoredComponentsApi';
import type { CreateComponentPayload, UpdateComponentPayload } from '../schemas/componentForm';
import type { MonitoredComponent } from '../schemas/monitoredComponent';
import { healthKeys } from './healthKeys';

// The matrix of data-model §8: a creation makes the list stale; an edition keeps the detail with
// what the service confirmed and makes the list stale; a deletion forgets the detail and makes the
// list stale. The result of the aggregator is never touched: the page asks when it is entered
// (FR-042). None of them is retried on its own (constitution IV): a lost answer may have done it.

/** The list asked for again, waiting for it at most `REFRESH_WAIT_MS`, so the screen shows what is true. */
function refreshList(queryClient: QueryClient): Promise<void> {
  return atMost(
    REFRESH_WAIT_MS,
    queryClient.invalidateQueries({ queryKey: healthKeys.componentsList(), exact: true }),
  );
}

/** A component that does not exist any more: its detail is forgotten and the list asked again. */
function forgetWhenGone(queryClient: QueryClient, componentId: string, error: unknown) {
  if (error instanceof ApiError && error.status === 404) {
    queryClient.removeQueries({ queryKey: healthKeys.componentDetail(componentId), exact: true });
    return refreshList(queryClient);
  }
  return undefined;
}

/** Registers a component (R3). */
export function useCreateMonitoredComponent(): UseMutationResult<
  MonitoredComponent,
  Error,
  CreateComponentPayload
> {
  const { subscriptions } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateComponentPayload) =>
      createMonitoredComponent(subscriptions, payload),
    onSuccess: (component) => {
      queryClient.setQueryData(healthKeys.componentDetail(component.id), component);
      return refreshList(queryClient);
    },
    retry: MUTATION_RETRY,
  });
}

/** Changes what the edition changed of a component (R4), only that. */
export function useUpdateMonitoredComponent(
  componentId: string,
): UseMutationResult<MonitoredComponent, Error, UpdateComponentPayload> {
  const { subscriptions } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateComponentPayload) =>
      updateMonitoredComponent(subscriptions, componentId, payload),
    onSuccess: (component) => {
      queryClient.setQueryData(healthKeys.componentDetail(componentId), component);
      return refreshList(queryClient);
    },
    // Returned, so the failure is seen together with the list as it is now.
    onError: (error) => forgetWhenGone(queryClient, componentId, error),
    retry: MUTATION_RETRY,
  });
}

/** Deletes a component (R5): it stops being monitored and its code is free again. */
export function useDeleteMonitoredComponent(
  componentId: string,
): UseMutationResult<void, Error, void> {
  const { subscriptions } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteMonitoredComponent(subscriptions, componentId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: healthKeys.componentDetail(componentId), exact: true });
      return refreshList(queryClient);
    },
    onError: (error) => forgetWhenGone(queryClient, componentId, error),
    retry: MUTATION_RETRY,
  });
}
