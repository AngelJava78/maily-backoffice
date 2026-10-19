import { esES as materialEsES } from '@mui/material/locale';
import { createTheme } from '@mui/material/styles';
import { esES as dataGridEsES } from '@mui/x-data-grid/locales';

/**
 * The border of a field, which is what tells the person where to write (WCAG 1.4.11 asks 3:1 over the
 * page). The default of MUI is 1.7:1; this grey is 4.6:1 over white.
 */
export const FIELD_BORDER_COLOR = '#757575';

/**
 * Single source of palette, typography and spacing (constitution VI). The Spanish locales of MUI
 * and of its Data Grid translate the texts the libraries render on their own, such as the close
 * button of an alert or the footer of a table. The Data Grid takes its locale from the theme: the
 * `localeText` property does not accept the exported object (research D1 of 002).
 * Every colour keeps a WCAG 2.1 AA contrast with its text (`theme.test.ts` checks it).
 */
export const theme = createTheme(
  {
    palette: {
      primary: { main: '#1565c0' },
      secondary: { main: '#455a64' },
      // The defaults of MUI for these two give white text only 3.1:1 and 3.9:1, below the 4.5:1 of AA.
      info: { main: '#0277bd' },
      warning: { main: '#b45309' },
    },
    typography: {
      fontFamily:
        'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    shape: { borderRadius: 8 },
    spacing: 8,
    components: {
      MuiOutlinedInput: {
        styleOverrides: { notchedOutline: { borderColor: FIELD_BORDER_COLOR } },
      },
    },
  },
  materialEsES,
  dataGridEsES,
);
