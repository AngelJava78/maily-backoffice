import { screen, within } from '@testing-library/react';
import type { RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';

import { auth0User } from '@/test/auth0Double';
import { roleDto, userDto } from '@/test/factories';
import { createUsersServiceMock } from '@/test/handlers/usersService';
import { logOutFromHeader } from '@/test/profileMenu';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ProtectedRoute } from '../router/ProtectedRoute';
import { AppLayout } from './AppLayout';

const SUB = 'auth0|user1';

const routes: RouteObject[] = [
  {
    Component: ProtectedRoute,
    children: [
      {
        path: '/',
        element: <AppLayout sections={[]} />,
        children: [{ index: true, element: <h1>Protected page</h1> }],
      },
    ],
  },
  { path: '/access', element: <p>Access screen</p> },
];

/** One tab of the browser: the guarded layout with a session and its own copy of everything. */
async function openTab() {
  const tab = renderWithProviders(routes, {
    auth0: { isAuthenticated: true, user: auth0User({ sub: SUB }) },
  });
  await within(tab.container).findByRole('heading', { name: 'Protected page' });
  return tab;
}

describe('log out from the layout', () => {
  it('ends the Auth0 session returning to the access screen, and empties the cache (US3-1)', async () => {
    createUsersServiceMock({
      [SUB]: {
        user: userDto({ auth0_id: SUB }),
        roles: [roleDto({ name: 'Marketing', permissions: ['tenants:read'] })],
      },
    });
    const { user, auth0, queryClient } = await openTab();
    queryClient.setQueryData(['anything'], 'cached data');

    await logOutFromHeader(user);

    expect(auth0.logout).toHaveBeenCalledExactlyOnceWith({
      logoutParams: { returnTo: `${window.location.origin}/access` },
    });
    expect(queryClient.getQueryData(['anything'])).toBeUndefined();
    expect(screen.getByRole('heading', { name: 'Protected page' })).toBeInTheDocument();
  });

  it('takes the other tabs to the access screen as soon as one of them logs out (US3-4)', async () => {
    createUsersServiceMock({
      [SUB]: {
        user: userDto({ auth0_id: SUB }),
        roles: [roleDto({ name: 'Marketing', permissions: ['tenants:read'] })],
      },
    });
    const first = await openTab();
    const second = await openTab();
    // Like the SDK does, the second tab forgets its session when told to without redirecting.
    second.auth0.logout.mockImplementation(() => {
      second.updateAuth0({ isAuthenticated: false, user: undefined });
      return Promise.resolve();
    });

    await logOutFromHeader(first.user, within(first.container));

    await within(second.container).findByText('Access screen');
    expect(second.router.state.location.pathname).toBe('/access');
    expect(second.auth0.logout).toHaveBeenCalledExactlyOnceWith({ openUrl: false });
    // The tab that logged out is on its way to Auth0: it does not react to its own notice.
    expect(first.router.state.location.pathname).toBe('/');
    expect(first.auth0.logout).toHaveBeenCalledExactlyOnceWith({
      logoutParams: { returnTo: `${window.location.origin}/access` },
    });
  });
});
