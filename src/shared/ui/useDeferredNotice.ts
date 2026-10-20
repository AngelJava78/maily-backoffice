import { useCallback, useEffect, useRef } from 'react';

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
 * one written then is not announced, and one written once the dialog is gone is. A dialog that goes
 * away together with the component that opened it never finishes closing, so what it held is told
 * when that component goes.
 */
export function useDeferredNotice(): DeferredNotice {
  const notify = useNotify();
  const held = useRef<AppNotification | null>(null);

  const flush = useCallback(() => {
    const notification = held.current;
    held.current = null;
    if (notification !== null) {
      notify(notification);
    }
  }, [notify]);

  // `notify` never changes, so this runs when the component goes away.
  useEffect(() => flush, [flush]);

  const defer = useCallback((notification: AppNotification) => {
    held.current = notification;
  }, []);

  return { defer, flush };
}
