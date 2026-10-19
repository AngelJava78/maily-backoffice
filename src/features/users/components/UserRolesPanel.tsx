import AddIcon from '@mui/icons-material/Add';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useId, useRef } from 'react';

import { messages } from '@/shared/messages/es';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { ErrorState } from '@/shared/ui/ErrorState';
import { afterDialogClosed, focusIfLost } from '@/shared/ui/focusIfLost';

import { useRoleActions } from '../hooks/useRoleActions';
import { useUserRoles } from '../hooks/useUserRoles';
import { isActiveStatus } from '../schemas/userStatus';
import { AddRoleDialog } from './AddRoleDialog';
import { RefreshFailedAlert } from './RefreshFailedAlert';

interface UserRolesPanelProps {
  readonly userId: string;
  /** The full name of the user, to name who is affected in the dialogs. */
  readonly userName: string;
  readonly statusId: number;
  /** Whether the operator may add roles to this user (decided by the detail, with the policy). */
  readonly canAddRoles: boolean;
  /** Whether the operator may take roles away from this user (decided by the detail). */
  readonly canRemoveRoles: boolean;
}

/**
 * The roles of a user, and the actions on them. The service only gives them for an active user, so
 * for any other status the panel says why they are not shown and asks nothing (FR-019). Adding
 * needs the roles the user already has, so it is offered once they are there. If asking for them
 * again fails, the ones that were shown stay, with a notice, instead of being replaced by an error.
 */
export function UserRolesPanel({
  userId,
  userName,
  statusId,
  canAddRoles,
  canRemoveRoles,
}: UserRolesPanelProps) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const active = isActiveStatus(statusId);
  const roles = useUserRoles(userId, { enabled: active });
  const actions = useRoleActions(userId);

  // When a dialog has closed: the result is told, and if the button that opened the dialog went
  // away with its role (whatever the result was) and the focus was lost, it goes to the heading of
  // the section. The dialog gives the focus back to the button whenever the button is still there.
  const afterClosing = () => {
    actions.announce();
    afterDialogClosed(() => {
      focusIfLost(headingRef.current);
    });
  };

  function content() {
    if (!active) {
      return <Alert severity="info">{messages.users.roles.unavailable}</Alert>;
    }
    if (roles.data === undefined) {
      if (roles.isError) {
        return (
          <ErrorState
            title={messages.users.roles.loadError.title}
            message={messages.users.roles.loadError.message}
            onRetry={() => {
              void roles.refetch();
            }}
          />
        );
      }
      return <CircularProgress size={28} aria-label={messages.common.loading} />;
    }
    const outOfDate = roles.isError && (
      <RefreshFailedAlert
        message={messages.users.roles.refreshError}
        onRetry={() => {
          void roles.refetch();
        }}
      />
    );
    if (roles.data.length === 0) {
      return (
        <>
          {outOfDate}
          <Typography>{messages.users.roles.none}</Typography>
        </>
      );
    }
    return (
      <>
        {outOfDate}
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {roles.data.map((role) => (
            <Stack
              component="li"
              key={role.id}
              direction="row"
              sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, py: 0.5 }}
            >
              <span>{role.name}</span>
              {canRemoveRoles && (
                <Button
                  size="small"
                  aria-label={messages.users.roles.remove(role.name)}
                  onClick={() => {
                    actions.startRemoving(role);
                  }}
                >
                  {messages.users.roles.removeLabel}
                </Button>
              )}
            </Stack>
          ))}
        </Box>
      </>
    );
  }

  return (
    <Stack component="section" aria-labelledby={headingId} spacing={1}>
      <Stack
        direction="row"
        useFlexGap
        sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}
      >
        <Typography variant="h6" component="h2" id={headingId} ref={headingRef} tabIndex={-1}>
          {messages.users.roles.title}
        </Typography>
        {canAddRoles && roles.data !== undefined && (
          <Button variant="outlined" startIcon={<AddIcon />} onClick={actions.startAdding}>
            {messages.users.roles.add}
          </Button>
        )}
      </Stack>
      {content()}
      <AddRoleDialog
        open={actions.adding}
        userName={userName}
        assignedRoleIds={(roles.data ?? []).map((role) => role.id)}
        pending={actions.addPending}
        onConfirm={actions.confirmAdd}
        onCancel={actions.cancelAdding}
        onExited={afterClosing}
      />
      {actions.removal !== null && (
        <ConfirmDialog
          open={actions.removal.open}
          title={messages.users.removeRole.title}
          message={messages.users.removeRole.body(actions.removal.role.name, userName)}
          confirmLabel={messages.users.removeRole.confirm}
          pending={actions.removePending}
          onConfirm={actions.confirmRemove}
          onCancel={actions.cancelRemoving}
          onExited={afterClosing}
        />
      )}
    </Stack>
  );
}
