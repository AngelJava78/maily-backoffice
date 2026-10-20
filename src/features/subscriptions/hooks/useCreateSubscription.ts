import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';
import { atMost, REFRESH_WAIT_MS } from '@/shared/lib/atMost';

import { createSubscription } from '../api/subscriptionsApi';
import type { Subscription } from '../schemas/subscription';
import { toCreateSubscriptionBody, type SubscriptionFormValues } from '../schemas/subscriptionForm';
import { subscriptionKeys } from './subscriptionKeys';

export interface CreateSubscriptionVariables {
  readonly values: SubscriptionFormValues;
}

/**
 * Creates a subscription with the data of the form. The detail is kept with what the API returned,
 * so it opens without asking again, and the catalog is stale; the mutation ends once the catalog
 * was asked for again (or after `REFRESH_WAIT_MS`). It is never retried on its own (constitution
 * IV): a lost answer may have created it, and the next attempt is told that the name is in use.
 */
export function useCreateSubscription(): UseMutationResult<
  Subscription,
  Error,
  CreateSubscriptionVariables
> {
  const { subscriptions } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ values }: CreateSubscriptionVariables) =>
      createSubscription(subscriptions, toCreateSubscriptionBody(values)),
    onSuccess: (subscription) => {
      queryClient.setQueryData(subscriptionKeys.detail(subscription.id), subscription);
      return atMost(
        REFRESH_WAIT_MS,
        queryClient.invalidateQueries({ queryKey: subscriptionKeys.catalog(), exact: true }),
      );
    },
  });
}
