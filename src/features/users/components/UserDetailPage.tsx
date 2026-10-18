import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useNotify } from '@/shared/ui/Notifications';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { describeUserError } from '../api/userErrors';
import { useAssignRoles } from '../hooks/useAssignRoles';
import { useUser } from '../hooks/useUser';
import { getAvailableActions, type UserCapabilities } from '../policy/availableActions';
import { getFullName } from '../schemas/user';
import { parseUserDetailState } from '../schemas/userDetailState';
import { PendingRolesAlert } from './PendingRolesAlert';
import { UserDetailFields } from './UserDetailFields';
import { UserRolesPanel } from './UserRolesPanel';
import { UserStatusActions } from './UserStatusActions';

interface UserDetailPageProps {
  readonly userId: number;
  /** The id of the operator, to protect their own user (FR-012; used by the actions). */
  readonly operatorUserId: number;
  /** What the operator may do with the user (decided in `app` with the policies of `auth`). */
  readonly capabilities: UserCapabilities;
}

/**
 * The detail of a user of any status: its data, its status and, if it is active, its roles. The
 * title is on screen from the first render, while the data loads, so the focus can go to it. When
 * the user has just been created and some roles could not be assigned, it offers to retry them.
 */
export function UserDetailPage({ userId, operatorUserId, capabilities }: UserDetailPageProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotify();
  const { listSearch, rolesNotAssigned = [] } = parseUserDetailState(location.state);
  const listAddress = `/users${listSearch ?? ''}`;
  const query = useUser(userId);
  const assign = useAssignRoles(userId);

  /** What is still pending lives in the history entry, so the warning follows the roles left. */
  function keepPending(remaining: readonly { readonly id: number; readonly name: string }[]) {
    void navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: {
        ...(listSearch === undefined ? {} : { listSearch }),
        ...(remaining.length === 0 ? {} : { rolesNotAssigned: remaining }),
      },
    });
  }

  function retryPending() {
    assign.mutate(
      { roles: rolesNotAssigned },
      {
        onSuccess: ({ failed }) => {
          if (failed.length === 0) {
            notify({ severity: 'success', message: messages.users.pendingRoles.done });
          }
          keepPending(failed.map(({ role }) => ({ id: role.id, name: role.name })));
        },
      },
    );
  }

  /**
   * The way back, with the actions of the user beside it once they are known. It is the first child
   * of every state of the page, so it keeps the same element while the user loads: a link that
   * was found while loading can still be clicked when the data arrives.
   */
  function toolbar(actions?: ReactNode) {
    return (
      <Stack
        direction="row"
        useFlexGap
        sx={{ gap: 1, flexWrap: 'wrap', justifyContent: 'space-between' }}
      >
        <Button component={RouterLink} to={listAddress} startIcon={<ArrowBackIcon />}>
          {messages.users.detail.backToList}
        </Button>
        {actions}
      </Stack>
    );
  }

  function content() {
    if (query.isError && describeUserError(query.error, 'get').kind === 'notFound') {
      return (
        <ErrorState
          title={messages.users.detail.notFound.title}
          message={messages.users.detail.notFound.message}
          secondaryAction={
            <Button component={RouterLink} to="/users">
              {messages.users.detail.notFound.backToList}
            </Button>
          }
        />
      );
    }
    if (query.isError) {
      return (
        <>
          {toolbar()}
          <ErrorState
            title={messages.users.detail.loadError.title}
            message={messages.users.detail.loadError.message}
            onRetry={() => {
              void query.refetch();
            }}
          />
        </>
      );
    }
    if (query.data === undefined) {
      return (
        <>
          {toolbar()}
          <CircularProgress aria-label={messages.common.loading} />
        </>
      );
    }
    const user = query.data;
    const isSelf = user.id === operatorUserId;
    const available = getAvailableActions({ statusId: user.status.id, capabilities, isSelf });

    return (
      <>
        {toolbar(
          <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: 'wrap' }}>
            {available.has('edit') && (
              <Button
                component={RouterLink}
                to={`/users/${user.id}/edit`}
                state={listSearch === undefined ? undefined : { listSearch }}
                variant="contained"
                startIcon={<EditIcon />}
              >
                {messages.users.actions.edit}
              </Button>
            )}
            {/* Always in the page, so the notice of a change is still told when the action is gone. */}
            <UserStatusActions user={user} available={available} />
          </Stack>,
        )}
        {isSelf && <Alert severity="info">{messages.users.detail.selfNote}</Alert>}
        {rolesNotAssigned.length > 0 && (
          <PendingRolesAlert
            roles={rolesNotAssigned}
            pending={assign.isPending}
            onRetry={retryPending}
            onDismiss={() => {
              keepPending([]);
            }}
          />
        )}
        <UserDetailFields user={user} />
        <UserRolesPanel
          userId={user.id}
          userName={getFullName(user)}
          statusId={user.status.id}
          canAddRoles={available.has('addRole')}
          canRemoveRoles={available.has('removeRole')}
        />
      </>
    );
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
        {messages.users.detail.title}
      </Typography>
      {content()}
    </Stack>
  );
}
