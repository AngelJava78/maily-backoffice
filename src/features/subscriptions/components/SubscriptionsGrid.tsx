import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataGrid, GridOverlay, type GridColDef } from '@mui/x-data-grid';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';

import { formatMxn } from '@/shared/lib/formatCurrency';
import { messages } from '@/shared/messages/es';
import { GRID_PAGINATION_STYLES } from '@/shared/ui/dataGridStyles';

import type { Subscription } from '../schemas/subscription';
import { PAGE_SIZE_OPTIONS } from '../schemas/subscriptionsLocation';
import { SubscriptionStatusChip } from './SubscriptionStatusChip';

const text = messages.subscriptions;

interface SubscriptionsGridProps {
  /** The subscriptions of the page shown, already in the fixed order of the list. */
  readonly subscriptions: readonly Subscription[];
  /** Subscriptions of the catalog: the grid only shows one page of them. */
  readonly total: number;
  /** The page counted from 1, as the address writes it; the grid counts from 0. */
  readonly page: number;
  readonly pageSize: number;
  readonly loading: boolean;
  /** The search of the list (`?page=2`), carried to the detail to come back to the same page. */
  readonly listSearch: string;
  /** What the grid offers when there are no subscriptions, such as creating one. */
  readonly emptyAction?: ReactNode;
  readonly onPaginationChange: (page: number, pageSize: number) => void;
}

function NoRowsOverlay({ action }: { readonly action?: ReactNode }) {
  return (
    <GridOverlay>
      <Stack spacing={2} sx={{ alignItems: 'center', p: 3 }}>
        <Typography>{text.list.empty}</Typography>
        {action}
      </Stack>
    </GridOverlay>
  );
}

/** The clinics, or «No disponible» when the platform could not count them: never a made-up 0. */
const clinicsText = (subscription: Subscription): string =>
  subscription.clinicsCount === null
    ? text.clinics.notAvailable
    : String(subscription.clinicsCount);

/**
 * The list of subscriptions. The API returns the whole catalog, which the list sorts and cuts into
 * pages, so the grid is told the page to show as if a server had cut it (`paginationMode="server"`)
 * and never holds more rows than one page. The order is fixed, so it neither sorts nor filters,
 * and the rows are never dimmed: the chip tells the status. The name is a link to the detail.
 */
export function SubscriptionsGrid({
  subscriptions,
  total,
  page,
  pageSize,
  loading,
  listSearch,
  emptyAction,
  onPaginationChange,
}: SubscriptionsGridProps) {
  const columns: GridColDef<Subscription>[] = [
    {
      field: 'name',
      headerName: text.list.columns.name,
      flex: 1,
      minWidth: 200,
      renderCell: ({ row }) => (
        <Link component={RouterLink} to={`/subscriptions/${row.id}`} state={{ listSearch }}>
          {row.name}
        </Link>
      ),
    },
    {
      field: 'monthlyPrice',
      headerName: text.list.columns.monthlyPrice,
      minWidth: 170,
      valueGetter: (_value, subscription) =>
        text.price.perMonth(formatMxn(subscription.monthlyPrice)),
    },
    {
      field: 'status',
      headerName: text.list.columns.status,
      minWidth: 140,
      valueGetter: (_value, subscription) => subscription.status.name,
      renderCell: ({ row }) => <SubscriptionStatusChip status={row.status} />,
    },
    {
      field: 'clinicsCount',
      headerName: text.list.columns.clinics,
      minWidth: 130,
      valueGetter: (_value, subscription) => clinicsText(subscription),
    },
  ];

  return (
    <DataGrid
      aria-label={text.list.gridLabel}
      rows={subscriptions}
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
      slotProps={{
        noRowsOverlay: { action: emptyAction },
        basePagination: { material: { sx: GRID_PAGINATION_STYLES } },
      }}
    />
  );
}
