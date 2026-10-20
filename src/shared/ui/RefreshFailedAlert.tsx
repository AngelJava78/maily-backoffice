import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import { messages } from '@/shared/messages/es';

/**
 * What is shown above data that is still on screen when asking for it again failed. The data stays,
 * because a failed refresh does not make it wrong, only possibly out of date; the person is told,
 * and can try again.
 */
export function RefreshFailedAlert({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry: () => void;
}) {
  return (
    <Alert
      severity="warning"
      action={
        <Button color="inherit" size="small" onClick={onRetry}>
          {messages.common.retry}
        </Button>
      }
    >
      {message}
    </Alert>
  );
}
