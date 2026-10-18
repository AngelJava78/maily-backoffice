import { screen } from '@testing-library/react';
import type { RouteObject } from 'react-router';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { AnnounceSessionNotice } from '@/test/AnnounceSessionNotice';
import { auth0User } from '@/test/auth0Double';
import { roleDto, userDto } from '@/test/factories';
import { createUsersServiceMock } from '@/test/handlers/usersService';
import { renderWithProviders } from '@/test/renderWithProviders';

import { AccessPage } from './AccessPage';

const routes: RouteObject[] = [
  { path: '/access', element: <AccessPage /> },
  { path: '/', element: <p>Home screen</p> },
];

describe('AccessPage', () => {
  it('offers to sign in, and nothing to type (FR-002)', () => {
    const { container } = renderWithProviders(routes, { route: '/access' });

    expect(
      screen.getByRole('heading', { level: 1, name: messages.access.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(messages.access.description)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.access.loginButton })).toBeInTheDocument();
    expect(container.querySelector('input')).toBeNull();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('starts the sign-in at Auth0 and comes back to the home page by default', async () => {
    const { user, auth0 } = renderWithProviders(routes, { route: '/access' });

    await user.click(screen.getByRole('button', { name: messages.access.loginButton }));

    expect(auth0.loginWithRedirect).toHaveBeenCalledExactlyOnceWith({
      appState: { returnTo: '/' },
    });
  });

  it('comes back to the address the person was heading to', async () => {
    const { user, auth0 } = renderWithProviders(routes, {
      initialEntries: [{ pathname: '/access', state: { returnTo: '/profile?tab=2' } }],
    });

    await user.click(screen.getByRole('button', { name: messages.access.loginButton }));

    expect(auth0.loginWithRedirect).toHaveBeenCalledExactlyOnceWith({
      appState: { returnTo: '/profile?tab=2' },
    });
  });

  it.each(['https://evil.example.com', '//evil.example.com', 'javascript:alert(1)', 42, null])(
    'ignores a return address that is not inside the application (%j)',
    async (returnTo) => {
      const { user, auth0 } = renderWithProviders(routes, {
        initialEntries: [{ pathname: '/access', state: { returnTo } }],
      });

      await user.click(screen.getByRole('button', { name: messages.access.loginButton }));

      expect(auth0.loginWithRedirect).toHaveBeenCalledExactlyOnceWith({
        appState: { returnTo: '/' },
      });
    },
  );

  it.each([
    ['cancelled', messages.access.notices.cancelled],
    ['idpError', messages.access.notices.idpError],
    ['expired', messages.access.notices.expired],
    ['idle', messages.access.notices.idle],
  ])('shows the notice %s', (notice, text) => {
    renderWithProviders(routes, {
      initialEntries: [{ pathname: '/access', state: { notice } }],
    });

    expect(screen.getByRole('alert')).toHaveTextContent(text);
  });

  it.each([['bogus'], [42], [null], [{ kind: 'expired' }]])(
    'shows no notice for the unknown value %j',
    (notice) => {
      renderWithProviders(routes, {
        initialEntries: [{ pathname: '/access', state: { notice } }],
      });

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    },
  );

  describe('when the session ended on its own and the route guard announced it', () => {
    const announcedRoutes: RouteObject[] = [
      {
        path: '/access',
        element: (
          <AnnounceSessionNotice notice="expired">
            <AccessPage />
          </AnnounceSessionNotice>
        ),
      },
    ];

    it('says why, although the router state carries nothing', () => {
      renderWithProviders(announcedRoutes, { route: '/access' });

      expect(screen.getByRole('alert')).toHaveTextContent(messages.access.notices.expired);
    });

    it('says why instead of the notice of the router state, which is not ordered with the session', () => {
      renderWithProviders(announcedRoutes, {
        initialEntries: [{ pathname: '/access', state: { notice: 'cancelled' } }],
      });

      expect(screen.getByRole('alert')).toHaveTextContent(messages.access.notices.expired);
      expect(screen.queryByText(messages.access.notices.cancelled)).not.toBeInTheDocument();
    });

    it('still offers to sign in again, and comes back to where the person was', async () => {
      const { user, auth0 } = renderWithProviders(announcedRoutes, {
        initialEntries: [{ pathname: '/access', state: { returnTo: '/profile' } }],
      });

      await user.click(screen.getByRole('button', { name: messages.access.loginButton }));

      expect(auth0.loginWithRedirect).toHaveBeenCalledExactlyOnceWith({
        appState: { returnTo: '/profile' },
      });
    });
  });

  it('shows no notice when the router state is not an object', () => {
    renderWithProviders(routes, {
      initialEntries: [{ pathname: '/access', state: 'expired' }],
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.access.loginButton })).toBeInTheDocument();
  });

  it('shows only a progress indicator while the Auth0 SDK initializes', () => {
    renderWithProviders(routes, { route: '/access', auth0: { isLoading: true } });

    expect(screen.getByRole('status', { name: messages.common.loading })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: messages.access.loginButton }),
    ).not.toBeInTheDocument();
  });

  it('sends a person who already has a session to the home page (US1-4)', async () => {
    const sub = 'auth0|user1';
    createUsersServiceMock({
      [sub]: {
        user: userDto({ auth0_id: sub }),
        roles: [roleDto({ name: 'Marketing', permissions: ['tenants:read'] })],
      },
    });

    const { router } = renderWithProviders(routes, {
      route: '/access',
      auth0: { isAuthenticated: true, user: auth0User({ sub }) },
    });

    expect(await screen.findByText('Home screen')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(routes, {
      initialEntries: [{ pathname: '/access', state: { notice: 'expired' } }],
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});
