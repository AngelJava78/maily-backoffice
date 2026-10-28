import Link from '@mui/material/Link';
import { DataGrid, GridOverlay, type GridColDef, type GridSortModel } from '@mui/x-data-grid';
import { useMemo, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';

import { formatMxn } from '@/shared/lib/formatCurrency';
import { messages } from '@/shared/messages/es';
import { GRID_APPEARANCE_STYLES, GRID_PAGINATION_STYLES } from '@/shared/ui/dataGridStyles';
import { EmptyState } from '@/shared/ui/EmptyState';

import { toCents } from '../schemas/price';
import type { Subscription } from '../schemas/subscription';
import {
  DEFAULT_SORT,
  isSubscriptionsSortField,
  PAGE_SIZE_OPTIONS,
  type SubscriptionsSort,
} from '../schemas/subscriptionsLocation';
import { SubscriptionStatusChip } from './SubscriptionStatusChip';

const text = messages.subscriptions;

interface SubscriptionsGridProps {
  /** The subscriptions of the page shown, already in the order `sort` asks for (020). */
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
  /** The column and direction the list is ordered by (020, FR-006). */
  readonly sort: SubscriptionsSort;
  readonly onSortChange: (sort: SubscriptionsSort) => void;
}

function NoRowsOverlay({ action }: { readonly action?: ReactNode }) {
  return (
    <GridOverlay>
      <EmptyState message={text.list.empty} action={action} />
    </GridOverlay>
  );
}

/**
 * The list of subscriptions. The API returns the whole catalog, which the list orders (`sort`) and
 * cuts into pages, so the grid is told the page to show as if a server had sorted and cut it
 * (`paginationMode="server"`, `sortingMode="server"`) and never holds more rows than one page. The
 * rows are never dimmed: the chip tells the status. The name is a link to the detail.
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
  sort,
  onSortChange,
}: SubscriptionsGridProps) {
  // Stable references (correctness, not a measured optimization, constitution I): the grid is
  // controlled (`sortingMode="server"`) and reconciles its sort state against these on every
  // render; a brand-new array/objects each time made it drop the page the operator just asked for.
  const columns: GridColDef<Subscription>[] = useMemo(
    () => [
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
        field: 'subscriptionType',
        headerName: text.list.columns.subscriptionType,
        minWidth: 130,
        valueGetter: (_value, subscription) => subscription.subscriptionType.name,
      },
      {
        field: 'clinicsCount',
        headerName: text.list.columns.clinics,
        type: 'number',
        minWidth: 130,
        valueGetter: (_value, subscription) => subscription.clinicsCount,
        valueFormatter: (value: number | null) =>
          value === null ? text.clinics.notAvailable : String(value),
      },
      {
        field: 'consultingRoomsLimit',
        headerName: text.list.columns.consultingRoomsLimit,
        type: 'number',
        minWidth: 140,
        valueGetter: (_value, subscription) => subscription.consultingRoomsLimit,
      },
      {
        field: 'monthlyPrice',
        headerName: text.list.columns.monthlyPrice,
        type: 'number',
        minWidth: 170,
        // The exact order of the Listado comes from the cents (research D7, D10): never a
        // formatted text, which would compare "$1,000.00" before "$200.00" alphabetically.
        valueGetter: (_value, subscription) => toCents(subscription.monthlyPrice),
        valueFormatter: (value: number) => text.price.perMonth(formatMxn((value / 100).toFixed(2))),
      },
      {
        field: 'annualPrice',
        headerName: text.list.columns.annualPrice,
        type: 'number',
        minWidth: 170,
        valueGetter: (_value, subscription) => toCents(subscription.annualPrice),
        valueFormatter: (value: number) => text.price.perYear(formatMxn((value / 100).toFixed(2))),
      },
      {
        field: 'status',
        headerName: text.list.columns.status,
        minWidth: 140,
        valueGetter: (_value, subscription) => subscription.status.name,
        renderCell: ({ row }) => <SubscriptionStatusChip status={row.status} />,
      },
    ],
    [listSearch],
  );

  const sortModel: GridSortModel = useMemo(
    () => [{ field: sort.field, sort: sort.direction }],
    [sort.field, sort.direction],
  );

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
      sortingMode="server"
      sortingOrder={['asc', 'desc']}
      sortModel={sortModel}
      onSortModelChange={(model) => {
        const [first] = model;
        if (first?.sort && isSubscriptionsSortField(first.field)) {
          onSortChange({ field: first.field, direction: first.sort });
          return;
        }
        onSortChange(DEFAULT_SORT);
      }}
      disableColumnFilter
      disableColumnMenu
      disableRowSelectionOnClick
      autoHeight
      sx={GRID_APPEARANCE_STYLES}
      slots={{ noRowsOverlay: NoRowsOverlay }}
      slotProps={{
        noRowsOverlay: { action: emptyAction },
        basePagination: { material: { sx: GRID_PAGINATION_STYLES } },
      }}
    />
  );
}
