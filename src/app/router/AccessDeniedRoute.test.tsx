import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';

import { shouldRetryQuery } from '@/shared/api/retry';
import { messages } from '@/shared/messages/es';
import { auth0User } from '@/test/auth0Double';
import { roleDto, userDto } from '@/test/factories';
import { createUsersServiceMock, USERS_API_BASE_URL } from '@/test/handlers/usersService';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/server';

import { AccessDeniedRoute } from './AccessDeniedRoute';

const SUB = 'auth0|user1';

const routes: RouteObject[] = [
  { path: '/access', element: <p>Access screen</p> },
  { path: '/', element: <p>Protected home</p> },
  { path: '/access-denied', Component: AccessDeniedRoute },
];

describe('AccessDeniedRoute', () => {
  it('sends a person without a session to the access screen, remembering to come back here', () => {
    const usersService = createUsersServiceMock({});

    const { router } = renderWithProviders(routes, { route: '/access-denied' });

    expect(screen.getByText('Access screen')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/access');
    expect(router.state.location.state).toEqual({ returnTo: '/access-denied' });
    expect(usersService.requestCount).toBe(0);
  });

  it('shows the content of "Sin acceso" with the account of a person who may not enter', async () => {
    createUsersServiceMock({
      [SUB]: { user: userDto({ auth0_id: SUB }), roles: [] },
    });

    renderWithProviders(routes, {
      route: '/access-denied',
      auth0: { isAuthenticated: true, user: auth0User({ sub: SUB }) },
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.denied.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(messages.denied.signedInAs('ana@clinica.com'))).toBeInTheDocument();
  });

  // US3: while the check is in flight, only the loader shows — never the content of "Sin
  // acceso", the error screen, or a redirect — and no other API is asked (FR-008, FR-021, SC-003).
  it('shows only a progress indicator while the access is being resolved', async () => {
    const usersService = createUsersServiceMock({
      [SUB]: { user: userDto({ auth0_id: SUB }), roles: [] },
    });
    const release = usersService.defer();

    renderWithProviders(routes, {
      route: '/access-denied',
      auth0: { isAuthenticated: true, user: auth0User({ sub: SUB }) },
    });

    expect(screen.getByRole('status', { name: messages.common.loading })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(usersService.requestCount).toBe(1);
    });

    release();

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.denied.title }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    // Still a single request: the loader did not cause (or need) any other call.
    expect(usersService.requestCount).toBe(1);
  });

  // US4: a failure of the check (never a reason by itself to deny or grant) shows the error
  // screen with "Reintentar", and the account e-mail, instead of the content of "Sin acceso".
  it('shows the check-failed screen on a server failure, and recovers on retry (FR-021, FR-024, FR-025)', async () => {
    const usersService = createUsersServiceMock({
      [SUB]: { user: userDto({ auth0_id: SUB }), roles: [] },
    });
    usersService.failWith(500);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: shouldRetryQuery, retryDelay: 0 } },
    });

    const { user, router } = renderWithProviders(routes, {
      route: '/access-denied',
      auth0: { isAuthenticated: true, user: auth0User({ sub: SUB, email: 'cuenta@ejemplo.com' }) },
      queryClient,
    });

    expect(
      await screen.findByRole('heading', { name: messages.checkFailed.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(messages.common.account('cuenta@ejemplo.com'))).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: messages.denied.title })).not.toBeInTheDocument();

    usersService.recover();
    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.denied.title }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/access-denied');
  });

  // FR-024, data-model.md: a role without `type` is a contract violation, treated as a failure
  // (never as access granted, and never as "Sin acceso").
  it('shows the check-failed screen when a role arrives without a type', async () => {
    createUsersServiceMock({});
    server.use(
      http.get(`${USERS_API_BASE_URL}/api/v1/authorization/me`, () =>
        HttpResponse.json({
          user: userDto({ auth0_id: SUB }),
          roles: [{ id: 4, name: 'Marketing', permissions: ['tenants:read'] }],
        }),
      ),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: shouldRetryQuery, retryDelay: 0 } },
    });

    renderWithProviders(routes, {
      route: '/access-denied',
      auth0: { isAuthenticated: true, user: auth0User({ sub: SUB }) },
      queryClient,
    });

    expect(
      await screen.findByRole('heading', { name: messages.checkFailed.title }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: messages.denied.title })).not.toBeInTheDocument();
  });

  it('sends a person with access to the Panel (FR-019)', async () => {
    createUsersServiceMock({
      [SUB]: {
        user: userDto({ auth0_id: SUB }),
        roles: [roleDto({ name: 'Marketing', permissions: ['tenants:read'] })],
      },
    });

    const { router } = renderWithProviders(routes, {
      route: '/access-denied',
      auth0: { isAuthenticated: true, user: auth0User({ sub: SUB }) },
    });

    await screen.findByText('Protected home');
    expect(router.state.location.pathname).toBe('/');
  });
});
