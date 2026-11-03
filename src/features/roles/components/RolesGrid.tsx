import Link from '@mui/material/Link';
import { DataGrid, GridOverlay, type GridColDef } from '@mui/x-data-grid';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';

import { messages } from '@/shared/messages/es';
import { GRID_APPEARANCE_STYLES, GRID_PAGINATION_STYLES } from '@/shared/ui/dataGridStyles';
import { EmptyState } from '@/shared/ui/EmptyState';

import type { Role } from '../schemas/role';
import { PAGE_SIZE_OPTIONS, typeFilterOfRoleTypeId } from '../schemas/rolePermissionsLocation';

const text = messages.roles.list;

/** The status a blocked role has in the catalog of statuses of roles: 1 Activo, 2 Bloqueado. */
const BLOCKED_STATUS_ID = 2;

interface RolesGridProps {
  /** The roles of the page that is shown: the grid never holds more rows than one page. */
  readonly roles: readonly Role[];
  /** The total of permissions of the roles that are known; a role that is not in it shows «—». */
  readonly permissionCounts: ReadonlyMap<number, number>;
  /** The roles that answer the filters, which is what the footer counts. */
  readonly total: number;
  /** The page counted from 1, as the address writes it; the grid counts from 0. */
  readonly page: number;
  readonly pageSize: number;
  readonly loading: boolean;
  /** The search of the table (`?type=sistema&page=2`), carried to the detail to come back to it. */
  readonly listSearch: string;
  /** What the grid says when no role answers the filters (FR-009). */
  readonly emptyMessage: string;
  /** What the grid offers when there are no roles, such as creating one. */
  readonly emptyAction?: ReactNode;
  readonly onPaginationChange: (page: number, pageSize: number) => void;
}

function NoRowsOverlay({
  message = text.emptyAll,
  action,
}: {
  readonly message?: string;
  readonly action?: ReactNode;
}) {
  return (
    <GridOverlay>
      <EmptyState message={message} action={action} />
    </GridOverlay>
  );
}

/**
 * The table of roles, the same as the one of users (feature 027, research D4 and D10). The
 * pagination is done on the screen over the whole list the service gives, but the grid is told like
 * the one of users: it only gets the rows of one page and how many there are in total, so it never
 * holds more rows than that page. The service gives the order (by name), so it neither sorts nor
 * filters. The name is a link to the detail, which is how the keyboard and the screen readers get
 * there; the rest of the row is not.
 */
export function RolesGrid({
  roles,
  permissionCounts,
  total,
  page,
  pageSize,
  loading,
  listSearch,
  emptyMessage,
  emptyAction,
  onPaginationChange,
}: RolesGridProps) {
  const columns: GridColDef<Role>[] = [
    {
      field: 'name',
      headerName: text.columns.name,
      flex: 1,
      minWidth: 200,
      renderCell: ({ row }) => (
        <Link component={RouterLink} to={`/roles/${row.id}`} state={{ listSearch }}>
          {row.name}
        </Link>
      ),
    },
    {
      field: 'status',
      headerName: text.columns.status,
      minWidth: 130,
      valueGetter: (_value, role) =>
        role.status.id === BLOCKED_STATUS_ID ? text.status.blocked : text.status.active,
    },
    {
      field: 'type',
      headerName: text.columns.type,
      minWidth: 130,
      valueGetter: (_value, role) =>
        messages.roles.filters.type[typeFilterOfRoleTypeId(role.type.id)],
    },
    {
      field: 'permissions',
      headerName: text.columns.permissions,
      minWidth: 150,
      // A blocked role, one whose total is still loading and one whose request failed are not in the map.
      valueGetter: (_value, role) => {
        const count = permissionCounts.get(role.id);
        return count === undefined ? text.noValue : text.permissionsCount(count);
      },
    },
  ];

  return (
    <DataGrid
      aria-label={text.gridLabel}
      rows={roles}
      columns={columns}
      rowCount={total}
      loading={loading}
      paginationMode="server"
      paginationModel={{ page: page - 1, pageSize }}
      onPaginationModelChange={(model) => {
        onPaginationChange(model.page + 1, model.pageSize);
      }}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      disableColumnSorting
      disableColumnFilter
      disableColumnMenu
      disableRowSelectionOnClick
      autoHeight
      sx={GRID_APPEARANCE_STYLES}
      slots={{ noRowsOverlay: NoRowsOverlay }}
      slotProps={{
        noRowsOverlay: { message: emptyMessage, action: emptyAction },
        // 'Filas por página' stays on a phone: see GRID_PAGINATION_STYLES.
        basePagination: { material: { sx: GRID_PAGINATION_STYLES } },
      }}
    />
  );
}
