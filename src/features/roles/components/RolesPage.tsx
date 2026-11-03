import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';

import { messages } from '@/shared/messages/es';
import { Icon } from '@/shared/ui/Icon';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { useRevealRole } from '../hooks/useRevealRole';
import { useRolePermissionsLocation } from '../hooks/useRolePermissionsLocation';
import type { RoleCapabilities } from '../policy/roleCapabilities';
import type { Role } from '../schemas/role';
import {
  DEFAULT_PAGE_SIZE,
  legacyRoleIdOf,
  locationSearch,
  parseRolePermissionsSearchParams,
} from '../schemas/rolePermissionsLocation';
import { RoleFormDialog } from './RoleFormDialog';
import { RolesFilters } from './RolesFilters';
import { RolesTable } from './RolesTable';

interface RolesPageProps {
  readonly capabilities: RoleCapabilities;
}

/**
 * Roles y permisos: the table of roles, and the way in of the links from before feature 027
 * (`/roles?roleId=7`), which opened the role in the same screen and now lead to its own one
 * (FR-019). It reads that id before the table is mounted, because the table rewrites an address
 * that is not its own normal form, and would take the id away before it could be followed; an id
 * that is not valid is not followed, and the table drops it.
 */
export function RolesPage({ capabilities }: RolesPageProps) {
  const [searchParams] = useSearchParams();
  const legacyRoleId = legacyRoleIdOf(searchParams);

  if (legacyRoleId === null) {
    return <RolesScreen capabilities={capabilities} />;
  }
  // The old address had the Tipo and Estatus filters and no pages: only those travel, to come back.
  const listSearch = locationSearch({
    ...parseRolePermissionsSearchParams(searchParams),
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  return (
    <Navigate
      replace
      to={`/roles/${legacyRoleId}`}
      state={listSearch === '' ? undefined : { listSearch }}
    />
  );
}

/**
 * The screen of the table (feature 027): as wide as the screen, with the Tipo and Estatus filters
 * of feature 025 above it and «Nuevo role» beside the title, like «Crear usuario» in users. A role
 * opens in a screen of its own (`/roles/:roleId`). The state of the table lives in the address
 * (constitution III), so it can be shared, reloaded and gone back to. A role just created opens its
 * own screen at once, and the table that is gone back to shows it (FR-015, FR-017).
 */
function RolesScreen({ capabilities }: RolesPageProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const navigate = useNavigate();
  const reveal = useRevealRole();
  const { location, search, setType, setStatus, setPage, setPageSize } =
    useRolePermissionsLocation();
  const [creating, setCreating] = useState(false);

  /**
   * The entry of the table is rewritten first, to the one that shows the new role (Activos, its type
   * and its page), and the detail is pushed on top of it: «Volver al listado» and the Back button
   * both land on a table with the role in it (research D7). The rewrite is awaited because two
   * navigations in a row interrupt each other in a data router, and skipped when the table already
   * is that one.
   */
  async function openCreated(role: Role) {
    setCreating(false);
    const next = reveal(location, role);
    if (next.search !== search) {
      await navigate(`/roles${next.search}`, { replace: true });
    }
    await navigate(`/roles/${role.id}`, { state: { listSearch: next.search } });
  }

  const createAction = capabilities.canCreate ? (
    <Button
      variant="contained"
      startIcon={<Icon name="add" decorative />}
      onClick={() => {
        setCreating(true);
      }}
    >
      {messages.roles.newRole}
    </Button>
  ) : undefined;

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        useFlexGap
        spacing={2}
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
          {messages.roles.title}
        </Typography>
        {createAction}
      </Stack>
      <RolesFilters
        type={location.type}
        status={location.status}
        onTypeChange={setType}
        onStatusChange={setStatus}
      />
      <RolesTable
        type={location.type}
        status={location.status}
        page={location.page}
        pageSize={location.pageSize}
        listSearch={search}
        emptyAction={createAction}
        setPage={setPage}
        setPageSize={setPageSize}
      />
      <RoleFormDialog
        open={creating}
        onCreated={(role) => {
          void openCreated(role);
        }}
        onCancel={() => {
          setCreating(false);
        }}
      />
    </Stack>
  );
}
