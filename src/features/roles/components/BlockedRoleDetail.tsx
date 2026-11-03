import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { messages } from '@/shared/messages/es';

import { useChangeRoleStatusAction } from '../hooks/useChangeRoleStatusAction';
import type { Role } from '../schemas/role';
import { typeFilterOfRoleTypeId } from '../schemas/rolePermissionsLocation';

const text = messages.roles;

interface BlockedRoleDetailProps {
  /** The role as the list of blocked roles gave it: the service gives nothing more of it. */
  readonly role: Role;
  /** "Desbloquear role" is offered (`roles:update`, research D6). */
  readonly canUnblock: boolean;
  /** The role was unblocked (or already was active): the caller leaves this detail. */
  readonly onUnblocked: () => void;
}

/**
 * The detail of a blocked role (FR-012, FR-014; research D5): its data, that it is blocked, and why
 * its permissions are not shown — the service answers "not found" for them, for changing it and
 * for deleting it. It asks the service for nothing. "Desbloquear role" acts at once, without a
 * confirmation, since it gives the role back exactly as it was. The name of the role is the title
 * of the screen that shows this (feature 027), so there is no heading of it here.
 */
export function BlockedRoleDetail({ role, canUnblock, onUnblocked }: BlockedRoleDetailProps) {
  const unblock = useChangeRoleStatusAction(role, 'unblock', onUnblocked);

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={2}>
        {role.description !== null && role.description !== '' && (
          <Typography sx={{ overflowWrap: 'anywhere' }}>{role.description}</Typography>
        )}
        <Typography color="text.secondary">
          {text.detail.fields.type}: {text.filters.type[typeFilterOfRoleTypeId(role.type.id)]}
        </Typography>
        <Typography color="text.secondary">
          {text.blocked.statusLabel}: {text.blocked.statusValue}
        </Typography>
        <Alert severity="info">{text.blocked.explanation}</Alert>
        {canUnblock && (
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant="contained"
              disabled={unblock.pending}
              loading={unblock.pending}
              onClick={unblock.run}
            >
              {text.status.unblock}
            </Button>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
