import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { changeSubscriptionStatus } from '../api/subscriptionsApi';
import type { Subscription } from '../schemas/subscription';
import type { ChangeableStatusId } from '../schemas/subscriptionStatus';
import { isSubscriptionOutOfDate, refreshSubscription } from './refreshSubscription';
import { subscriptionKeys } from './subscriptionKeys';

export interface ChangeSubscriptionStatusVariables {
  readonly statusId: ChangeableStatusId;
}

/**
 * Changes the status of a subscription. Without an optimistic update (constitution III): the screen
 * shows the status the API confirmed, and the list moves the subscription to its group once the
 * catalog is asked for again. A refusal that says the subscription is not as the screen believes
 * (another person gave it that status, or deleted it) asks for it again before it is told. It is
 * never retried on its own.
 */
export function useChangeSubscriptionStatus(
  subscriptionId: number,
): UseMutationResult<Subscription, Error, ChangeSubscriptionStatusVariables> {
  const { subscriptions } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ statusId }: ChangeSubscriptionStatusVariables) =>
      changeSubscriptionStatus(subscriptions, subscriptionId, statusId),
    onSuccess: (subscription) => {
      queryClient.setQueryData(subscriptionKeys.detail(subscriptionId), subscription);
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.catalog(), exact: true });
    },
    // Returned, so the failure is seen together with the subscription as it is now.
    onError: (error) =>
      isSubscriptionOutOfDate(error, 'changeStatus')
        ? refreshSubscription(queryClient, subscriptionId)
        : undefined,
  });
}
