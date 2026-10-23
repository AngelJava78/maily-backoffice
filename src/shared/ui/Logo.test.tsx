import { getContrastRatio, ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createAppTheme, type ThemeMode } from '@/app/theme/theme';
import { colorTokens } from '@/shared/theme/tokens';

import { Logo } from './Logo';

/** WCAG 2.1 AA, success criterion 1.4.3: contrast of normal-size text. */
const AA_NORMAL_TEXT = 4.5;

const MODES: readonly ThemeMode[] = ['claro', 'oscuro'];

/** `Logo` only needs a MUI theme, not the whole app's provider stack. */
function renderLogo(mode: ThemeMode) {
  return render(
    <ThemeProvider theme={createAppTheme(mode)}>
      <Logo />
    </ThemeProvider>,
  );
}

describe('Logo', () => {
  it.each(MODES)(
    'keeps the same contrast-chip background in %s mode (research.md D6: fixed in both themes)',
    (mode) => {
      renderLogo(mode);

      const chip = screen.getByTestId('logo-contrast-chip');
      // The chip's own background is a literal token, not derived from the active theme's palette.
      expect(chip).toHaveStyle({ backgroundColor: colorTokens.superficie });
    },
  );

  it('keeps WCAG 2.1 AA contrast between the chip background and the fallback text colour', () => {
    expect(getContrastRatio(colorTokens.tinta, colorTokens.superficie)).toBeGreaterThanOrEqual(
      AA_NORMAL_TEXT,
    );
  });

  it('falls back to the brand name in text, legible over the same chip, if the image fails', () => {
    renderLogo('claro');

    fireEvent.error(screen.getByRole('img'));

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    const fallback = screen.getByText('maily');
    expect(fallback).toHaveStyle({ color: colorTokens.tinta });
    expect(screen.getByTestId('logo-contrast-chip')).toContainElement(fallback);
  });
});
