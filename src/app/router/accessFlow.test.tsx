import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ACCESS_RECHECK_INTERVAL_MS } from '@/features/auth/config/session';
import { messages } from '@/shared/messages/es';
import { auth0User } from '@/test/auth0Double';
import { roleDto, userDto } from '@/test/factories';
import { createUsersServiceMock } from '@/test/handlers/usersService';
import { renderWithProviders } from '@/test/renderWithProviders';

import { appRoutes } from './routes';

const SUB = 'auth0|user1';

afterEach(() => {
  vi.useRealTimers();
});

describe('access flow with the real routes', () => {
  it('asks for the sign-in without a session, and enters once the access is granted', async () => {
    const usersService = createUsersServiceMock({
      [SUB]: {
        user: userDto({ auth0_id: SUB, first_name: 'Ana', paternal_last_name: 'Pérez' }),
        roles: [roleDto({ name: 'Marketing', permissions: ['tenants:read'] })],
      },
    });
    const releaseAnswer = usersService.defer();
    const { updateAuth0, router } = renderWithProviders(appRoutes, { route: '/' });

    // US1-1: no session, no protected content.
    expect(
      await screen.findByRole('heading', { level: 1, name: messages.access.title }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/access');
    expect(usersService.requestCount).toBe(0);

    // The person signs in at Auth0 and comes back with a session.
    updateAuth0({ isAuthenticated: true, user: auth0User({ sub: SUB }) });

    // The access is still being resolved: only progress, nothing protected (FR-006).
    expect(
      await screen.findByRole('status', { name: messages.common.loading }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByText(messages.home.greeting('Ana Pérez'))).not.toBeInTheDocument();

    releaseAnswer();

    // US1-2 and US1-5: the home page, the Panel since feature 007, with the name of the operator.
    expect(
      await screen.findByRole('heading', { level: 1, name: messages.home.title }),
    ).toBeInTheDocument();
    expect(await screen.findByText(messages.home.greeting('Ana Pérez'))).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByRole('banner')).toHaveTextContent('Ana Pérez');
    expect(usersService.requestCount).toBe(1);
  });

  // US1-3: a role of type Sistema gives access whatever its name, including one outside the
  // fixed list feature 001 used to compare by name.
  it('enters with a role of type Sistema named outside the old fixed list of feature 001', async () => {
    createUsersServiceMock({
      [SUB]: {
        user: userDto({ auth0_id: SUB }),
        roles: [roleDto({ name: 'Support', permissions: [] })],
      },
    });

    const { router } = renderWithProviders(appRoutes, {
      route: '/',
      auth0: { isAuthenticated: true, user: auth0User({ sub: SUB }) },
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.home.title }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('sends an address that does not exist to the access screen when there is no session (FR-001)', async () => {
    createUsersServiceMock({});

    const { router } = renderWithProviders(appRoutes, { route: '/no-existe' });

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.access.title }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/access');
    expect(router.state.location.state).toEqual({ returnTo: '/no-existe' });
  });

  it('tells someone with access that an address does not exist, and offers the way home (FR-016)', async () => {
    createUsersServiceMock({
      [SUB]: {
        user: userDto({ auth0_id: SUB }),
        roles: [roleDto({ name: 'Marketing', permissions: ['tenants:read'] })],
      },
    });

    renderWithProviders(appRoutes, {
      route: '/no-existe',
      auth0: { isAuthenticated: true, user: auth0User({ sub: SUB }) },
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.notFound.title }),
    ).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: messages.notFound.backHome })).toHaveAttribute(
      'href',
      '/',
    );
    expect(document.title).toBe(`${messages.titles.notFound} — ${messages.common.appName}`);
  });

  it('keeps the address that was asked for while the person signs in', async () => {
    createUsersServiceMock({});

    const { router } = renderWithProviders(appRoutes, { route: '/?tab=2' });

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.access.title }),
    ).toBeInTheDocument();
    expect(router.state.location.state).toEqual({ returnTo: '/?tab=2' });
  });

  // US2-1, FR-018: a person without a role of type Sistema is sent to "Sin acceso", with its
  // own address, from any internal route — here the one that does not even exist.
  it('sends a person without access to "Sin acceso" from a non-existent address (FR-018)', async () => {
    createUsersServiceMock({
      [SUB]: { user: userDto({ auth0_id: SUB }), roles: [] },
    });

    const { router } = renderWithProviders(appRoutes, {
      route: '/no-existe',
      auth0: { isAuthenticated: true, user: auth0User({ sub: SUB }) },
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.denied.title }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/access-denied');
    expect(
      screen.queryByRole('heading', { name: messages.notFound.title }),
    ).not.toBeInTheDocument();
  });

  // US2-8, FR-019: opening "Sin acceso" with access already granted goes to the Panel.
  it('sends a person with access who opens "Sin acceso" to the Panel', async () => {
    createUsersServiceMock({
      [SUB]: {
        user: userDto({ auth0_id: SUB }),
        roles: [roleDto({ name: 'Marketing', permissions: ['tenants:read'] })],
      },
    });

    const { router } = renderWithProviders(appRoutes, {
      route: '/access-denied',
      auth0: { isAuthenticated: true, user: auth0User({ sub: SUB }) },
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.home.title }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  // US2-9, FR-020: without a session, "Sin acceso" is just another protected-looking address.
  it('sends a person without a session who opens "Sin acceso" to the access screen', async () => {
    createUsersServiceMock({});

    const { router } = renderWithProviders(appRoutes, { route: '/access-denied' });

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.access.title }),
    ).toBeInTheDocument();
    expect(router.state.location.state).toEqual({ returnTo: '/access-denied' });
  });

  // FR-023: a 403 of the access query itself is "sin acceso", not the generic "sin permiso para
  // esta acción" notice (which is about a 403 on an action the person takes, not about this).
  it('sends to "Sin acceso" on a 403 of the access query, without the global "sin permiso" notice', async () => {
    const usersService = createUsersServiceMock({
      [SUB]: { user: userDto({ auth0_id: SUB }), roles: [] },
    });
    usersService.failWith(403);

    const { router } = renderWithProviders(appRoutes, {
      route: '/',
      auth0: { isAuthenticated: true, user: auth0User({ sub: SUB }) },
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.denied.title }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/access-denied');
    expect(screen.queryByText(messages.forbidden.action)).not.toBeInTheDocument();
  });

  // US3-5, FR-009, Edge Cases: the periodic recheck (feature 001) applies the same rule, in
  // either direction, now that losing or gaining access means navigating, not drawing in place.
  describe('the periodic recheck navigates, it does not just redraw in place', () => {
    it('sends a granted person to "Sin acceso" once the recheck finds the role gone', async () => {
      const usersService = createUsersServiceMock({
        [SUB]: {
          user: userDto({ auth0_id: SUB }),
          roles: [roleDto({ name: 'Marketing', permissions: ['tenants:read'] })],
        },
      });
      vi.useFakeTimers();

      const { router } = renderWithProviders(appRoutes, {
        route: '/',
        auth0: { isAuthenticated: true, user: auth0User({ sub: SUB }) },
      });
      await act(async () => {
        await vi.waitFor(() => {
          expect(router.state.location.pathname).toBe('/');
        });
      });

      usersService.setRoles(SUB, []);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ACCESS_RECHECK_INTERVAL_MS);
        await vi.waitFor(() => {
          expect(router.state.location.pathname).toBe('/access-denied');
        });
      });
      expect(
        screen.getByRole('heading', { level: 1, name: messages.denied.title }),
      ).toBeInTheDocument();
    });

    it('sends a person on "Sin acceso" to the Panel once the recheck finds a role of type Sistema', async () => {
      const usersService = createUsersServiceMock({
        [SUB]: { user: userDto({ auth0_id: SUB }), roles: [] },
      });
      vi.useFakeTimers();

      const { router } = renderWithProviders(appRoutes, {
        route: '/access-denied',
        auth0: { isAuthenticated: true, user: auth0User({ sub: SUB }) },
      });
      await act(async () => {
        await vi.waitFor(() => {
          expect(router.state.location.pathname).toBe('/access-denied');
        });
      });

      usersService.setRoles(SUB, [roleDto({ name: 'Marketing', permissions: ['tenants:read'] })]);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ACCESS_RECHECK_INTERVAL_MS);
        await vi.waitFor(() => {
          expect(router.state.location.pathname).toBe('/');
        });
      });
      expect(
        screen.getByRole('heading', { level: 1, name: messages.home.title }),
      ).toBeInTheDocument();
    });
  });

  // US5: "Sin acceso" is left only by closing the session; closing it fully (also at the identity
  // provider, FR-016) means a different, granted account can then enter normally.
  it('ends the session fully from "Sin acceso" and lets a different, granted account enter', async () => {
    const OTHER_SUB = 'auth0|user2';
    createUsersServiceMock({
      [SUB]: { user: userDto({ auth0_id: SUB }), roles: [] },
      [OTHER_SUB]: {
        user: userDto({ auth0_id: OTHER_SUB, first_name: 'Beatriz' }),
        roles: [roleDto({ name: 'Marketing', permissions: ['tenants:read'] })],
      },
    });

    const { user, updateAuth0, auth0, router } = renderWithProviders(appRoutes, {
      route: '/',
      auth0: { isAuthenticated: true, user: auth0User({ sub: SUB }) },
    });
    await screen.findByRole('heading', { level: 1, name: messages.denied.title });
    expect(router.state.location.pathname).toBe('/access-denied');

    await user.click(screen.getByRole('button', { name: messages.common.logout }));

    expect(auth0.logout).toHaveBeenCalledExactlyOnceWith({
      logoutParams: { returnTo: `${window.location.origin}/access` },
    });

    // The identity provider asked for credentials again; this is a different person entering.
    updateAuth0({ isAuthenticated: true, user: auth0User({ sub: OTHER_SUB }) });

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.home.title }),
    ).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveTextContent('Beatriz');
  });
});
