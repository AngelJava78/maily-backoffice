import { getContrastRatio } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import { colorTokens } from '@/shared/theme/tokens';

import { theme } from './theme';

/** WCAG 2.1 AA, success criterion 1.4.3: contrast of normal-size text. */
const AA_NORMAL_TEXT = 4.5;

/** WCAG 2.1 AA, success criterion 1.4.11: contrast of the parts of a control that identify it. */
const AA_COMPONENT = 3;

const INTENTS = ['primary', 'secondary', 'error', 'warning', 'info', 'success'] as const;

describe('theme', () => {
  it.each(INTENTS)(
    'the text over the %s colour keeps a WCAG 2.1 AA contrast (buttons, filled alerts, chips)',
    (intent) => {
      const { main, contrastText } = theme.palette[intent];

      expect(getContrastRatio(main, contrastText)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    },
  );

  it('draws the border of the fields with a contrast of 3:1 over the page (WCAG 1.4.11)', () => {
    expect(
      getContrastRatio(colorTokens.bordeFuerte, theme.palette.background.paper),
    ).toBeGreaterThanOrEqual(AA_COMPONENT);
    expect(
      getContrastRatio(colorTokens.bordeFuerte, theme.palette.background.default),
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
});
