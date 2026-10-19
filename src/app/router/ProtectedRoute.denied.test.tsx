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
    ],
  },
];

const marketing = roleDto({ name: 'Marketing', permissions: ['tenants:read'] });
const owner = roleDto({ id: 5, name: 'Owner', permissions: ['clinics:read'] });

const DENIED_CASES: readonly (readonly [string, Record<string, MockAccount>, string])[] = [
  ['an account that is not registered', {}, messages.denied.reasons.notRegistered],
  [
    'a blocked account',
    {
      [SUB]: {
        user: userDto({ auth0_id: SUB, status: { id: 2, name: 'Bloqueado' } }),
        roles: [marketing],
      },
    },
    messages.denied.reasons.inactiveAccount,
  ],
  [
    'a deleted account',
    {
      [SUB]: {
        user: userDto({ auth0_id: SUB, status: { id: 3, name: 'Eliminado' } }),
        roles: [marketing],
      },
    },
    messages.denied.reasons.inactiveAccount,
  ],
  [
    'an account whose only role does not give access',
    { [SUB]: { user: userDto({ auth0_id: SUB }), roles: [owner] } },
    messages.denied.reasons.noAuthorizedRole,
  ],
];

afterEach(() => {
  vi.useRealTimers();
});

describe('ProtectedRoute when the access is denied', () => {
  describe.each(['/', '/profile'])('opening %s directly', (route) => {
    it.each(DENIED_CASES)(
      'shows the denial for %s, with the account, and not the content',
      async (_label, accounts, reason) => {
        createUsersServiceMock(accounts);

        renderWithProviders(routes, { route, auth0: SIGNED_IN });

        expect(
          await screen.findByRole('heading', { level: 1, name: messages.denied.title }),
        ).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent(reason);
        expect(screen.getByText(messages.common.account(EMAIL))).toBeInTheDocument();
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
