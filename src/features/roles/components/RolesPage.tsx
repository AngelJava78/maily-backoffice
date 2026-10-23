import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useBlocker } from 'react-router';

import { messages } from '@/shared/messages/es';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { useRolePermissionsLocation } from '../hooks/useRolePermissionsLocation';
import type { RoleCapabilities } from '../policy/roleCapabilities';
import { tabOfRoleTypeId } from '../schemas/rolePermissionsLocation';
import { RoleDetailPanel } from './RoleDetailPanel';
import { RoleFormDialog } from './RoleFormDialog';
import { RolesList } from './RolesList';
import { RoleTypeTabs } from './RoleTypeTabs';

interface RolesPageProps {
  readonly capabilities: RoleCapabilities;
}

const text = messages.roles.detail;

/**
 * Roles y permisos (feature 014): master-detail in a single screen (research D5, constitution
 * v1.5.0 Principio VI) — pestañas Clínica/Sistema, lista a la izquierda, detalle a la derecha.
 * Switching tabs or roles goes through the URL (`useRolePermissionsLocation`), and so does leaving
 * `/roles` to another section: while the open role has unsaved changes, `useBlocker` catches every
 * one of those as the same kind of navigation and asks before letting it discard them (FR-017,
 * edge case of spec.md), regardless of which of the three actually triggered it.
 */
export function RolesPage({ capabilities }: RolesPageProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { location, selectInType } = useRolePermissionsLocation();
  const [dirty, setDirty] = useState(false);
  const [creating, setCreating] = useState(false);
  const blocker = useBlocker(dirty);

  /** A role just created or duplicated (T077, T087): selects it, switching tabs if its type calls for it. */
  function selectRole(role: { readonly id: number; readonly type: { readonly id: 1 | 2 } }) {
    selectInType(tabOfRoleTypeId(role.type.id), role.id);
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
        {messages.roles.title}
      </Typography>
      <RoleTypeTabs />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ width: { xs: '100%', md: 320 }, flexShrink: 0 }}>
          <RolesList
            canCreate={capabilities.canCreate}
            onNewRole={() => {
              setCreating(true);
            }}
          />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {location.roleId === null ? (
            <Typography color="text.secondary">{text.emptySelection}</Typography>
          ) : (
            <RoleDetailPanel
              roleId={location.roleId}
              capabilities={capabilities}
              onDirtyChange={setDirty}
              onDuplicated={selectRole}
            />
          )}
        </Box>
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
          selectRole(role);
        }}
        onCancel={() => {
          setCreating(false);
        }}
      />
    </Stack>
  );
}
