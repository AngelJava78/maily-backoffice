import { useNotify, type AppNotification } from '@/shared/ui/Notifications';

import {
  describeSubscriptionError,
  toNotification,
  type SubscriptionErrorOutcome,
  type SubscriptionOperation,
} from '../api/subscriptionErrors';

/**
 * Tells the person, in a notification, why an operation on a subscription failed, and gives back
 * the outcome so the screen can also react to it (refresh what is out of date, mark a field...). A
 * screen that shows its notices once a dialog has closed passes how to hold them (`deliver`).
 */
export function useNotifySubscriptionError(
  deliver?: (notification: AppNotification) => void,
): (error: unknown, operation: SubscriptionOperation) => SubscriptionErrorOutcome {
  const notify = useNotify();

  return (error, operation) => {
    const outcome = describeSubscriptionError(error, operation);
    const notification = toNotification(outcome);
    if (notification !== null) {
      (deliver ?? notify)(notification);
    }
    return outcome;
  };
}
