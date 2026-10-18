import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataGrid, GridOverlay, type GridColDef } from '@mui/x-data-grid';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';

import { getFullName, type PlatformUser } from '../schemas/user';
import { PAGE_SIZE_OPTIONS } from '../schemas/usersLocation';

interface UsersGridProps {
  readonly users: readonly PlatformUser[];
  /** Active users in total, which the server counts: the grid only shows one page of them. */
  readonly total: number;
  /** The page counted from 1, as the address writes it; the grid counts from 0. */
  readonly page: number;
  readonly pageSize: number;
  readonly loading: boolean;
  /** The search of the list (`?page=3`), carried to the detail to come back to the same page. */
  readonly listSearch: string;
  /** What the grid offers when there are no users, such as creating one. */
  readonly emptyAction?: ReactNode;
  readonly onPaginationChange: (page: number, pageSize: number) => void;
}

function NoRowsOverlay({ action }: { readonly action?: ReactNode }) {
  return (
    <GridOverlay>
      <Stack spacing={2} sx={{ alignItems: 'center', p: 3 }}>
        <Typography>{messages.users.list.empty}</Typography>
        {action}
      </Stack>
    </GridOverlay>
  );
}

/**
 * The list of users with the pagination done by the server (constitution IV): the grid never holds
 * more rows than one page. The platform gives the order, so it neither sorts nor filters. The name
 * is a link to the detail, which is how the keyboard and the screen readers get there.
 */
export function UsersGrid({
  users,
  total,
  page,
  pageSize,
  loading,
  listSearch,
  emptyAction,
  onPaginationChange,
}: UsersGridProps) {
  const columns: GridColDef<PlatformUser>[] = [
    {
      field: 'name',
      headerName: messages.users.list.columns.name,
      flex: 1,
      minWidth: 200,
      valueGetter: (_value, user) => getFullName(user),
      renderCell: ({ row }) => (
        <Link component={RouterLink} to={`/users/${row.id}`} state={{ listSearch }}>
          {getFullName(row)}
        </Link>
      ),
    },
    {
      field: 'email',
      headerName: messages.users.list.columns.email,
      flex: 1,
      minWidth: 220,
    },
    {
      field: 'createdAt',
      headerName: messages.users.list.columns.createdAt,
      minWidth: 180,
      valueGetter: (_value, user) => formatDateTime(user.createdAt),
    },
  ];

  return (
    <DataGrid
      aria-label={messages.users.list.gridLabel}
      rows={users}
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
      slots={{ noRowsOverlay: NoRowsOverlay }}
      slotProps={{ noRowsOverlay: { action: emptyAction } }}
    />
  );
}
