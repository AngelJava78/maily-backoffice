import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';
import { atMost, REFRESH_WAIT_MS } from '@/shared/lib/atMost';

import { deleteSubscription } from '../api/subscriptionsApi';
import { isSubscriptionOutOfDate, refreshSubscription } from './refreshSubscription';
import { subscriptionKeys } from './subscriptionKeys';

export type DeleteSubscriptionResult = UseMutationResult<void, Error, void> & {
  /**
   * Forgets the subscription once the person left its detail: before, the detail would ask for it
   * again and show that it does not exist.
   */
  readonly forget: () => void;
};

/**
 * Deletes a subscription. The mutation ends once the catalog was asked for again (or after
 * `REFRESH_WAIT_MS`), so the list it goes back to shows it gone. A refusal that says the
 * subscription is not as the screen believes (clinics were assigned to it, or another person
 * deleted it) asks for it again before it is told; one that says the clinics could not be checked
 * changes nothing. It is never retried on its own.
 */
export function useDeleteSubscription(subscriptionId: number): DeleteSubscriptionResult {
  const { subscriptions } = useHttpClients();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteSubscription(subscriptions, subscriptionId),
    onSuccess: () =>
      atMost(
        REFRESH_WAIT_MS,
        queryClient.invalidateQueries({ queryKey: subscriptionKeys.catalog(), exact: true }),
      ),
    // Returned, so the failure is seen together with the subscription as it is now.
    onError: (error) =>
      isSubscriptionOutOfDate(error, 'delete')
        ? refreshSubscription(queryClient, subscriptionId)
        : undefined,
  });

  return {
    ...mutation,
    forget: () => {
      queryClient.removeQueries({ queryKey: subscriptionKeys.detail(subscriptionId), exact: true });
    },
  };
}
