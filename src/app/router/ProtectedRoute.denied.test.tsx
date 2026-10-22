import { QueryClient } from '@tanstack/react-query';
import { act, screen } from '@testing-library/react';
import type { RouteObject } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import { shouldRetryQuery } from '@/shared/api/retry';
import { messages } from '@/shared/messages/es';
import { auth0User } from '@/test/auth0Double';
import { roleDto, userDto } from '@/test/factories';
import { createUsersServiceMock, type MockAccount } from '@/test/handlers/usersService';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ProtectedRoute } from './ProtectedRoute';

const SUB = 'auth0|user1';
const EMAIL = 'cuenta@ejemplo.com';
const SIGNED_IN = { isAuthenticated: true, user: auth0User({ sub: SUB, email: EMAIL }) };

const routes: RouteObject[] = [
  {
    Component: ProtectedRoute,
    children: [
      { path: '/', element: <p>Protected home</p> },
      { path: '/profile', element: <p>Protected profile</p> },
      { path: '/users', element: <p>Protected users</p> },
      { path: '/subscriptions', element: <p>Protected subscriptions</p> },
      { path: '/tools/postman-token', element: <p>Protected token</p> },
      { path: '/no-existe-tampoco', element: <p>Protected catch-all</p> },
    ],
  },
  { path: '/access-denied', element: <p>Sin acceso screen</p> },
];

const marketing = roleDto({ name: 'Marketing', permissions: ['tenants:read'] });
// Of type Clínica, explicitly: `roleDto`'s default is now Sistema (feature 006, research D8).
const owner = roleDto({ id: 5, name: 'Owner', type: { id: 2, name: 'Clínica' }, permissions: [] });

const DENIED_CASES: readonly (readonly [string, Record<string, MockAccount>])[] = [
  ['an account that is not registered', {}],
  [
    'a blocked account',
    {
      [SUB]: {
        user: userDto({ auth0_id: SUB, status: { id: 2, name: 'Bloqueado' } }),
        roles: [marketing],
      },
    },
  ],
  [
    'a deleted account',
    {
      [SUB]: {
        user: userDto({ auth0_id: SUB, status: { id: 3, name: 'Eliminado' } }),
        roles: [marketing],
      },
    },
  ],
  [
    'an account whose only role is of type Clínica',
    { [SUB]: { user: userDto({ auth0_id: SUB }), roles: [owner] } },
  ],
];

// SC-002: at least these internal destinations, denied the same way whatever was asked for.
const DENIED_ROUTES = [
  '/',
  '/profile',
  '/users',
  '/subscriptions',
  '/tools/postman-token',
  '/no-existe-tampoco',
];

afterEach(() => {
  vi.useRealTimers();
});

describe('ProtectedRoute when the access is denied', () => {
  describe.each(DENIED_ROUTES)('opening %s directly', (route) => {
    it.each(DENIED_CASES)(
      'navigates to /access-denied for %s, without showing any protected content',
      async (_label, accounts) => {
        createUsersServiceMock(accounts);

        const { router } = renderWithProviders(routes, { route, auth0: SIGNED_IN });

        await screen.findByText('Sin acceso screen');
        expect(router.state.location.pathname).toBe('/access-denied');
        expect(screen.queryByText(/Protected/)).not.toBeInTheDocument();
        expect(screen.queryByRole('banner')).not.toBeInTheDocument();
      },
    );
  });
});

describe('ProtectedRoute when the access cannot be checked', () => {
  it('offers to retry or log out once the retries are used up, and grants access after a retry', async () => {
    const usersService = createUsersServiceMock({
      [SUB]: { user: userDto({ auth0_id: SUB }), roles: [marketing] },
    });
    usersService.failWith(500);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: shouldRetryQuery, retryDelay: 0 } },
    });

    const { user } = renderWithProviders(routes, { auth0: SIGNED_IN, queryClient });

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.checkFailed.title }),
    ).toBeInTheDocument();
    expect(usersService.requestCount).toBe(3);
    expect(screen.getByText(messages.common.account(EMAIL))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.common.logout })).toBeInTheDocument();
    expect(screen.queryByText('Protected home')).not.toBeInTheDocument();

    usersService.recover();
    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    expect(await screen.findByText('Protected home')).toBeInTheDocument();
  });

  it('shows only the progress until 27 s and then the failure, never after 30 s (FR-005, SC-011)', async () => {
    const usersService = createUsersServiceMock({
      [SUB]: { user: userDto({ auth0_id: SUB }), roles: [marketing] },
    });
    usersService.hang();
    vi.useFakeTimers();
    const startedAt = Date.now();

    renderWithProviders(routes, { auth0: SIGNED_IN, queryClient: createQueryClient() });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(26_999);
    });
    expect(screen.getByRole('status', { name: messages.common.loading })).toBeInTheDocument();
    expect(screen.queryByText(messages.checkFailed.title)).not.toBeInTheDocument();
    expect(screen.queryByText('Protected home')).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await vi.waitFor(() => {
        expect(
          screen.getByRole('heading', { name: messages.checkFailed.title }),
        ).toBeInTheDocument();
      });
    });
    expect(Date.now() - startedAt).toBeLessThan(30_000);
    expect(screen.getByText(messages.common.account(EMAIL))).toBeInTheDocument();
  });
});
