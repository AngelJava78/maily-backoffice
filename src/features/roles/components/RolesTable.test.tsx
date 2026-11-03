import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';
import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock, directoryRole } from '@/test/handlers/usersDirectory';
import { USERS_API_BASE_URL } from '@/test/handlers/usersService';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/server';

import { roleKeys } from '../hooks/roleKeys';
import type { RolePermissionsLocationApi } from '../hooks/useRolePermissionsLocation';
import { RolesTable } from './RolesTable';

const ADMIN_SUB = 'auth0|roles-admin';
const BLOCKED = 2;
const text = messages.roles.list;

/**
 * The seed (5 Sistema, 4 Clínica, all active), plus the roles named in `extraNames`, of Sistema and
 * sorted after the seed ones: «Zeta A» is role 20, «Zeta B» 21, and so on.
 */
function start(extraNames: readonly string[] = []) {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock({
    ...scenario.directory,
    roles: [
      ...scenario.directory.roles,
      ...extraNames.map((name, index) => directoryRole({ id: 20 + index, name, typeId: 1 })),
    ],
  });
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

function renderTable(props: Partial<Parameters<typeof RolesTable>[0]> = {}) {
  const setPage = vi.fn<RolePermissionsLocationApi['setPage']>();
  const setPageSize = vi.fn<RolePermissionsLocationApi['setPageSize']>();
  const view = renderWithProviders(
    <RolesTable
      type="all"
      status="active"
      page={1}
      pageSize={10}
      listSearch=""
      setPage={setPage}
      setPageSize={setPageSize}
      {...props}
    />,
    { auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) } },
  );
  return { ...view, setPage, setPageSize };
}

const grid = () => screen.getByRole('grid', { name: text.gridLabel });
const names = () =>
  within(grid())
    .getAllByRole('link')
    .map((link) => link.textContent);
const rowOf = (name: string) => {
  const row = screen.getByRole('link', { name }).closest<HTMLElement>('[role="row"]');
  if (row === null) {
    throw new Error(`No row around ${name}`);
  }
  return row;
};
/** What the table says in its own box: the same message is also written in the status region. */
const saysInTheGrid = async (message: string) =>
  within(await screen.findByRole('grid', { name: text.gridLabel })).findByText(message);
/** The requests for the permissions of a role: the counter of its row. */
const permissionRequests = (roles: ReturnType<typeof start>['roles']) =>
  roles.requests.filter((request) => /^\/api\/v1\/roles\/\d+\/permissions$/.test(request.path));

const SEED_NAMES = [
  'Administrator',
  'Billing',
  'Developer',
  'Doctor',
  'Marketing',
  'Nurse',
  'Owner',
  'Receptionist',
  'Support',
];

describe('RolesTable', () => {
  it('shows a row for each active role, in the order of the service, with its total of permissions (FR-002, FR-003)', async () => {
    start();
    renderTable();

    await screen.findByRole('link', { name: 'Owner' });

    expect(names()).toEqual(SEED_NAMES);
    // Administrator has the 16 permissions of Sistema in the seed; the others have none.
    await waitFor(() => {
      expect(within(rowOf('Administrator')).getByText(text.permissionsCount(16))).toBeVisible();
    });
    expect(within(rowOf('Developer')).getByText('0 permisos')).toBeVisible();
  });

  it('shows the first page of the roles, with the range of the footer (FR-004)', async () => {
    start(['Zeta A', 'Zeta B', 'Zeta C']);
    renderTable();

    await screen.findByRole('link', { name: 'Zeta A' });

    expect(names()).toEqual([...SEED_NAMES, 'Zeta A']);
    expect(screen.getByText('1–10 de 12')).toBeInTheDocument();
  });

  it('shows the second page: the rows after the first ten, and never more than the page size', async () => {
    start(['Zeta A', 'Zeta B', 'Zeta C']);
    renderTable({ page: 2 });

    await screen.findByRole('link', { name: 'Zeta B' });

    expect(names()).toEqual(['Zeta B', 'Zeta C']);
    expect(screen.getByText('11–12 de 12')).toBeInTheDocument();
  });

  it('shows every role on one page with 25 per page', async () => {
    start(['Zeta A', 'Zeta B', 'Zeta C']);
    renderTable({ pageSize: 25 });

    await screen.findByRole('link', { name: 'Zeta C' });

    expect(names()).toHaveLength(12);
    expect(screen.getByText('1–12 de 12')).toBeInTheDocument();
  });

  it('asks for the permissions only of the roles of the page that is shown (research D4, SC-010)', async () => {
    const { roles } = start(['Zeta A', 'Zeta B', 'Zeta C']);
    renderTable();

    await screen.findByRole('link', { name: 'Zeta A' });
    await waitFor(() => {
      expect(permissionRequests(roles)).toHaveLength(10);
    });

    const asked = permissionRequests(roles).map((request) => request.path);
    expect(asked).toContain('/api/v1/roles/20/permissions');
    expect(asked).not.toContain('/api/v1/roles/21/permissions');
    expect(asked).not.toContain('/api/v1/roles/22/permissions');
  });

  it('shows the blocked roles as Bloqueado with «—» for their permissions, and asks for none (FR-003, US1-8)', async () => {
    const { users, roles } = start();
    users.setRoleStatus(3, BLOCKED);
    users.setRoleStatus(8, BLOCKED);
    renderTable({ status: 'blocked' });

    await screen.findByRole('link', { name: 'Support' });

    expect(names()).toEqual(['Nurse', 'Support']);
    for (const name of ['Nurse', 'Support']) {
      expect(within(rowOf(name)).getByText(text.status.blocked)).toBeVisible();
      expect(within(rowOf(name)).getByText(text.noValue)).toBeVisible();
    }
    expect(permissionRequests(roles)).toEqual([]);
  });

  it('indicates that it is loading until the roles arrive (US1-10)', async () => {
    start();
    renderTable();

    // With no rows yet, the grid says it loads with its skeleton; it does not say «no roles».
    expect(document.querySelector('.MuiDataGrid-skeletonLoadingOverlay')).not.toBeNull();
    expect(screen.queryByText(text.emptyAll)).not.toBeInTheDocument();

    await screen.findByRole('link', { name: 'Owner' });
    expect(document.querySelector('.MuiDataGrid-skeletonLoadingOverlay')).toBeNull();
  });

  it('shows an error with a retry in place of the table, and the retry brings the roles back (FR-009)', async () => {
    const { users } = start();
    users.failNext({ method: 'GET', path: '/api/v1/roles', status: 500, code: 'internal_error' });
    const { user } = renderTable();

    expect(await screen.findByText(text.loadError.title)).toBeVisible();
    expect(screen.getByText(text.loadError.message)).toBeVisible();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    expect(await screen.findByRole('link', { name: 'Owner' })).toBeVisible();
    expect(screen.queryByText(text.loadError.title)).not.toBeInTheDocument();
  });

  it.each([
    ['all', 'active', text.emptyAll, true],
    ['system', 'active', text.emptySistema, true],
    ['clinic', 'active', text.emptyClinica, true],
    ['all', 'blocked', text.emptyBlocked, false],
    ['system', 'blocked', text.emptyBlocked, false],
  ] as const)(
    'with %s and %s and no roles that answer, says %j, and offers creating one only with Activos (US1-9)',
    async (type, status, message, offersCreating) => {
      // The service answers with an empty list: blocking every role would also take the access of
      // the operator, whose own role is one of them.
      server.use(http.get(`${USERS_API_BASE_URL}/api/v1/roles`, () => HttpResponse.json([])));
      renderTable({ type, status, emptyAction: <button type="button">Nuevo role</button> });

      expect(await saysInTheGrid(message)).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Nuevo role' }) !== null).toBe(offersCreating);
    },
  );

  it('turns the footer into calls to change the page and the page size', async () => {
    start(['Zeta A', 'Zeta B', 'Zeta C']);
    const { user, setPage, setPageSize } = renderTable();
    await screen.findByRole('link', { name: 'Zeta A' });

    await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }));
    expect(setPage).toHaveBeenCalledWith(2);

    await user.click(screen.getByLabelText(/filas por página/i));
    await user.click(screen.getByRole('option', { name: '25' }));
    expect(setPageSize).toHaveBeenCalledWith(25);
  });

  describe('a page after the last one (FR-018, US4-3)', () => {
    it('is corrected to the last page, in place of its entry of the history, and not before the roles arrive', async () => {
      start(['Zeta A', 'Zeta B', 'Zeta C']);
      const { setPage } = renderTable({ page: 9 });

      // The roles are what tells how many pages there are: until they arrive, nothing is rewritten.
      expect(setPage).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(setPage).toHaveBeenCalledWith(2, { replace: true });
      });
      // Meanwhile the grid is already on the last page, not on an empty one.
      expect(names()).toEqual(['Zeta B', 'Zeta C']);
      expect(screen.getByText('11–12 de 12')).toBeInTheDocument();
    });

    it('is corrected when the roles of the last page leave the list while the table is open', async () => {
      const { users } = start(['Zeta A', 'Zeta B']);
      const { setPage, queryClient } = renderTable({ page: 2 });
      await screen.findByRole('link', { name: 'Zeta B' });
      expect(setPage).not.toHaveBeenCalled();

      // Blocked from another session: the list is asked for again and has ten roles, one page.
      users.setRoleStatus(21, BLOCKED);
      await act(async () => {
        await queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      });

      await waitFor(() => {
        expect(setPage).toHaveBeenCalledWith(1, { replace: true });
      });
      expect(names()).toEqual([...SEED_NAMES, 'Zeta A']);
    });

    it('goes to the first page when there are no roles at all', async () => {
      server.use(http.get(`${USERS_API_BASE_URL}/api/v1/roles`, () => HttpResponse.json([])));
      const { setPage } = renderTable({ page: 3 });

      await waitFor(() => {
        expect(setPage).toHaveBeenCalledWith(1, { replace: true });
      });
      expect(await saysInTheGrid(text.emptyAll)).toBeVisible();
    });

    it('leaves a page that exists as it is', async () => {
      start(['Zeta A', 'Zeta B', 'Zeta C']);
      const { setPage } = renderTable({ page: 2 });

      await screen.findByRole('link', { name: 'Zeta B' });
      await waitFor(() => {
        expect(screen.getByText('11–12 de 12')).toBeInTheDocument();
      });

      expect(setPage).not.toHaveBeenCalled();
    });
  });

  describe('what a screen reader is told when the rows change (FR-021)', () => {
    const region = () => screen.getByRole('status');

    it('tells which roles are shown once they arrive, in a region that was already there', async () => {
      start(['Zeta A', 'Zeta B', 'Zeta C']);
      renderTable();
      const before = region();

      // Nothing while the roles load: a live region only reads what is written into it later.
      expect(before).toBeEmptyDOMElement();
      await waitFor(() => {
        expect(before).toHaveTextContent(text.pageStatus(1, 10, 12));
      });
      expect(region()).toBe(before);
    });

    it('tells the rows of the second page', async () => {
      start(['Zeta A', 'Zeta B', 'Zeta C']);

      renderTable({ page: 2 });

      await waitFor(() => {
        expect(region()).toHaveTextContent(text.pageStatus(11, 12, 12));
      });
    });

    it('tells the rows that the Tipo filter leaves, counting only those', async () => {
      start(['Zeta A']);

      renderTable({ type: 'clinic' });

      await waitFor(() => {
        expect(region()).toHaveTextContent(text.pageStatus(1, 4, 4));
      });
    });

    it('tells that there are no roles when none answers the filters', async () => {
      server.use(http.get(`${USERS_API_BASE_URL}/api/v1/roles`, () => HttpResponse.json([])));

      renderTable({ type: 'system', status: 'blocked' });

      await waitFor(() => {
        expect(region()).toHaveTextContent(text.emptyBlocked);
      });
    });

    it('tells nothing while it corrects a page that does not exist', async () => {
      start(['Zeta A', 'Zeta B', 'Zeta C']);
      const { setPage } = renderTable({ page: 9 });

      await waitFor(() => {
        expect(setPage).toHaveBeenCalledWith(2, { replace: true });
      });

      expect(region()).toBeEmptyDOMElement();
    });
  });

  it('carries the search of the table to the detail of the role it opens (research D6)', async () => {
    start();
    const { user, router } = renderTable({ listSearch: '?type=sistema' });

    await user.click(await screen.findByRole('link', { name: 'Billing' }));

    expect(router.state.location.pathname).toBe('/roles/5');
    expect(router.state.location.state).toEqual({ listSearch: '?type=sistema' });
  });
});
