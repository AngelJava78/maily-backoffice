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
import { useRolesCatalog } from '../hooks/useRolesCatalog';
import { ROLE_TYPE_ID_OF_TAB } from '../schemas/rolePermissionsLocation';

const text = messages.roles;

interface RolesListProps {
  readonly canCreate: boolean;
  readonly onNewRole: () => void;
}

/** The roles of the active tab (FR-003, FR-004): name, description and permission count. */
export function RolesList({ canCreate, onNewRole }: RolesListProps) {
  const { location, setRoleId } = useRolePermissionsLocation();
  const typeId = ROLE_TYPE_ID_OF_TAB[location.type];
  const query = useRolesCatalog();
  const roles = (query.data ?? []).filter((role) => role.type.id === typeId);
  const counts = useRolePermissionCounts(roles.map((role) => role.id));

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
      return (
        <EmptyState
          message={location.type === 'clinica' ? text.list.emptyClinica : text.list.emptySistema}
        />
      );
    }
    return (
      <List aria-label={text.tabs[location.type]}>
        {roles.map((role) => {
          const count = counts.get(role.id);
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
