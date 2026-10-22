import type { SxProps, Theme } from '@mui/material/styles';

import { colorTokens } from '@/shared/theme/tokens';

/**
 * The footer of the Data Grid hides "Filas por página" under 600 px to save room, but then the
 * operator cannot ask for 25 or 50 rows on a phone. It is kept, and the footer wraps onto a second
 * line when it does not fit, so the page never scrolls sideways. For `basePagination` of the grids.
 */
export const GRID_PAGINATION_STYLES: SxProps<Theme> = (theme) => ({
  '& .MuiTablePagination-selectLabel': { display: 'block' },
  '& .MuiTablePagination-input': { display: 'inline-flex' },
  [theme.breakpoints.down('sm')]: {
    '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'flex-end', rowGap: 0.5 },
    '& .MuiTablePagination-spacer': { display: 'none' },
  },
});

/** Header, row separator and hover of web-soft's lists (research.md §10), for `sx` of the grids. */
export const GRID_APPEARANCE_STYLES: SxProps<Theme> = {
  '--DataGrid-rowBorderColor': colorTokens.borde,
  borderColor: colorTokens.borde,
  '& .MuiDataGrid-columnHeaders': { backgroundColor: colorTokens.superficieSutil },
  '& .MuiDataGrid-row:hover': { backgroundColor: colorTokens.accionTinte },
};
