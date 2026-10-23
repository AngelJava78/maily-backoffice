import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { operatorAccess } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ProfileMenu } from './ProfileMenu';

// operatorAccess() defaults to Ana Pérez, ana@clinica.com, a single "Administrator" role.
const DISPLAY_NAME = 'Ana Pérez';
const EMAIL = 'ana@clinica.com';
const ROLE = 'Administrator';

function renderMenu() {
  return renderWithProviders(<ProfileMenu />, { access: operatorAccess() });
}

const avatarButton = () =>
  screen.getByRole('button', { name: messages.nav.profileMenu(DISPLAY_NAME) });

async function openMenu(user: ReturnType<typeof renderMenu>['user']) {
  await user.click(avatarButton());
  return screen.findByRole('menu');
}

describe('ProfileMenu: contenido', () => {
  it('starts closed: no menu in the document until the avatar button is activated', () => {
    renderMenu();

    expect(avatarButton()).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens with the name, the e-mail and the active role(s), plus "Mi perfil" and "Cerrar sesión"', async () => {
    const { user } = renderMenu();

    const menu = await openMenu(user);

    expect(within(menu).getByText(DISPLAY_NAME)).toBeInTheDocument();
    expect(within(menu).getByText(EMAIL)).toBeInTheDocument();
    expect(within(menu).getByText(new RegExp(ROLE))).toBeInTheDocument();
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual([messages.profile.title, messages.common.logout]);
  });

  it('offers no way to switch the active role or the account (SC-003)', async () => {
    const { user } = renderMenu();

    const menu = await openMenu(user);

    // Exactly the two actions above (FR-002): nothing else is clickable inside the menu.
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(2);
    expect(within(menu).queryAllByRole('button')).toHaveLength(0);
  });

  it('"Mi perfil" is a link to /profile and closes the menu', async () => {
    const { user, router } = renderMenu();
    const menu = await openMenu(user);

    await user.click(within(menu).getByRole('menuitem', { name: messages.profile.title }));

    expect(router.state.location.pathname).toBe('/profile');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('ProfileMenu: teclado y accesibilidad', () => {
  it('opens with Enter, moves focus into the menu, and Escape returns it to the button', async () => {
    const { user } = renderMenu();
    avatarButton().focus();

    await user.keyboard('{Enter}');
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: messages.profile.title })).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(avatarButton()).toHaveFocus();
  });

  it('has no accessibility violations, closed or open', async () => {
    const { user, baseElement } = renderMenu();

    expect(await axe(baseElement)).toHaveNoViolations();
    expect(await axe(await openMenu(user))).toHaveNoViolations();
  });
});
