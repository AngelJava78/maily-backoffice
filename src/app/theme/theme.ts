import { esES as materialEsES } from '@mui/material/locale';
import { createTheme } from '@mui/material/styles';
import { esES as dataGridEsES } from '@mui/x-data-grid/locales';

import { colorTokens, radiusTokens, typographyTokens } from '@/shared/theme/tokens';

/**
 * Single source of palette, typography and spacing (constitution VI), built from web-soft's
 * design tokens (specs/008-design-system). The Spanish locales of MUI and of its Data Grid
 * translate the texts the libraries render on their own, such as the close button of an alert or
 * the footer of a table. The Data Grid takes its locale from the theme: the `localeText` property
 * does not accept the exported object (research D1 of 002).
 * Every colour keeps a WCAG 2.1 AA contrast with its text (`theme.test.ts` checks it). `info` has
 * no token of its own in web-soft (it only distinguishes action/success/warning/danger): it
 * reuses `accion`.
 */
export const theme = createTheme(
  {
    palette: {
      primary: { main: colorTokens.accion },
      secondary: { main: colorTokens.suave },
      error: { main: colorTokens.peligro },
      warning: { main: colorTokens.aviso },
      info: { main: colorTokens.accion },
      success: { main: colorTokens.exito },
      background: { default: colorTokens.fondo, paper: colorTokens.superficie },
      text: { primary: colorTokens.cuerpo, secondary: colorTokens.suave },
      divider: colorTokens.borde,
    },
    typography: {
      fontFamily: typographyTokens.fontFamily,
    },
    shape: { borderRadius: radiusTokens.xl },
    spacing: 8,
    components: {
      MuiOutlinedInput: {
        styleOverrides: { notchedOutline: { borderColor: colorTokens.bordeFuerte } },
      },
    },
  },
  materialEsES,
  dataGridEsES,
);
