import { screen } from '@testing-library/react';
import type { RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { auth0User } from '@/test/auth0Double';
import { roleDto, userDto } from '@/test/factories';
import { createUsersServiceMock } from '@/test/handlers/usersService';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ProtectedRoute } from './ProtectedRoute';

const SUB = 'auth0|user1';

const routes: RouteObject[] = [
  { path: '/access', element: <p>Access screen</p> },
  {
    Component: ProtectedRoute,
    children: [
      { path: '/', element: <p>Protected home</p> },
      { path: '/profile', element: <p>Protected profile</p> },
    ],
  },
];

function marketingAccount() {
  return {
    [SUB]: {
      user: userDto({ auth0_id: SUB }),
      roles: [roleDto({ name: 'Marketing', permissions: ['tenants:read'] })],
    },
  };
}

describe('ProtectedRoute', () => {
  it('sends a person without a session to the access screen, remembering where they were going', () => {
    const usersService = createUsersServiceMock(marketingAccount());

    const { router } = renderWithProviders(routes, { route: '/profile?tab=2' });

    expect(screen.getByText('Access screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected profile')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/access');
    expect(router.state.location.state).toEqual({ returnTo: '/profile?tab=2' });
    expect(usersService.requestCount).toBe(0);
  });

  it('shows only a progress indicator while the Auth0 SDK initializes', () => {
    const usersService = createUsersServiceMock(marketingAccount());

    renderWithProviders(routes, { auth0: { isLoading: true } });

    expect(screen.getByRole('status', { name: messages.common.loading })).toBeInTheDocument();
    expect(screen.queryByText('Access screen')).not.toBeInTheDocument();
    expect(screen.queryByText('Protected home')).not.toBeInTheDocument();
    expect(usersService.requestCount).toBe(0);
  });

  it('shows only a progress indicator while the access is being resolved (FR-006)', async () => {
    const usersService = createUsersServiceMock(marketingAccount());
    const release = usersService.defer();

    renderWithProviders(routes, {
      auth0: { isAuthenticated: true, user: auth0User({ sub: SUB }) },
    });

    expect(screen.getByRole('status', { name: messages.common.loading })).toBeInTheDocument();
    expect(screen.queryByText('Protected home')).not.toBeInTheDocument();

    release();

    expect(await screen.findByText('Protected home')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders the protected route once the access is granted', async () => {
    createUsersServiceMock(marketingAccount());

    renderWithProviders(routes, {
      route: '/profile',
      auth0: { isAuthenticated: true, user: auth0User({ sub: SUB }) },
    });

    expect(await screen.findByText('Protected profile')).toBeInTheDocument();
    expect(screen.queryByText('Access screen')).not.toBeInTheDocument();
  });
});
