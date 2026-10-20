import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { getSubscription } from '../api/subscriptionsApi';
import type { Subscription } from '../schemas/subscription';
import { subscriptionKeys } from './subscriptionKeys';

/**
 * One subscription, whatever its status. One that does not exist, or that was deleted, is the
 * error of the query (404), which is not retried.
 */
export function useSubscription(subscriptionId: number): UseQueryResult<Subscription> {
  const { subscriptions } = useHttpClients();
  return useQuery({
    queryKey: subscriptionKeys.detail(subscriptionId),
    queryFn: ({ signal }) => getSubscription(subscriptions, subscriptionId, { signal }),
  });
}
