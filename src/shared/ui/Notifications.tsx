import Alert, { type AlertColor } from '@mui/material/Alert';
import Snackbar, { type SnackbarCloseReason } from '@mui/material/Snackbar';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface Notification {
  readonly severity: AlertColor;
  readonly message: string;
}

/** What `notify` takes; named apart from the `Notification` of the browser. */
export type { Notification as AppNotification };

type Notify = (notification: Notification) => void;

interface ShownNotification extends Notification {
  readonly id: number;
}

const AUTO_HIDE_MS = 6_000;

const NotifyContext = createContext<Notify | null>(null);

/**
 * Shows one notification at a time at the bottom of the screen; a new one replaces the previous.
 * Errors and warnings stay until dismissed, so they can be read without a time limit.
 */
export function NotificationsProvider({ children }: { readonly children: ReactNode }) {
  const [shown, setShown] = useState<ShownNotification | null>(null);
  const [open, setOpen] = useState(false);
  const lastId = useRef(0);

  const notify = useCallback<Notify>((notification) => {
    lastId.current += 1;
    setShown({ ...notification, id: lastId.current });
    setOpen(true);
  }, []);

  const handleClose = (_event?: unknown, reason?: SnackbarCloseReason): void => {
    if (reason !== 'clickaway') {
      setOpen(false);
    }
  };

  const staysUntilDismissed = shown?.severity === 'error' || shown?.severity === 'warning';

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      {shown !== null && (
        <Snackbar
          key={shown.id}
          open={open}
          onClose={handleClose}
          autoHideDuration={staysUntilDismissed ? null : AUTO_HIDE_MS}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          slotProps={{
            transition: {
              onExited: () => {
                setShown(null);
              },
            },
          }}
        >
          <Alert severity={shown.severity} variant="filled" onClose={handleClose}>
            {shown.message}
          </Alert>
        </Snackbar>
      )}
    </NotifyContext.Provider>
  );
}

/** Returns `notify`, whose identity never changes, to show a message to the person. */
export function useNotify(): Notify {
  const notify = useContext(NotifyContext);
  if (notify === null) {
    throw new Error('useNotify must be used inside NotificationsProvider');
  }
  return notify;
}
