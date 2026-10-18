import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { auth0User } from '@/test/auth0Double';
import { roleDto, userDto } from '@/test/factories';
import { createUsersServiceMock } from '@/test/handlers/usersService';
import { renderWithProviders } from '@/test/renderWithProviders';

import { appRoutes } from './routes';

const SUB = 'auth0|user1';

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

    // US1-2 and US1-5: the home page with the name of the operator.
    expect(
      await screen.findByRole('heading', { level: 1, name: messages.home.greeting('Ana Pérez') }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByRole('banner')).toHaveTextContent('Ana Pérez');
    expect(usersService.requestCount).toBe(1);
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
});
