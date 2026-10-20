import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { listSubscriptions } from '../api/subscriptionsApi';
import { sortCatalog } from '../policy/catalogOrder';
import type { Subscription } from '../schemas/subscription';
import { subscriptionKeys } from './subscriptionKeys';

/**
 * The whole catalog, in the fixed order of the list (FR-015). The API returns it without pages, so
 * it is asked for once and every page is cut from it when the list is drawn: changing the page or
 * its size does not ask again.
 */
export function useSubscriptionCatalog(): UseQueryResult<readonly Subscription[]> {
  const { subscriptions } = useHttpClients();
  return useQuery({
    queryKey: subscriptionKeys.catalog(),
    queryFn: ({ signal }) => listSubscriptions(subscriptions, { signal }),
    select: sortCatalog,
  });
}
