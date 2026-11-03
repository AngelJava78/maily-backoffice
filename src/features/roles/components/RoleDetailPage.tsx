import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useRef, useState } from 'react';
import { Link as RouterLink, useBlocker, useLocation, useNavigate } from 'react-router';

import { messages } from '@/shared/messages/es';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Icon } from '@/shared/ui/Icon';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { useRevealRole } from '../hooks/useRevealRole';
import { useRoleView } from '../hooks/useRoleView';
import type { RoleCapabilities } from '../policy/roleCapabilities';
import type { Role } from '../schemas/role';
import { parseRoleDetailState } from '../schemas/roleDetailState';
import { parseRolePermissionsSearchParams } from '../schemas/rolePermissionsLocation';
import { BlockedRoleDetail } from './BlockedRoleDetail';
import { RoleDetailPanel } from './RoleDetailPanel';

const text = messages.roles.detail;

interface RoleDetailPageProps {
  readonly roleId: number;
  /** What the operator may do with roles (decided in `app` with the policies of `auth`). */
  readonly capabilities: RoleCapabilities;
}

/**
 * The screen of the detail of a role (feature 027, research D2 and D5): the role of the address,
 * with its title on screen from the first render, while the lists load, so the focus can go to it.
 * An active role has its panel (data, permissions and actions, as in features 023 and 025); a
 * blocked one, its own detail; one that does not exist, a message with the way back. «Volver al
 * listado» goes back to the table the person came from, with its filters, page and page size
 * (research D6), and is the first child of every state but the missing one, so it keeps the same
 * element while the role loads. Blocking, unblocking or deleting the role leaves this screen for
 * the table, replacing its entry in the history so that going back never lands on a role that is
 * no longer where it was (research D8). Duplicating it opens the copy in a new entry, so Back
 * returns to the original, and its way back is the table that shows the copy (research D7). While
 * the panel of an active role has changes that are not saved, every way out of this screen asks
 * before it discards them (FR-020, research D9): the link, the Back button, the main menu and the
 * copy; deleting the role is the exception, since the confirmation of deleting already warned.
 */
export function RoleDetailPage({ roleId, capabilities }: RoleDetailPageProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const location = useLocation();
  const navigate = useNavigate();
  const reveal = useRevealRole();
  const { listSearch } = parseRoleDetailState(location.state);
  const listAddress = `/roles${listSearch ?? ''}`;
  const { view, retry } = useRoleView(roleId);
  const [dirty, setDirty] = useState(false);
  // Raised by the deletion just before it leaves, and read when the navigation happens (never while
  // rendering): the changes of a role that is gone are not worth asking about.
  const leavingAfterDelete = useRef(false);
  // Only the panel of an active role can have changes to lose: what it last reported does not
  // outlive it, so a role that was blocked or deleted from elsewhere is not asked about either.
  const blocker = useBlocker(() => dirty && view.kind === 'active' && !leavingAfterDelete.current);

  // `flushSync`: the role has just left the list it was in (blocked, unblocked or deleted), and
  // the lists refresh before this runs. Without it the router commits its new page after React has
  // already painted the screen for a role that «ya no existe», a message that flashes for a moment.
  function leaveForTheTable() {
    void navigate(listAddress, { replace: true, flushSync: true });
  }

  function leaveAfterDelete() {
    leavingAfterDelete.current = true;
    leaveForTheTable();
  }

  function openCopy(copy: Role) {
    const table = parseRolePermissionsSearchParams(new URLSearchParams(listSearch ?? ''));
    void navigate(`/roles/${copy.id}`, { state: { listSearch: reveal(table, copy).search } });
  }

  function content() {
    switch (view.kind) {
      case 'loading':
        return <CircularProgress aria-label={messages.common.loading} />;
      case 'error':
        return (
          <ErrorState
            title={text.loadError.title}
            message={text.loadError.message}
            onRetry={retry}
          />
        );
      case 'active':
        return (
          <RoleDetailPanel
            roleId={roleId}
            capabilities={capabilities}
            onDirtyChange={setDirty}
            onDuplicated={openCopy}
            onBlocked={leaveForTheTable}
            onDeleted={leaveAfterDelete}
          />
        );
      case 'blocked':
        return (
          <BlockedRoleDetail
            role={view.role}
            canUnblock={capabilities.canEdit}
            onUnblocked={leaveForTheTable}
          />
        );
      case 'notFound':
        return (
          <ErrorState
            title={text.notFound.title}
            message={text.notFound.message}
            secondaryAction={
              <Button component={RouterLink} to="/roles">
                {text.backToList}
              </Button>
            }
          />
        );
    }
  }

  const named = view.kind === 'active' || view.kind === 'blocked';

  return (
    <Stack spacing={3}>
      <Typography
        variant="h4"
        component="h1"
        ref={headingRef}
        tabIndex={-1}
        sx={{ overflowWrap: 'anywhere' }}
      >
        {named ? view.role.name : text.title}
      </Typography>
      {view.kind !== 'notFound' && (
        <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Button
            component={RouterLink}
            to={listAddress}
            startIcon={<Icon name="arrow-back" decorative />}
          >
            {text.backToList}
          </Button>
        </Stack>
      )}
      {content()}
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title={text.unsavedChangesTitle}
        message={text.unsavedChangesBody}
        confirmLabel={text.unsavedChangesDiscard}
        cancelLabel={text.unsavedChangesStay}
        onConfirm={() => {
          if (blocker.state === 'blocked') {
            blocker.proceed();
          }
        }}
        onCancel={() => {
          if (blocker.state === 'blocked') {
            blocker.reset();
          }
        }}
      />
    </Stack>
  );
}
