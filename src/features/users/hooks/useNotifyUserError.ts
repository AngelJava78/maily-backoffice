import { useCallback } from 'react';

import { useNotify } from '@/shared/ui/Notifications';

import {
  describeUserError,
  toNotification,
  type UserErrorOutcome,
  type UserOperation,
} from '../api/userErrors';

/**
 * Tells the person, in a notification, why an operation on a user failed, and gives back the
 * outcome so the screen can also react to it (refresh what is out of date, close a dialog...).
 */
export function useNotifyUserError(): (
  error: unknown,
  operation: UserOperation,
) => UserErrorOutcome {
  const notify = useNotify();

  return useCallback(
    (error, operation) => {
      const outcome = describeUserError(error, operation);
      const notification = toNotification(outcome);
      if (notification !== null) {
        notify(notification);
      }
      return outcome;
    },
    [notify],
  );
}
