import { screen } from '@testing-library/react';
import type { RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { operatorAccess } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

import { RequirePermission } from './RequirePermission';

const routes: RouteObject[] = [
  { path: '/', element: <p>Home screen</p> },
  {
    path: '/users',
    element: (
      <RequirePermission resource="users">
        <p>Users section</p>
      </RequirePermission>
    ),
  },
];

function accessWith(...permissions: string[]) {
  return operatorAccess({ permissions: new Set(permissions) });
}

describe('RequirePermission', () => {
  it('renders the section for someone who can read its resource', () => {
    renderWithProviders(routes, { route: '/users', access: accessWith('users:read') });

    expect(screen.getByText('Users section')).toBeInTheDocument();
    expect(screen.queryByText(messages.home.permissionsChanged)).not.toBeInTheDocument();
  });

  it('sends someone who cannot read it to the home page, with a notice (US2-8, FR-021)', async () => {
    const { router } = renderWithProviders(routes, {
      route: '/users',
      access: accessWith('tenants:read'),
    });

    expect(await screen.findByText(messages.home.permissionsChanged)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByText('Home screen')).toBeInTheDocument();
    expect(screen.queryByText('Users section')).not.toBeInTheDocument();
  });

  it('does not count write, update or delete as the right to see the section', async () => {
    const { router } = renderWithProviders(routes, {
      route: '/users',
      access: accessWith('users:write', 'users:update', 'users:delete'),
    });

    expect(await screen.findByText(messages.home.permissionsChanged)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('reacts when the permission is withdrawn while the person is in the section', async () => {
    const { router, updateAccess } = renderWithProviders(routes, {
      route: '/users',
      access: accessWith('users:read'),
    });
    expect(screen.getByText('Users section')).toBeInTheDocument();

    await updateAccess(accessWith('tenants:read'));

    expect(await screen.findByText(messages.home.permissionsChanged)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(screen.queryByText('Users section')).not.toBeInTheDocument();
  });

  it('keeps the section when other permissions change but the read one stays', async () => {
    const { updateAccess } = renderWithProviders(routes, {
      route: '/users',
      access: accessWith('users:read', 'users:write'),
    });

    await updateAccess(accessWith('users:read'));

    expect(screen.getByText('Users section')).toBeInTheDocument();
    expect(screen.queryByText(messages.home.permissionsChanged)).not.toBeInTheDocument();
  });
});
