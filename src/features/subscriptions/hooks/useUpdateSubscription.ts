import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { updateSubscription } from '../api/subscriptionsApi';
import type { Subscription } from '../schemas/subscription';
import type { UpdateSubscriptionBody } from '../schemas/subscriptionForm';
import { isSubscriptionOutOfDate, refreshSubscription } from './refreshSubscription';
import { subscriptionKeys } from './subscriptionKeys';

export interface UpdateSubscriptionVariables {
  /** Only what changed (`toUpdateSubscriptionBody`), so the edition of another person is kept. */
  readonly body: UpdateSubscriptionBody;
}

/**
 * Changes the name, the description, the price or what a subscription includes. Without an
 * optimistic update (constitution III): the detail shows what the API confirmed. A subscription
 * that is gone is asked for again before the failure is told, so the screen shows that it does not
 * exist. It is never retried on its own.
 */
export function useUpdateSubscription(
  subscriptionId: number,
): UseMutationResult<Subscription, Error, UpdateSubscriptionVariables> {
  const { subscriptions } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body }: UpdateSubscriptionVariables) =>
      updateSubscription(subscriptions, subscriptionId, body),
    onSuccess: (subscription) => {
      queryClient.setQueryData(subscriptionKeys.detail(subscriptionId), subscription);
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.catalog(), exact: true });
    },
    // Returned, so the failure is seen together with the subscription as it is now.
    onError: (error) =>
      isSubscriptionOutOfDate(error, 'update')
        ? refreshSubscription(queryClient, subscriptionId)
        : undefined,
  });
}
