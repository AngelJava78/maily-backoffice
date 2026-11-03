import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router';

import { messages } from '@/shared/messages/es';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { useRolePermissionsLocation } from '../hooks/useRolePermissionsLocation';
import { useVisibleRoles } from '../hooks/useVisibleRoles';
import type { RoleCapabilities } from '../policy/roleCapabilities';
import { detailOf, toRolePermissionsSearchParams } from '../schemas/rolePermissionsLocation';
import { BlockedRoleDetail } from './BlockedRoleDetail';
import { RoleDetailPanel } from './RoleDetailPanel';
import { RoleFormDialog } from './RoleFormDialog';
import { RolesFilters } from './RolesFilters';
import { RolesList } from './RolesList';

interface RolesPageProps {
  readonly capabilities: RoleCapabilities;
}

const text = messages.roles.detail;

/**
 * Roles y permisos (feature 014): master-detail in a single screen (constitution v1.7.1 Principio
 * VI) — the Tipo and Estatus filters (feature 025), the list on the left, the detail on the right.
 * Changing a filter or a role goes through the URL (`useRolePermissionsLocation`), and so does
 * leaving `/roles` to another section: while the open role has unsaved changes, `useBlocker`
 * catches every one of those as the same kind of navigation and asks before letting it discard
 * them (FR-017 of 014, FR-007), regardless of which one actually triggered it.
 */
export function RolesPage({ capabilities }: RolesPageProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { location, setType, setStatus, setRoleId, selectCreated } = useRolePermissionsLocation();
  const { query, roles } = useVisibleRoles();
  const [dirty, setDirty] = useState(false);
  const [creating, setCreating] = useState(false);

  // The address that last showed its role (research D4), adjusted while rendering — React's pattern
  // for state derived from a change — so a role that disappears while open keeps its "not found",
  // and one the filters never showed is not opened (FR-011).
  const address = toRolePermissionsSearchParams(location).toString();
  const [lastShownAddress, setLastShownAddress] = useState<string | null>(null);
  if (roles.some((role) => role.id === location.roleId) && address !== lastShownAddress) {
    setLastShownAddress(address);
  }
  const detail = detailOf({
    location,
    isLoading: query.isLoading,
    visibleRoles: roles,
    lastShownRoleId: lastShownAddress === address ? location.roleId : null,
  });
  // Only an open active detail can have unsaved changes: what it last reported does not outlive it.
  const blocker = useBlocker(dirty && detail.kind === 'active');

  // Research D7: after blocking or unblocking, the detail (and the button that was pressed) goes
  // away, so the focus goes to the title. This runs after the commit that unmounts the detail —
  // after MUI's own attempt to give the focus back to that button — so it is the last to move it.
  const focusTitleNext = useRef(false);
  useEffect(() => {
    if (focusTitleNext.current) {
      focusTitleNext.current = false;
      headingRef.current?.focus();
    }
  });

  function closeAfterStatusChange() {
    focusTitleNext.current = true;
    setRoleId(null);
  }

  function body() {
    switch (detail.kind) {
      case 'none':
        return <Typography color="text.secondary">{text.emptySelection}</Typography>;
      case 'loading':
        return <CircularProgress aria-label={messages.common.loading} />;
      case 'blocked':
        return (
          <BlockedRoleDetail
            role={detail.role}
            canUnblock={capabilities.canEdit}
            onUnblocked={closeAfterStatusChange}
          />
        );
      case 'active':
        return (
          <RoleDetailPanel
            roleId={detail.roleId}
            capabilities={capabilities}
            onDirtyChange={setDirty}
            onDuplicated={selectCreated}
            onBlocked={closeAfterStatusChange}
          />
        );
    }
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
        {messages.roles.title}
      </Typography>
      <RolesFilters
        type={location.type}
        status={location.status}
        onTypeChange={setType}
        onStatusChange={setStatus}
      />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ width: { xs: '100%', md: 320 }, flexShrink: 0 }}>
          <RolesList
            canCreate={capabilities.canCreate}
            onNewRole={() => {
              setCreating(true);
            }}
          />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0, width: { xs: '100%', md: 'auto' } }}>{body()}</Box>
      </Stack>
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
      <RoleFormDialog
        open={creating}
        onCreated={(role) => {
          setCreating(false);
          selectCreated(role);
        }}
        onCancel={() => {
          setCreating(false);
        }}
      />
    </Stack>
  );
}
