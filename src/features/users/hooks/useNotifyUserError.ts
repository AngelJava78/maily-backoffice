import { useNotify, type AppNotification } from '@/shared/ui/Notifications';

import {
  describeUserError,
  toNotification,
  type UserErrorOutcome,
  type UserOperation,
} from '../api/userErrors';

/**
 * Tells the person, in a notification, why an operation on a user failed, and gives back the
 * outcome so the screen can also react to it (refresh what is out of date, close a dialog...). A
 * screen that shows its notices once a dialog has closed passes how to hold them (`deliver`).
 */
export function useNotifyUserError(
  deliver?: (notification: AppNotification) => void,
): (error: unknown, operation: UserOperation) => UserErrorOutcome {
  const notify = useNotify();

  return (error, operation) => {
    const outcome = describeUserError(error, operation);
    const notification = toNotification(outcome);
    if (notification !== null) {
      (deliver ?? notify)(notification);
    }
    return outcome;
  };
}
