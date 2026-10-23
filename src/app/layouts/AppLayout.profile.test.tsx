import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { operatorAccess } from '@/test/factories';
import { goToProfileFromHeader, openProfileMenu } from '@/test/profileMenu';
import { renderWithProviders } from '@/test/renderWithProviders';

import { AppLayout } from './AppLayout';

describe('the header of AppLayout', () => {
  it('opens to "Mi perfil" and "Cerrar sesión" together, whatever the screen (SC-005, FR-008, 011-profile-avatar-menu)', async () => {
    const { user } = renderWithProviders(
      [
        {
          path: '/',
          element: <AppLayout sections={[]} />,
          children: [
            { index: true, element: <h1>Home page</h1> },
            { path: 'deep/inside', element: <h1>A screen deep inside</h1> },
          ],
        },
      ],
      { access: operatorAccess(), route: '/deep/inside' },
    );

    const menu = await openProfileMenu(user);

    expect(within(menu).getByRole('menuitem', { name: messages.profile.title })).toHaveAttribute(
      'href',
      '/profile',
    );
    expect(
      within(menu).getByRole('menuitem', { name: messages.common.logout }),
    ).toBeInTheDocument();
  });

  it('takes the person to their profile with a single click', async () => {
    const { user, router } = renderWithProviders(
      [
        {
          path: '/',
          element: <AppLayout sections={[]} />,
          children: [
            { index: true, element: <h1>Home page</h1> },
            { path: 'profile', element: <h1>Profile page</h1> },
          ],
        },
      ],
      { access: operatorAccess() },
    );

    await goToProfileFromHeader(user);

    expect(router.state.location.pathname).toBe('/profile');
    expect(await screen.findByRole('heading', { name: 'Profile page' })).toBeInTheDocument();
  });
});
