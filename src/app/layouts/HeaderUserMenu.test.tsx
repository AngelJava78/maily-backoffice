import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { operatorAccess } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

import { HeaderUserMenu } from './HeaderUserMenu';

describe('HeaderUserMenu', () => {
  it('renders the profile menu (Spec 5) and reserves an empty slot for the language switcher (Spec 7, 011-profile-avatar-menu)', () => {
    renderWithProviders(<HeaderUserMenu />, { access: operatorAccess() });

    expect(screen.getByRole('button', { name: /^Menú de / })).toBeInTheDocument();
    expect(screen.getByTestId('language-reserved-slot')).toBeInTheDocument();
    expect(screen.getByTestId('language-reserved-slot')).toBeEmptyDOMElement();
  });

  it('offers a theme toggle, operable by keyboard, that switches the whole app (009-dark-mode-toggle)', async () => {
    const { user } = renderWithProviders(<HeaderUserMenu />, { access: operatorAccess() });

    // Starts in light mode (ThemeModeProvider's current default): the button offers to switch to dark.
    const toggle = screen.getByRole('button', { name: messages.nav.theme.switchToDark });

    toggle.focus();
    expect(toggle).toHaveFocus();
    await user.keyboard('{Enter}');

    // The accessible name flips with the mode: it now offers the opposite switch.
    expect(
      screen.getByRole('button', { name: messages.nav.theme.switchToLight }),
    ).toBeInTheDocument();
  });

  it('keeps the reserved slot empty next to the new theme toggle (Spec 7 untouched)', () => {
    renderWithProviders(<HeaderUserMenu />, { access: operatorAccess() });

    expect(screen.getByTestId('language-reserved-slot')).toBeEmptyDOMElement();
  });
});
