import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { messages } from '@/shared/messages/es';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { useRolePermissionsLocation } from '../hooks/useRolePermissionsLocation';
import type { RoleCapabilities } from '../policy/roleCapabilities';
import { RolesList } from './RolesList';
import { RoleTypeTabs } from './RoleTypeTabs';

interface RolesPageProps {
  readonly capabilities: RoleCapabilities;
}

/**
 * Roles y permisos (feature 014): master-detail in a single screen (research D5, constitution
 * v1.5.0 Principio VI) — pestañas Clínica/Sistema, lista a la izquierda, detalle a la derecha. The
 * detail itself (`RoleDetailPanel`, Historia 1) replaces the placeholder message below it.
 */
export function RolesPage({ capabilities }: RolesPageProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { location } = useRolePermissionsLocation();

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
              // Historia 2 (T077) abre aquí el diálogo de alta.
            }}
          />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {location.roleId === null ? (
            <Typography color="text.secondary">{messages.roles.detail.emptySelection}</Typography>
          ) : (
            // Historia 1 (T067) reemplaza esto por <RoleDetailPanel roleId={location.roleId} .../>
            <Typography color="text.secondary" data-testid="role-detail-placeholder">
              {location.roleId}
            </Typography>
          )}
        </Box>
      </Stack>
    </Stack>
  );
}
