import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { listSubscriptions } from '../api/subscriptionsApi';
import type { Subscription } from '../schemas/subscription';
import { subscriptionKeys } from './subscriptionKeys';

/**
 * The whole catalog, in the order the API gives it (by creation). The API returns it without
 * pages, so it is asked for once and every page is cut from it when the list is drawn: changing
 * the page or its size does not ask again. The Listado and the Comparativo each put it in their
 * own order before showing it (020, research D2/D3): by the column the operator chose in the
 * Listado, and by the price of the vigente cycle in the Comparativo.
 */
export function useSubscriptionCatalog(): UseQueryResult<readonly Subscription[]> {
  const { subscriptions } = useHttpClients();
  return useQuery({
    queryKey: subscriptionKeys.catalog(),
    queryFn: ({ signal }) => listSubscriptions(subscriptions, { signal }),
  });
}
