import type { QueryClient } from '@tanstack/react-query';

import { atMost, REFRESH_WAIT_MS } from '@/shared/lib/atMost';

import { describeSubscriptionError, type SubscriptionOperation } from '../api/subscriptionErrors';
import { subscriptionKeys } from './subscriptionKeys';

/**
 * Whether the API refused a change because the subscription is not as the screen believes: it was
 * deleted, another person already gave it that status, or clinics were assigned to it. What is
 * cached about it is out of date then.
 */
export function isSubscriptionOutOfDate(error: unknown, operation: SubscriptionOperation): boolean {
  const { kind } = describeSubscriptionError(error, operation);
  return kind === 'notFound' || kind === 'statusUnchanged' || kind === 'hasClinics';
}

/**
 * Marks the subscription and the catalog as stale, so the screens ask again and show what is true.
 * The promise ends when what is on screen was asked for again, or after `REFRESH_WAIT_MS`; a
 * mutation that returns it stays pending until then, so its result is seen together with the
 * subscription as it is now.
 */
export async function refreshSubscription(
  queryClient: QueryClient,
  subscriptionId: number,
): Promise<void> {
  await atMost(
    REFRESH_WAIT_MS,
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.detail(subscriptionId),
        exact: true,
      }),
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.catalog(), exact: true }),
    ]),
  );
}
