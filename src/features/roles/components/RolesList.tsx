import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';

import { messages } from '@/shared/messages/es';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Icon } from '@/shared/ui/Icon';

import { useRolePermissionCounts } from '../hooks/useRolePermissionCounts';
import { useRolePermissionsLocation } from '../hooks/useRolePermissionsLocation';
import { useVisibleRoles } from '../hooks/useVisibleRoles';
import {
  typeFilterOfRoleTypeId,
  type RolePermissionsLocation,
} from '../schemas/rolePermissionsLocation';

const text = messages.roles;

interface RolesListProps {
  readonly canCreate: boolean;
  readonly onNewRole: () => void;
}

/** The empty message of each combination of filters (FR-018, contracts/roles-list-ui.md §3). */
function emptyMessage({ type, status }: RolePermissionsLocation): string {
  if (status === 'blocked') {
    return text.list.emptyBlocked;
  }
  if (type === 'system') {
    return text.list.emptySistema;
  }
  return type === 'clinic' ? text.list.emptyClinica : text.list.emptyAll;
}

/**
 * The roles both filters show (FR-005, FR-006): name, and type, description and — only for active
 * roles, whose permissions the service does give — the permission count. A blocked role's
 * permissions are never asked for (FR-012).
 */
export function RolesList({ canCreate, onNewRole }: RolesListProps) {
  const { location, setRoleId } = useRolePermissionsLocation();
  const { query, roles } = useVisibleRoles();
  const active = location.status === 'active';
  const counts = useRolePermissionCounts(active ? roles.map((role) => role.id) : []);

  function body() {
    if (query.isLoading) {
      return <CircularProgress aria-label={messages.common.loading} />;
    }
    if (query.isError) {
      return (
        <ErrorState
          title={messages.errors.routeTitle}
          message={messages.errors.unexpected}
          onRetry={() => {
            void query.refetch();
          }}
        />
      );
    }
    if (roles.length === 0) {
      return <EmptyState message={emptyMessage(location)} />;
    }
    return (
      <List aria-label={text.list.label}>
        {roles.map((role) => {
          const count = active ? counts.get(role.id) : undefined;
          return (
            <ListItem key={role.id} disablePadding>
              <ListItemButton
                selected={role.id === location.roleId}
                onClick={() => {
                  setRoleId(role.id);
                }}
              >
                <ListItemText
                  primary={role.name}
                  secondary={[
                    text.filters.type[typeFilterOfRoleTypeId(role.type.id)],
                    role.description,
                    count === undefined ? null : text.list.permissionsCount(count),
                  ]
                    .filter((part): part is string => part !== null && part !== '')
                    .join(' · ')}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    );
  }

  return (
    <Stack spacing={2}>
      {canCreate && (
        <Button variant="contained" startIcon={<Icon name="add" decorative />} onClick={onNewRole}>
          {text.newRole}
        </Button>
      )}
      {body()}
    </Stack>
  );
}
