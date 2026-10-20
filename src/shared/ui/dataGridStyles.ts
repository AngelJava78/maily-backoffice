import type { SxProps, Theme } from '@mui/material/styles';

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
