import { useRef } from 'react';

import { useNotify, type AppNotification } from './Notifications';

interface DeferredNotice {
  /** Keeps the notification until `flush`; a later one replaces it. */
  readonly defer: (notification: AppNotification) => void;
  /** Shows what was kept, if anything. It is what a dialog calls when it has finished closing. */
  readonly flush: () => void;
}

/**
 * Holds a notification until a dialog has finished closing. While a dialog is open, and while it
 * fades out, MUI hides the rest of the page from assistive technologies, notifications included:
 * one written then is not announced, and one written once the dialog is gone is.
 */
export function useDeferredNotice(): DeferredNotice {
  const notify = useNotify();
  const held = useRef<AppNotification | null>(null);

  return {
    defer: (notification) => {
      held.current = notification;
    },
    flush: () => {
      const notification = held.current;
      held.current = null;
      if (notification !== null) {
        notify(notification);
      }
    },
  };
}
