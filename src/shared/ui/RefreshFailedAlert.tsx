import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import { messages } from '@/shared/messages/es';

/**
 * What is shown above data that is still on screen when asking for it again failed. The data stays,
 * because a failed refresh does not make it wrong, only possibly out of date; the person is told,
 * and can try again. A screen that refreshes itself gives no `onRetry`: its next cycle tries again
 * (constitution VI, feature 007).
 */
export function RefreshFailedAlert({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry?: () => void;
}) {
  return (
    <Alert
      severity="warning"
      action={
        onRetry === undefined ? undefined : (
          <Button color="inherit" size="small" onClick={onRetry}>
            {messages.common.retry}
          </Button>
        )
      }
    >
      {message}
    </Alert>
  );
}
