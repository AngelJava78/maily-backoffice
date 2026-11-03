import { act, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock, directoryRole } from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';

import { RolesPage } from './RolesPage';

const ADMIN_SUB = 'auth0|roles-admin';
const CAPABILITIES = { canCreate: true, canEdit: true, canDelete: true };
const BLOCKED = 2;
const text = messages.roles;

/**
 * The seed (5 Sistema, 4 Clínica, all active), plus `extra` roles of Sistema named «Zeta 01», «Zeta
 * 02»… that sort after the seed ones, so that the table has more than one page.
 */
function start(extra = 0) {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock({
    ...scenario.directory,
    roles: [
      ...scenario.directory.roles,
      ...Array.from({ length: extra }, (_, index) =>
        directoryRole({
          id: 20 + index,
          name: `Zeta ${String(index + 1).padStart(2, '0')}`,
          typeId: 1,
        }),
      ),
    ],
  });
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

/** The page at `/roles`, with a marker where the detail of a role will be (feature 027, US2). */
function renderPage(route = '/roles', capabilities = CAPABILITIES) {
  return renderWithProviders(
    [
      { path: '/roles', element: <RolesPage capabilities={capabilities} /> },
      { path: '/roles/:roleId', element: <p>Detalle de un role</p> },
    ],
    { route, auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) } },
  );
}

const typeGroup = () => screen.getByRole('group', { name: text.filters.typeLabel });
const statusGroup = () => screen.getByRole('group', { name: text.filters.statusLabel });
const typeButton = (name: string) => within(typeGroup()).getByRole('button', { name });
const statusButton = (name: string) => within(statusGroup()).getByRole('button', { name });
const grid = () => screen.getByRole('grid', { name: text.list.gridLabel });
const names = () =>
  within(grid())
    .getAllByRole('link')
    .map((link) => link.textContent);
/** What the table says in its own box: the same message is also written in the status region. */
const saysInTheGrid = async (message: string) =>
  within(await screen.findByRole('grid', { name: text.list.gridLabel })).findByText(message);
const rowOf = (name: string) => {
  const row = screen.getByRole('link', { name }).closest<HTMLElement>('[role="row"]');
  if (row === null) {
    throw new Error(`No row around ${name}`);
  }
  return row;
};

/** Fills in «Nuevo role» with a name and a type, and creates the role. */
async function createRole(user: ReturnType<typeof renderPage>['user'], name: string, type: string) {
  await user.click(await screen.findByRole('button', { name: text.newRole }));
  const dialog = await screen.findByRole('dialog');
  await user.type(within(dialog).getByLabelText(text.detail.fields.name), name);
  // Within the dialog: the Tipo filter of the page has the same accessible name.
  await user.click(within(dialog).getByLabelText(text.detail.fields.type));
  await user.click(screen.getByRole('option', { name: type }));
  await user.click(within(dialog).getByRole('button', { name: text.form.create }));
}

const isDetailAddress = (pathname: string) => /^\/roles\/\d+$/.test(pathname);

describe('RolesPage', () => {
  it('shows the title with «Nuevo role», Todos and Activos pressed, and the roles of both types in a table (FR-001, US1-1)', async () => {
    start();

    renderPage();

    expect(screen.getByRole('heading', { name: text.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: text.newRole })).toBeInTheDocument();
    expect(typeButton(text.filters.type.all)).toHaveAttribute('aria-pressed', 'true');
    expect(statusButton(text.filters.status.active)).toHaveAttribute('aria-pressed', 'true');
    await screen.findByRole('link', { name: 'Owner' });
    expect(names()).toContain('Administrator');
    expect(names()).toContain('Owner');
  });

  it('has neither the list on the left nor the panel on the right nor «Elige un role…» any more (US1-1)', async () => {
    start();

    renderPage();

    await screen.findByRole('link', { name: 'Owner' });
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByText(/Elige un role/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(text.detail.fields.name)).not.toBeInTheDocument();
  });

  it('offers «Nuevo role» only to whoever can create roles (FR-010)', async () => {
    start();

    renderPage('/roles', { canCreate: false, canEdit: true, canDelete: true });

    await screen.findByRole('link', { name: 'Owner' });
    expect(screen.queryByRole('button', { name: text.newRole })).not.toBeInTheDocument();
  });

  it('pressing Sistema shows only the Sistema roles and writes it to the address (US1-7)', async () => {
    start();
    const { router, user } = renderPage();
    await screen.findByRole('link', { name: 'Owner' });

    await user.click(typeButton(text.filters.type.system));

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Owner' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Administrator' })).toBeInTheDocument();
    expect(typeButton(text.filters.type.system)).toHaveAttribute('aria-pressed', 'true');
    expect(router.state.location.search).toBe('?type=sistema');
  });

  it('Bloqueados shows only the blocked roles, as Bloqueado and with «—» for their permissions (US1-8)', async () => {
    const { users } = start();
    users.setRoleStatus(7, BLOCKED);
    const { router, user } = renderPage();
    await screen.findByRole('link', { name: 'Owner' });

    await user.click(statusButton(text.filters.status.blocked));

    await screen.findByRole('link', { name: 'Doctor' });
    expect(names()).toEqual(['Doctor']);
    expect(within(rowOf('Doctor')).getByText(text.list.status.blocked)).toBeVisible();
    expect(within(rowOf('Doctor')).getByText(text.list.noValue)).toBeVisible();
    expect(router.state.location.search).toBe('?status=bloqueados');
  });

  it('changing a filter from a later page goes back to the first and keeps the page size (FR-007)', async () => {
    start(30);
    const { router, user } = renderPage('/roles?page=2&page_size=25');
    await screen.findByRole('link', { name: 'Zeta 30' });

    await user.click(typeButton(text.filters.type.system));

    await waitFor(() => {
      expect(router.state.location.search).toBe('?type=sistema&page_size=25');
    });
    await screen.findByRole('link', { name: 'Administrator' });
    expect(screen.getByText(/1–25 de 35/)).toBeInTheDocument();
  });

  it('keeps «Nuevo role» with Bloqueados too, because a new role is always born active (FR-010)', async () => {
    start();

    renderPage('/roles?status=bloqueados');

    expect(await saysInTheGrid(text.list.emptyBlocked)).toBeVisible();
    expect(screen.getByRole('button', { name: text.newRole })).toBeInTheDocument();
  });

  it('a failure loading the list shows an error with a retry, keeping the title, the filters and «Nuevo role» (FR-009, US1-11)', async () => {
    const { users } = start();
    users.failNext({ method: 'GET', path: '/api/v1/roles', status: 500, code: 'internal_error' });

    renderPage('/roles?status=bloqueados');

    expect(await screen.findByRole('button', { name: messages.common.retry })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: text.title, level: 1 })).toBeVisible();
    expect(statusButton(text.filters.status.blocked)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: text.newRole })).toBeVisible();
  });

  describe('the address', () => {
    it.each([
      ['/roles?type=clinica', text.filters.type.clinic, 'Owner', 'Administrator'],
      ['/roles?type=sistema', text.filters.type.system, 'Administrator', 'Owner'],
    ])(
      'an address from before feature 027 (%s) still opens that type, with Activos (FR-019)',
      async (route, pressed, shown, hidden) => {
        start();

        renderPage(route);

        await screen.findByRole('link', { name: shown });
        expect(screen.queryByRole('link', { name: hidden })).not.toBeInTheDocument();
        expect(typeButton(pressed)).toHaveAttribute('aria-pressed', 'true');
        expect(statusButton(text.filters.status.active)).toHaveAttribute('aria-pressed', 'true');
      },
    );

    it('an address with invalid values opens with the defaults, without an error (FR-018)', async () => {
      start();
      const { router } = renderPage('/roles?type=xyz&status=borrados&page=0&page_size=7');

      await screen.findByRole('link', { name: 'Owner' });
      expect(typeButton(text.filters.type.all)).toHaveAttribute('aria-pressed', 'true');
      await waitFor(() => {
        expect(router.state.location.search).toBe('');
      });
    });

    it.each(['?type=clinica', '?status=bloqueados'])(
      'an address with only a filter (%s) is still the table, and is not redirected anywhere (FR-019)',
      async (search) => {
        start();
        const { router } = renderPage(`/roles${search}`);

        expect(await screen.findByRole('grid', { name: text.list.gridLabel })).toBeVisible();
        expect(router.state.location.pathname).toBe('/roles');
        expect(router.state.location.search).toBe(search);
      },
    );
  });

  describe('keyboard, screen reader and accessibility (US5, FR-021, FR-022, SC-009)', () => {
    /** What the focus lands on with Tab, by the name a person hears: its label or its text. */
    async function tabThrough(user: ReturnType<typeof renderPage>['user'], steps: number) {
      const reached: string[] = [];
      for (let step = 0; step < steps; step += 1) {
        await user.tab();
        const element = document.activeElement;
        reached.push(element?.getAttribute('aria-label') ?? element?.textContent ?? '');
      }
      return reached;
    }

    it('reaches the filters, «Nuevo role», the first name and the controls of the footer with Tab (US5-1)', async () => {
      start(3);
      const { user } = renderPage();
      await screen.findByRole('link', { name: 'Administrator' });

      const reached = await tabThrough(user, 30);

      // Each group of filters is a single stop of the Tab key, as in users: the arrows move within it.
      for (const name of [
        text.newRole,
        text.filters.type.all,
        text.filters.status.active,
        'Administrator',
        'Ir a la página siguiente',
      ]) {
        expect(reached).toContain(name);
      }
    });

    it('moves through the buttons of a group of filters with the arrows, and presses one with Space (US5-1)', async () => {
      start();
      const { user, router } = renderPage();
      await screen.findByRole('link', { name: 'Administrator' });
      typeButton(text.filters.type.all).focus();

      await user.keyboard('{ArrowRight}');
      expect(typeButton(text.filters.type.system)).toHaveFocus();
      await user.keyboard(' ');

      await waitFor(() => {
        expect(router.state.location.search).toBe('?type=sistema');
      });
      expect(typeButton(text.filters.type.system)).toHaveFocus();
    });

    it('opens the detail of a role with Enter on its name (US5-1)', async () => {
      start();
      const { user, router } = renderPage();
      const link = await screen.findByRole('link', { name: 'Billing' });

      link.focus();
      await user.keyboard('{Enter}');

      expect(router.state.location.pathname).toBe('/roles/5');
    });

    it('keeps the focus on the control that was used when paging with the keyboard, and when pressing a filter (WCAG 2.4.3, FR-021)', async () => {
      start(30);
      const { user } = renderPage();
      await screen.findByRole('link', { name: 'Administrator' });

      screen.getByRole('button', { name: 'Ir a la página siguiente' }).focus();
      await user.keyboard('{Enter}');
      await screen.findByText('11–20 de 39');
      expect(screen.getByRole('button', { name: 'Ir a la página siguiente' })).toHaveFocus();

      typeButton(text.filters.type.system).focus();
      await user.keyboard(' ');
      await screen.findByText('1–10 de 35');
      expect(typeButton(text.filters.type.system)).toHaveFocus();
    });

    it('tells which roles are shown whenever the page or a filter changes, in a region that was already there', async () => {
      start(3);
      const { user } = renderPage();
      await screen.findByRole('link', { name: 'Administrator' });
      const region = screen.getByRole('status');
      await waitFor(() => {
        expect(region).toHaveTextContent(text.list.pageStatus(1, 10, 12));
      });

      await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }));
      await waitFor(() => {
        expect(region).toHaveTextContent(text.list.pageStatus(11, 12, 12));
      });

      await user.click(typeButton(text.filters.type.clinic));
      await waitFor(() => {
        expect(region).toHaveTextContent(text.list.pageStatus(1, 4, 4));
      });
      expect(screen.getByRole('status')).toBe(region);
    });

    it('has a name for the table, and each row is read with its cells (US5-2)', async () => {
      start();
      renderPage();
      await screen.findByRole('link', { name: 'Administrator' });

      expect(grid()).toHaveAccessibleName(text.list.gridLabel);
      await waitFor(() => {
        expect(
          within(rowOf('Administrator'))
            .getAllByRole('gridcell')
            .map((cell) => cell.textContent),
        ).toEqual(['Administrator', text.list.status.active, 'Sistema', '16 permisos']);
      });
      expect(
        within(grid())
          .getAllByRole('columnheader')
          .map((header) => header.textContent),
      ).toEqual([
        text.list.columns.name,
        text.list.columns.status,
        text.list.columns.type,
        text.list.columns.permissions,
      ]);
    });

    it('has no accessibility violations with the table', async () => {
      start();
      const { container } = renderPage();
      await screen.findByRole('link', { name: 'Owner' });

      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no accessibility violations with Bloqueados', async () => {
      const { users } = start();
      users.setRoleStatus(7, BLOCKED);
      const { container } = renderPage('/roles?status=bloqueados');
      await screen.findByRole('link', { name: 'Doctor' });

      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no accessibility violations with the empty state', async () => {
      start();
      const { container } = renderPage('/roles?status=bloqueados');
      await saysInTheGrid(text.list.emptyBlocked);

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('a link from before feature 027 (?roleId=)', () => {
    it('opens the detail of the role, in place of its own entry of the history, with no table to go back to (FR-019, US4-4)', async () => {
      start();

      const { router } = renderPage('/roles?roleId=7');

      expect(await screen.findByText('Detalle de un role')).toBeVisible();
      expect(router.state.location.pathname).toBe('/roles/7');
      expect(router.state.historyAction).toBe('REPLACE');
      expect(router.state.location.state).toBeNull();
    });

    it('keeps the Tipo and Estatus of the old address as the table that the detail goes back to (US4-4)', async () => {
      start();

      const { router } = renderPage('/roles?type=clinica&status=bloqueados&roleId=8');

      expect(await screen.findByText('Detalle de un role')).toBeVisible();
      expect(router.state.location.pathname).toBe('/roles/8');
      expect(router.state.location.state).toEqual({
        listSearch: '?type=clinica&status=bloqueados',
      });
    });

    it('does not carry a page or a page size, which the old table did not have (US4-4)', async () => {
      start();

      const { router } = renderPage('/roles?type=sistema&page=3&page_size=25&roleId=2');

      expect(await screen.findByText('Detalle de un role')).toBeVisible();
      expect(router.state.location.state).toEqual({ listSearch: '?type=sistema' });
    });

    it.each(['007', 'abc', '0', '-3', '1.5'])(
      'ignores an id that is not one (?roleId=%s): the table opens with its normal address, with no error (US4-5)',
      async (roleId) => {
        start();

        const { router } = renderPage(`/roles?roleId=${roleId}`);

        expect(await screen.findByRole('link', { name: 'Owner' })).toBeVisible();
        await waitFor(() => {
          expect(router.state.location.search).toBe('');
        });
        expect(router.state.location.pathname).toBe('/roles');
        expect(screen.queryByText(messages.errors.unexpected)).not.toBeInTheDocument();
      },
    );
  });

  describe('creating a role', () => {
    it('Cancelar closes the creation dialog without creating anything', async () => {
      const { roles } = start();
      const { user } = renderPage('/roles');

      await user.click(await screen.findByRole('button', { name: text.newRole }));
      await user.click(screen.getByRole('button', { name: text.form.cancel }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(roles.requests.filter((request) => request.method === 'POST')).toHaveLength(0);
    });

    it('with Bloqueados on a later page, the new role opens its detail and Atrás lands on the table that shows it (FR-015, FR-017, SC-007, US3-2, US3-3)', async () => {
      const { users } = start(30);
      // Zeta 01 to Zeta 12 blocked: the second page of Bloqueados has two roles.
      for (let id = 20; id < 32; id += 1) {
        users.setRoleStatus(id, BLOCKED);
      }
      const { router, user } = renderPage('/roles?status=bloqueados&page=2');
      await screen.findByRole('link', { name: 'Zeta 12' });

      await createRole(user, 'Zeta 99', text.filters.type.system);

      await waitFor(() => {
        expect(isDetailAddress(router.state.location.pathname)).toBe(true);
      });
      expect(await screen.findByText('Detalle de un role')).toBeVisible();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      // 27 active roles and the new one, the last: the 28th is on the third page of Activos.
      expect(router.state.location.state).toEqual({ listSearch: '?page=3' });

      await act(async () => {
        await router.navigate(-1);
      });

      expect(router.state.location.pathname).toBe('/roles');
      expect(router.state.location.search).toBe('?page=3');
      expect(await screen.findByRole('link', { name: 'Zeta 99' })).toBeVisible();
      expect(statusButton(text.filters.status.active)).toHaveAttribute('aria-pressed', 'true');
    });

    it('with Clínica, a new role of Sistema takes the table to Sistema, which is where it shows (FR-017)', async () => {
      start();
      const { router, user } = renderPage('/roles?type=clinica');
      await screen.findByRole('link', { name: 'Owner' });

      await createRole(user, 'Soporte Nivel 2', text.filters.type.system);

      await waitFor(() => {
        expect(isDetailAddress(router.state.location.pathname)).toBe(true);
      });
      expect(router.state.location.state).toEqual({ listSearch: '?type=sistema' });

      await act(async () => {
        await router.navigate(-1);
      });

      expect(router.state.location.search).toBe('?type=sistema');
      expect(await screen.findByRole('link', { name: 'Soporte Nivel 2' })).toBeVisible();
      expect(typeButton(text.filters.type.system)).toHaveAttribute('aria-pressed', 'true');
    });

    it('with Todos, it stays on Todos, and a table that already shows the role is not rewritten (FR-017)', async () => {
      start();
      const { router, user } = renderPage('/roles');
      await screen.findByRole('link', { name: 'Owner' });

      await createRole(user, 'Aaa Nuevo', text.filters.type.system);

      await waitFor(() => {
        expect(isDetailAddress(router.state.location.pathname)).toBe(true);
      });
      expect(router.state.location.state).toEqual({ listSearch: '' });

      await act(async () => {
        await router.navigate(-1);
      });

      expect(router.state.location.pathname).toBe('/roles');
      expect(router.state.location.search).toBe('');
      expect(await screen.findByRole('link', { name: 'Aaa Nuevo' })).toBeVisible();
      expect(typeButton(text.filters.type.all)).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
