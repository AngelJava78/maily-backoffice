import { act, screen, waitFor, within } from '@testing-library/react';
import { useParams } from 'react-router';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock, directoryRole } from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';

import { roleKeys } from '../hooks/roleKeys';
import type { RoleCapabilities } from '../policy/roleCapabilities';
import { parseRoleId } from '../schemas/rolePermissionsLocation';
import { RoleDetailPage } from './RoleDetailPage';

const ADMIN_SUB = 'auth0|roles-admin';
const BLOCKED = 2;
const FULL: RoleCapabilities = { canCreate: true, canEdit: true, canDelete: true };
const READ_ONLY: RoleCapabilities = { canCreate: false, canEdit: false, canDelete: false };
const text = messages.roles;

/**
 * The seed (5 Sistema, 4 Clínica, all active), plus `extra` roles of Sistema named «Zeta 01», «Zeta
 * 02»… (ids from 20) that sort after the seed ones, so that the table has more than one page.
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

/** What the route of the application does: the id of the address, and the screen of that role. */
function PageOfRoute({ capabilities }: { readonly capabilities: RoleCapabilities }) {
  const roleId = parseRoleId(useParams().roleId);
  return roleId === null ? (
    <p>No es un role</p>
  ) : (
    <RoleDetailPage roleId={roleId} capabilities={capabilities} />
  );
}

/**
 * The screen at `/roles/:roleId`, with a marker where the table is. `state` is the one of the
 * history entry, and `previous` an entry before it, which the Back button goes to.
 */
function renderDetail(
  roleId: number,
  {
    capabilities = FULL,
    state,
    previous,
  }: { capabilities?: RoleCapabilities; state?: unknown; previous?: string } = {},
) {
  return renderWithProviders(
    [
      { path: '/roles/:roleId', element: <PageOfRoute capabilities={capabilities} /> },
      { path: '/roles', element: <p>Tabla de roles</p> },
    ],
    {
      initialEntries: [
        ...(previous === undefined ? [] : [previous]),
        { pathname: `/roles/${roleId}`, state },
      ],
      auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) },
    },
  );
}

const backLink = () => screen.getByRole('link', { name: text.detail.backToList });

describe('RoleDetailPage', () => {
  describe('the title (US2-1, FR-011)', () => {
    it('is «Detalle del role» while the role loads, and its name once it is known', async () => {
      start();

      renderDetail(2);

      expect(screen.getByRole('heading', { level: 1, name: text.detail.title })).toBeVisible();
      expect(await screen.findByRole('heading', { level: 1, name: 'Developer' })).toBeVisible();
    });

    it('is the name of a blocked role too', async () => {
      const { users } = start();
      users.setRoleStatus(3, BLOCKED);

      renderDetail(3);

      expect(await screen.findByRole('heading', { level: 1, name: 'Support' })).toBeVisible();
    });
  });

  describe('«Volver al listado» (FR-013)', () => {
    it('goes to the table, with no search when the person did not come from it', () => {
      start();

      renderDetail(2);

      expect(backLink()).toHaveAttribute('href', '/roles');
    });

    it('goes to the table that the person comes from, with its filters, page and page size', () => {
      start();

      renderDetail(2, { state: { listSearch: '?type=sistema&page=2' } });

      expect(backLink()).toHaveAttribute('href', '/roles?type=sistema&page=2');
    });

    it('ignores a state that is not the search of the table', () => {
      start();

      renderDetail(2, { state: { listSearch: 'https://example.com/?type=sistema' } });

      expect(backLink()).toHaveAttribute('href', '/roles');
    });

    it('is the same link while the role loads and once it is loaded, so that a click is not lost', async () => {
      start();
      renderDetail(2);
      const whileLoading = backLink();

      await screen.findByLabelText(text.detail.fields.name);

      expect(backLink()).toBe(whileLoading);
    });

    it('takes the person back to the table when pressed', async () => {
      start();
      const { user, router } = renderDetail(2, { state: { listSearch: '?status=bloqueados' } });
      await screen.findByLabelText(text.detail.fields.name);

      await user.click(backLink());

      expect(router.state.location.pathname).toBe('/roles');
      expect(router.state.location.search).toBe('?status=bloqueados');
      expect(await screen.findByText('Tabla de roles')).toBeVisible();
    });
  });

  describe('an active role (US2-2, US2-4)', () => {
    it('shows the panel of the role: its name field, its permissions and its actions', async () => {
      start();

      renderDetail(2);

      expect(await screen.findByLabelText(text.detail.fields.name)).toHaveValue('Developer');
      expect(screen.getByRole('button', { name: text.detail.save })).toBeVisible();
      expect(screen.getByRole('button', { name: text.detail.duplicate })).toBeVisible();
      expect(screen.getByRole('button', { name: text.delete.action })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Ver de Roles' })).toBeVisible();
    });

    it('shows it to whoever cannot edit roles with nothing to change and no action that is not theirs', async () => {
      start();

      renderDetail(2, { capabilities: READ_ONLY });

      expect(await screen.findByLabelText(text.detail.fields.name)).toBeDisabled();
      expect(await screen.findByRole('button', { name: 'Ver de Roles' })).toBeDisabled();
      for (const name of [text.detail.duplicate, text.delete.action, text.status.block]) {
        expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
      }
    });
  });

  describe('a blocked role (US2-5, FR-012)', () => {
    it('explains why there is nothing to change, offers to unblock it and asks for no permissions', async () => {
      const { users, roles } = start();
      users.setRoleStatus(3, BLOCKED);

      renderDetail(3);

      expect(await screen.findByText(text.blocked.explanation)).toBeVisible();
      expect(screen.getByRole('button', { name: text.status.unblock })).toBeVisible();
      expect(screen.queryByLabelText(text.detail.fields.name)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: text.detail.save })).not.toBeInTheDocument();
      expect(screen.queryByText(messages.errors.unexpected)).not.toBeInTheDocument();
      expect(roles.requests.filter((request) => request.path.endsWith('/permissions'))).toEqual([]);
    });

    it('does not offer to unblock it to whoever cannot edit roles', async () => {
      const { users } = start();
      users.setRoleStatus(3, BLOCKED);

      renderDetail(3, { capabilities: READ_ONLY });

      expect(await screen.findByText(text.blocked.explanation)).toBeVisible();
      expect(screen.queryByRole('button', { name: text.status.unblock })).not.toBeInTheDocument();
    });
  });

  describe('a role that does not exist (US2-6, FR-014)', () => {
    it('says it no longer exists, with one way back to the list and not an error screen', async () => {
      start();

      renderDetail(9999);

      expect(await screen.findByText(text.detail.notFound.title)).toBeVisible();
      expect(screen.getByText(text.detail.notFound.message)).toBeVisible();
      // Only the action of the message: the bar of «Volver al listado» is not shown.
      const links = screen.getAllByRole('link', { name: text.detail.backToList });
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute('href', '/roles');
      expect(screen.getByRole('heading', { level: 1, name: text.detail.title })).toBeVisible();
    });
  });

  describe('the actions of the role (feature 027, user story 3)', () => {
    const isDetailAddress = (pathname: string) => /^\/roles\/\d+$/.test(pathname);

    async function confirmBlock(user: ReturnType<typeof renderDetail>['user'], roleName: string) {
      await user.click(await screen.findByRole('button', { name: text.status.block }));
      const dialog = await screen.findByRole('dialog', {
        name: text.status.confirmTitle(roleName),
      });
      await user.click(within(dialog).getByRole('button', { name: text.status.confirm }));
    }

    it('«Duplicar» opens the copy in a new entry of the history, with the table that shows it as the way back, and the focus in its name (US3-4)', async () => {
      start(30);
      // Zeta 29 (id 48) sorts 34th among the roles of Sistema; its copy, right after it, is the 35th.
      const { user, router } = renderDetail(48, { state: { listSearch: '?type=sistema' } });
      await screen.findByLabelText(text.detail.fields.name);

      await user.click(screen.getByRole('button', { name: text.detail.duplicate }));

      await waitFor(() => {
        expect(screen.getByLabelText(text.detail.fields.name)).toHaveValue('Zeta 29 (copia)');
      });
      expect(isDetailAddress(router.state.location.pathname)).toBe(true);
      expect(router.state.location.pathname).not.toBe('/roles/48');
      expect(router.state.historyAction).toBe('PUSH');
      expect(router.state.location.state).toEqual({ listSearch: '?type=sistema&page=4' });
      expect(backLink()).toHaveAttribute('href', '/roles?type=sistema&page=4');
      await waitFor(() => {
        expect(screen.getByLabelText(text.detail.fields.name)).toHaveFocus();
      });

      // Atrás goes back to the role that was duplicated, as it naturally does.
      await act(async () => {
        await router.navigate(-1);
      });

      expect(router.state.location.pathname).toBe('/roles/48');
      expect(await screen.findByLabelText(text.detail.fields.name)).toHaveValue('Zeta 29');
    });

    it('«Bloquear role», once confirmed, tells it and goes back to the table, in place of the entry of the role (US3-5, FR-016)', async () => {
      const { users } = start();
      const { user, router } = renderDetail(2, { state: { listSearch: '?type=sistema' } });
      await screen.findByLabelText(text.detail.fields.name);

      await confirmBlock(user, 'Developer');

      expect(await screen.findByText(text.status.blocked('Developer'))).toBeVisible();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/roles');
      });
      expect(router.state.location.search).toBe('?type=sistema');
      expect(router.state.historyAction).toBe('REPLACE');
      expect(await screen.findByText('Tabla de roles')).toBeVisible();
      expect(users.state.findRole(2)?.statusId).toBe(BLOCKED);
    });

    it('«Desbloquear role» tells it and goes back to the table the same way (US3-6)', async () => {
      const { users } = start();
      users.setRoleStatus(3, BLOCKED);
      const { user, router } = renderDetail(3, { state: { listSearch: '?status=bloqueados' } });

      await user.click(await screen.findByRole('button', { name: text.status.unblock }));

      expect(await screen.findByText(text.status.unblocked('Support'))).toBeVisible();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/roles');
      });
      expect(router.state.location.search).toBe('?status=bloqueados');
      expect(router.state.historyAction).toBe('REPLACE');
      expect(users.state.findRole(3)?.statusId).toBe(1);
    });

    it('«Eliminar role», once confirmed, goes back to the table in place of the entry of the role (US3-7)', async () => {
      const { roles } = start();
      const { user, router } = renderDetail(2, { state: { listSearch: '?type=sistema&page=2' } });
      await screen.findByLabelText(text.detail.fields.name);

      await user.click(screen.getByRole('button', { name: text.delete.action }));
      const dialog = await screen.findByRole('dialog', {
        name: text.delete.confirmTitle('Developer'),
      });
      await user.click(within(dialog).getByRole('button', { name: text.delete.confirm }));

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/roles');
      });
      expect(router.state.location.search).toBe('?type=sistema&page=2');
      expect(router.state.historyAction).toBe('REPLACE');
      expect(roles.requests.filter((request) => request.method === 'DELETE')).toHaveLength(1);
      expect(screen.queryByText(text.detail.notFound.title)).not.toBeInTheDocument();
    });

    it('a role that someone else already blocked is told as information, and the person goes back to the table (US3-8)', async () => {
      const { users } = start();
      const { user, router } = renderDetail(2, { state: { listSearch: '?type=sistema' } });
      await screen.findByLabelText(text.detail.fields.name);
      users.setRoleStatus(2, BLOCKED);

      await confirmBlock(user, 'Developer');

      expect(await screen.findByText(text.status.alreadyBlocked('Developer'))).toBeVisible();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/roles');
      });
      expect(router.state.location.search).toBe('?type=sistema');
    });

    it('any other failure is an error notice, and the person stays in the detail to try again (US3-8)', async () => {
      const { users, roles } = start();
      roles.failNext({
        method: 'POST',
        path: '/api/v1/roles/2/block',
        status: 500,
        code: 'internal_error',
      });
      const { user, router } = renderDetail(2, { state: { listSearch: '?type=sistema' } });
      await screen.findByLabelText(text.detail.fields.name);

      await confirmBlock(user, 'Developer');

      expect(await screen.findByText(text.errors.retryable)).toBeVisible();
      expect(router.state.location.pathname).toBe('/roles/2');
      expect(users.state.findRole(2)?.statusId).toBe(1);
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      await confirmBlock(user, 'Developer');

      expect(await screen.findByText(text.status.blocked('Developer'))).toBeVisible();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/roles');
      });
    });
  });

  describe('leaving with changes that are not saved (FR-020, SC-006, US4-6)', () => {
    const warning = () => screen.findByRole('dialog', { name: text.detail.unsavedChangesTitle });
    const stay = () => screen.getByRole('button', { name: text.detail.unsavedChangesStay });
    const discard = () => screen.getByRole('button', { name: text.detail.unsavedChangesDiscard });

    /** Opens the role and changes its name, which is a change that is not saved. */
    async function openAndEditName() {
      start();
      const view = renderDetail(2, { previous: '/roles?type=sistema' });
      const nameField = await screen.findByLabelText(text.detail.fields.name);
      await view.user.type(nameField, ' Jr');
      return { ...view, nameField };
    }

    it('«Volver al listado» asks first, and «Quedarme» keeps the edit and the role open', async () => {
      const { user, router, nameField } = await openAndEditName();

      await user.click(backLink());

      expect(await warning()).toHaveAccessibleDescription(text.detail.unsavedChangesBody);
      await user.click(stay());
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(router.state.location.pathname).toBe('/roles/2');
      expect(nameField).toHaveValue('Developer Jr');
    });

    it('«Descartar y continuar» leaves for the table', async () => {
      const { user, router } = await openAndEditName();

      await user.click(backLink());
      await warning();
      await user.click(discard());

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/roles');
      });
      expect(await screen.findByText('Tabla de roles')).toBeVisible();
    });

    it('a change in the permissions is one too, and so is the Back button of the browser', async () => {
      start();
      const { user, router } = renderDetail(2, { previous: '/roles?type=sistema' });
      await user.click(await screen.findByRole('button', { name: 'Ver de Usuarios' }));

      await act(async () => {
        await router.navigate(-1);
      });

      await warning();
      expect(router.state.location.pathname).toBe('/roles/2');
      await user.click(stay());
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: 'Ver de Usuarios' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );

      await act(async () => {
        await router.navigate(-1);
      });
      await warning();
      await user.click(discard());

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/roles');
      });
      expect(router.state.location.search).toBe('?type=sistema');
    });

    it('does not ask when nothing was changed', async () => {
      start();
      const { user, router } = renderDetail(2, { previous: '/roles?type=sistema' });
      await screen.findByLabelText(text.detail.fields.name);

      await user.click(backLink());

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/roles');
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not ask once the changes were discarded, or saved', async () => {
      start();
      const { user, router } = renderDetail(2, { previous: '/roles?type=sistema' });
      const nameField = await screen.findByLabelText(text.detail.fields.name);
      await user.type(nameField, ' Jr');
      await user.click(screen.getByRole('button', { name: text.detail.discard }));
      expect(nameField).toHaveValue('Developer');
      await user.type(nameField, ' II');
      await user.click(screen.getByRole('button', { name: text.detail.save }));
      expect(await screen.findByText(text.detail.saved)).toBeVisible();

      await user.click(backLink());

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/roles');
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not ask after the role was deleted with changes that were not saved', async () => {
      const { user, router, nameField } = await openAndEditName();
      expect(nameField).toHaveValue('Developer Jr');

      await user.click(screen.getByRole('button', { name: text.delete.action }));
      const dialog = await screen.findByRole('dialog', {
        name: text.delete.confirmTitle('Developer'),
      });
      await user.click(within(dialog).getByRole('button', { name: text.delete.confirm }));

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/roles');
      });
      expect(screen.queryByRole('dialog', { name: text.detail.unsavedChangesTitle })).toBeNull();
    });

    it('does not ask about a role that no longer exists, even if the edit is still there', async () => {
      const { users } = start();
      const { user, router, queryClient } = renderDetail(2, { previous: '/roles?type=sistema' });
      await user.type(await screen.findByLabelText(text.detail.fields.name), ' Jr');
      users.setRoleStatus(2, BLOCKED);
      await act(async () => {
        await queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      });
      expect(await screen.findByText(text.detail.notFound.title)).toBeVisible();

      await user.click(backLink());

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/roles');
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('keeps «Bloquear role» disabled while there are changes that are not saved', async () => {
      await openAndEditName();

      expect(screen.getByRole('button', { name: text.status.block })).toBeDisabled();
    });

    it('does not ask about a blocked role, which has nothing to edit', async () => {
      const { users } = start();
      users.setRoleStatus(3, BLOCKED);
      const { user, router } = renderDetail(3, { previous: '/roles?status=bloqueados' });
      await screen.findByText(text.blocked.explanation);

      await user.click(backLink());

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/roles');
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('keyboard and accessibility (US5-4, FR-022, SC-009)', () => {
    it('puts the focus on the title when it opens, before the role is known', () => {
      start();

      renderDetail(2);

      expect(screen.getByRole('heading', { level: 1, name: text.detail.title })).toHaveFocus();
    });

    it('has no accessibility violations with an active role', async () => {
      start();
      const { container } = renderDetail(2);
      await screen.findByLabelText(text.detail.fields.name);

      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no accessibility violations with a blocked role', async () => {
      const { users } = start();
      users.setRoleStatus(3, BLOCKED);
      const { container } = renderDetail(3);
      await screen.findByText(text.blocked.explanation);

      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no accessibility violations with a role that does not exist', async () => {
      start();
      const { container } = renderDetail(9999);
      await screen.findByText(text.detail.notFound.title);

      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no accessibility violations with the warning of changes that are not saved open', async () => {
      start();
      const { user, baseElement } = renderDetail(2, { previous: '/roles?type=sistema' });
      await user.type(await screen.findByLabelText(text.detail.fields.name), ' Jr');
      await user.click(backLink());
      await screen.findByRole('dialog', { name: text.detail.unsavedChangesTitle });

      expect(await axe(baseElement)).toHaveNoViolations();
    });
  });

  describe('when the lists of roles cannot be loaded', () => {
    it('shows an error with a retry, keeping the way back, and the retry brings the role back', async () => {
      const { users } = start();
      users.failNext({ method: 'GET', path: '/api/v1/roles', status: 500, code: 'internal_error' });

      const { user } = renderDetail(2);

      expect(await screen.findByText(text.detail.loadError.title)).toBeVisible();
      expect(screen.getByText(text.detail.loadError.message)).toBeVisible();
      expect(backLink()).toHaveAttribute('href', '/roles');

      await user.click(screen.getByRole('button', { name: messages.common.retry }));

      expect(await screen.findByLabelText(text.detail.fields.name)).toHaveValue('Developer');
      expect(screen.queryByText(text.detail.loadError.title)).not.toBeInTheDocument();
    });
  });
});
