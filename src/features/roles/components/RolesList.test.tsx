import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';

import { RolesList } from './RolesList';

const ADMIN_SUB = 'auth0|roles-admin';

function start() {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock(scenario.directory);
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

function renderList(route: string, canCreate = true) {
  return renderWithProviders(<RolesList canCreate={canCreate} onNewRole={() => undefined} />, {
    route,
    auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) },
  });
}

describe('RolesList', () => {
  it('lists the roles of the active tab (Clínica by default), each with its permission count', async () => {
    start();

    renderList('/roles');

    const list = await screen.findByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining('Owner'), expect.stringContaining('Doctor')]),
    );
    await waitFor(() => {
      expect(screen.getAllByText('0 permisos').length).toBeGreaterThan(0);
    });
  });

  it('lists the roles of the Sistema tab, with their granted permission counts', async () => {
    start();

    renderList('/roles?type=sistema');

    await screen.findByText('Administrator');
    await waitFor(() => {
      expect(screen.getByText(/16 permisos/)).toBeInTheDocument();
    });
  });

  it("shows an empty state with 'Nuevo role' for a type with no roles yet", async () => {
    const { users } = start();
    for (const role of [...users.state.roles()]) {
      if (role.typeId === 2) {
        users.setRoleStatus(role.id, 3);
      }
    }

    renderList('/roles');

    expect(await screen.findByRole('button', { name: /Nuevo role/ })).toBeInTheDocument();
  });

  it('does not offer "Nuevo role" in the empty state without permission to create', async () => {
    const { users } = start();
    for (const role of [...users.state.roles()]) {
      if (role.typeId === 2) {
        users.setRoleStatus(role.id, 3);
      }
    }

    renderList('/roles', false);

    await screen.findByText(/Todavía no hay roles/);
    expect(screen.queryByRole('button', { name: /Nuevo role/ })).not.toBeInTheDocument();
  });
});
