import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { getMonitoredComponent, listMonitoredComponents } from '../api/monitoredComponentsApi';
import type { MonitoredComponent } from '../schemas/monitoredComponent';
import { healthKeys } from './healthKeys';

/**
 * The whole registry, in the order of the service (research D15). It comes without pages, so it is
 * asked for once and every page is cut from it when the list is drawn: changing the page or its
 * size does not ask again. The retries and the time limit are the common ones (research D7).
 */
export function useMonitoredComponents(): UseQueryResult<MonitoredComponent[]> {
  const { subscriptions } = useHttpClients();
  return useQuery({
    queryKey: healthKeys.componentsList(),
    queryFn: ({ signal }) => listMonitoredComponents(subscriptions, { signal }),
  });
}

/** One component. One that does not exist, or that was deleted, is the error of the query (404). */
export function useMonitoredComponent(componentId: string): UseQueryResult<MonitoredComponent> {
  const { subscriptions } = useHttpClients();
  return useQuery({
    queryKey: healthKeys.componentDetail(componentId),
    queryFn: ({ signal }) => getMonitoredComponent(subscriptions, componentId, { signal }),
  });
}
