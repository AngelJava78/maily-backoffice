import Link from '@mui/material/Link';
import { DataGrid, GridOverlay, type GridColDef } from '@mui/x-data-grid';
import { Link as RouterLink } from 'react-router';

import { messages } from '@/shared/messages/es';
import { GRID_APPEARANCE_STYLES, GRID_PAGINATION_STYLES } from '@/shared/ui/dataGridStyles';
import { EmptyState } from '@/shared/ui/EmptyState';

import { PAGE_SIZE_OPTIONS } from '../schemas/componentsLocation';
import type { MonitoredComponent } from '../schemas/monitoredComponent';

const text = messages.health.registry;

interface ComponentsGridProps {
  /** The components of the page shown, in the order of the service. */
  readonly components: readonly MonitoredComponent[];
  /** Components of the registry: the grid only shows one page of them. */
  readonly total: number;
  /** The page counted from 1, as the address writes it; the grid counts from 0. */
  readonly page: number;
  readonly pageSize: number;
  readonly loading: boolean;
  readonly onPaginationChange: (page: number, pageSize: number) => void;
}

// Only a text: a link or a button inside a grid is not one of its cells (axe), so the action to
// register a component stays next to the title of the page.
function NoRowsOverlay() {
  return (
    <GridOverlay>
      <EmptyState message={text.empty} />
    </GridOverlay>
  );
}

/**
 * The registry of components (FR-034). The service returns it whole, which the list cuts into
 * pages, so the grid is told the page to show as if a server had cut it (`paginationMode="server"`)
 * and never holds more rows than one page. The order is the one of the service, so it neither sorts
 * nor filters. The name is a link to the detail; the base URL is a text, never a link (FR-007).
 */
export function ComponentsGrid({
  components,
  total,
  page,
  pageSize,
  loading,
  onPaginationChange,
}: ComponentsGridProps) {
  const columns: GridColDef<MonitoredComponent>[] = [
    {
      field: 'name',
      headerName: text.columns.name,
      flex: 1,
      minWidth: 200,
      renderCell: ({ row }) => (
        <Link component={RouterLink} to={`/health/components/${row.id}`}>
          {row.name}
        </Link>
      ),
    },
    { field: 'code', headerName: text.columns.code, minWidth: 180 },
    {
      field: 'kind',
      headerName: text.columns.kind,
      minWidth: 140,
      valueGetter: (_value, component) => text.kinds[component.kind],
    },
    { field: 'baseUrl', headerName: text.columns.baseUrl, flex: 1, minWidth: 220 },
    {
      field: 'enabled',
      headerName: text.columns.enabled,
      minWidth: 140,
      valueGetter: (_value, component) => (component.enabled ? text.enabled : text.disabled),
    },
    { field: 'sortOrder', headerName: text.columns.sortOrder, minWidth: 100 },
  ];

  return (
    <DataGrid
      aria-label={text.gridLabel}
      rows={components}
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
      slotProps={{ basePagination: { material: { sx: GRID_PAGINATION_STYLES } } }}
    />
  );
}
