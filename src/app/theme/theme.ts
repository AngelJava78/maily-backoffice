import { esES as materialEsES } from '@mui/material/locale';
import { createTheme, type Theme } from '@mui/material/styles';
import { esES as dataGridEsES } from '@mui/x-data-grid/locales';

import {
  colorTokens,
  colorTokensOscuro,
  radiusTokens,
  typographyTokens,
} from '@/shared/theme/tokens';

/** The two appearances the Backoffice supports (009-dark-mode-toggle). */
export type ThemeMode = 'claro' | 'oscuro';

/**
 * Single source of palette, typography and spacing (constitution VI), built from web-soft's
 * design tokens (specs/008-design-system) plus the second "Set de valores" that
 * 009-dark-mode-toggle adds for the dark appearance (specs/008-design-system/data-model.md, US5-1
 * extension rule): same token names, values of their own — no component changes between modes.
 * The Spanish locales of MUI and of its Data Grid translate the texts the libraries render on
 * their own, such as the close button of an alert or the footer of a table. The Data Grid takes
 * its locale from the theme: the `localeText` property does not accept the exported object
 * (research D1 of 002).
 * Every colour keeps a WCAG 2.1 AA contrast with its text (`theme.test.ts` checks it, in both
 * modes). `info` has no token of its own in web-soft (it only distinguishes
 * action/success/warning/danger): it reuses `accion`. `palette.mode` is set explicitly (not left
 * at MUI's `'light'` default) so MUI's own mode-aware behaviour (Alert's tinted backgrounds,
 * hover/focus overlay opacities) matches the active appearance, even though every colour below is
 * a literal token value, not MUI's automatic light/dark derivation.
 */
export function createAppTheme(mode: ThemeMode): Theme {
  const tokens = mode === 'oscuro' ? colorTokensOscuro : colorTokens;

  return createTheme(
    {
      palette: {
        mode: mode === 'oscuro' ? 'dark' : 'light',
        primary: { main: tokens.accion },
        secondary: { main: tokens.suave },
        error: { main: tokens.peligro },
        warning: { main: tokens.aviso },
        info: { main: tokens.accion },
        success: { main: tokens.exito },
        background: { default: tokens.fondo, paper: tokens.superficie },
        text: { primary: tokens.cuerpo, secondary: tokens.suave },
        divider: tokens.borde,
      },
      typography: {
        fontFamily: typographyTokens.fontFamily,
      },
      shape: { borderRadius: radiusTokens.xl },
      spacing: 8,
      components: {
        MuiOutlinedInput: {
          styleOverrides: { notchedOutline: { borderColor: tokens.bordeFuerte } },
        },
      },
    },
    materialEsES,
    dataGridEsES,
  );
}
