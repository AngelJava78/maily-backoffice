import { esES } from '@mui/material/locale';
import { createTheme } from '@mui/material/styles';

/**
 * Single source of palette, typography and spacing (constitution VI). The Spanish locale of MUI
 * translates the texts the library renders on its own, such as the close button of an alert.
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
  },
  esES,
);
