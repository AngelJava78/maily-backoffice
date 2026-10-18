import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

import { messages } from '@/shared/messages/es';

/**
 * Tells that a user was created but some of its roles could not be assigned (FR-023), names them,
 * and offers to retry them or to leave them. The user and the roles that were assigned stay as
 * they are: nothing is undone.
 */
export function PendingRolesAlert({
  roles,
  pending,
  onRetry,
  onDismiss,
}: {
  readonly roles: readonly { readonly id: number; readonly name: string }[];
  /** The retry is running: it cannot be started again meanwhile. */
  readonly pending: boolean;
  readonly onRetry: () => void;
  readonly onDismiss: () => void;
}) {
  return (
    <Alert severity="warning">
      <AlertTitle>{messages.users.pendingRoles.title}</AlertTitle>
      {messages.users.pendingRoles.message(roles.map((role) => role.name).join(', '))}
      <Stack direction="row" useFlexGap spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" loading={pending} onClick={onRetry}>
          {messages.users.pendingRoles.retry}
        </Button>
        <Button onClick={onDismiss} disabled={pending}>
          {messages.users.pendingRoles.dismiss}
        </Button>
      </Stack>
    </Alert>
  );
}
