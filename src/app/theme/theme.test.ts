import { getContrastRatio } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import { colorTokens, colorTokensOscuro } from '@/shared/theme/tokens';

import { createAppTheme, type ThemeMode } from './theme';

/** WCAG 2.1 AA, success criterion 1.4.3: contrast of normal-size text. */
const AA_NORMAL_TEXT = 4.5;

/** WCAG 2.1 AA, success criterion 1.4.11: contrast of the parts of a control that identify it. */
const AA_COMPONENT = 3;

const INTENTS = ['primary', 'secondary', 'error', 'warning', 'info', 'success'] as const;

/** Both appearances (009-dark-mode-toggle): neither may fall below the other's WCAG AA floor. */
const MODES: readonly {
  readonly mode: ThemeMode;
  readonly tokens: Record<keyof typeof colorTokens, string>;
}[] = [
  { mode: 'claro', tokens: colorTokens },
  { mode: 'oscuro', tokens: colorTokensOscuro },
];

describe.each(MODES)('theme ($mode)', ({ mode, tokens }) => {
  const theme = createAppTheme(mode);

  it.each(INTENTS)(
    'the text over the %s colour keeps a WCAG 2.1 AA contrast (buttons, filled alerts, chips)',
    (intent) => {
      const { main, contrastText } = theme.palette[intent];

      expect(getContrastRatio(main, contrastText)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    },
  );

  it('draws the border of the fields with a contrast of 3:1 over the page (WCAG 1.4.11)', () => {
    expect(
      getContrastRatio(tokens.bordeFuerte, theme.palette.background.paper),
    ).toBeGreaterThanOrEqual(AA_COMPONENT);
    expect(
      getContrastRatio(tokens.bordeFuerte, theme.palette.background.default),
    ).toBeGreaterThanOrEqual(AA_COMPONENT);
  });

  it('translates the Data Grid through the theme, the way its locale is applied (research D6)', () => {
    const gridTexts = theme.components?.MuiDataGrid?.defaultProps?.localeText;

    expect(gridTexts?.noRowsLabel).toBe('Sin filas');
    expect(gridTexts?.paginationRowsPerPage).toBe('Filas por página:');
  });

  it('keeps the Spanish texts of Material next to the ones of the Data Grid', () => {
    expect(theme.components?.MuiAlert?.defaultProps?.closeText).toBe('Cerrar');
  });

  it("sets palette.mode so MUI's own mode-aware behaviour (Alert tinting, overlays) matches", () => {
    expect(theme.palette.mode).toBe(mode === 'oscuro' ? 'dark' : 'light');
  });
});
