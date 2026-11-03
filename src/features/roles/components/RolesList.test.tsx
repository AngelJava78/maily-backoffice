import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { toRoleRecordDto } from '@/test/handlers/usersDirectory/model';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/server';
import { usersUrl } from '@/test/usersClient';

import { RolesList } from './RolesList';

const ADMIN_SUB = 'auth0|roles-admin';
const BLOCKED = 2;
const DELETED = 3;
const text = messages.roles.list;

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
  it('lists the roles of both types with Todos, each with its type and permission count (FR-006)', async () => {
    start();

    renderList('/roles');

    const list = await screen.findByRole('list', { name: text.label });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(9);
    expect(items.map((item) => item.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Owner'),
        expect.stringContaining('Administrator'),
      ]),
    );
    await waitFor(() => {
      expect(within(list).getAllByText('Clínica · 0 permisos')).toHaveLength(4);
    });
    expect(within(list).getByText('Sistema · 16 permisos')).toBeVisible();
  });

  it('lists only the Sistema roles with type=sistema, with their granted permission counts', async () => {
    start();

    renderList('/roles?type=sistema');

    await screen.findByText('Administrator');
    expect(screen.queryByText('Owner')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/16 permisos/)).toBeInTheDocument();
    });
  });

  it('lists only the blocked roles with status=bloqueados, without a count nor asking for their permissions (FR-012)', async () => {
    const { users, roles } = start();
    users.setRoleStatus(7, BLOCKED);

    renderList('/roles?status=bloqueados');

    const list = await screen.findByRole('list', { name: text.label });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('Doctor')).toBeVisible();
    expect(within(list).getByText('Clínica')).toBeVisible();
    expect(screen.queryByText(/permisos/)).not.toBeInTheDocument();
    expect(roles.requests.filter((request) => request.path.endsWith('/permissions'))).toEqual([]);
  });

  it.each([
    ['/roles', text.emptyAll, () => false],
    ['/roles?type=sistema', text.emptySistema, (typeId: number) => typeId === 2],
    ['/roles?type=clinica', text.emptyClinica, (typeId: number) => typeId === 1],
  ])(
    'shows the empty state of %s when there is no role to show (FR-018)',
    async (route, message, kept) => {
      const { users } = start();
      // The service answers with only the roles kept; deleting the others in the simulator would
      // also take away the operator's own Administrator role, and with it the access to the list.
      server.use(
        http.get(usersUrl('/api/v1/roles'), () =>
          HttpResponse.json(
            users.state
              .roles()
              .filter((role) => role.statusId === 1 && kept(role.typeId))
              .map(toRoleRecordDto),
          ),
        ),
      );

      renderList(route);

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Nuevo role/ })).toBeInTheDocument();
    },
  );

  it('shows that there are no blocked roles, still offering "Nuevo role" (FR-018)', async () => {
    start();

    renderList('/roles?status=bloqueados&type=sistema');

    expect(await screen.findByText(text.emptyBlocked)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nuevo role/ })).toBeInTheDocument();
  });

  it('a failure of the list shows an error with a retry, which asks again', async () => {
    const { users } = start();
    users.failNext({ method: 'GET', path: '/api/v1/roles', status: 500, code: 'internal_error' });
    const { user } = renderList('/roles');

    await user.click(await screen.findByRole('button', { name: messages.common.retry }));

    expect(await screen.findByText('Owner')).toBeInTheDocument();
  });

  it('offers "Nuevo role" above the list even when it is not empty', async () => {
    start();

    renderList('/roles');

    await screen.findByText('Owner');
    expect(screen.getByRole('button', { name: /Nuevo role/ })).toBeInTheDocument();
  });

  it('does not offer "Nuevo role" in the empty state without permission to create', async () => {
    const { users } = start();
    for (const role of [...users.state.roles()]) {
      if (role.typeId === 2) {
        users.setRoleStatus(role.id, DELETED);
      }
    }

    renderList('/roles?type=clinica', false);

    await screen.findByText(/Todavía no hay roles/);
    expect(screen.queryByRole('button', { name: /Nuevo role/ })).not.toBeInTheDocument();
  });
});
