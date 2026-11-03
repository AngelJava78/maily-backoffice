import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';

import { RolesPage } from './RolesPage';

const ADMIN_SUB = 'auth0|roles-admin';
const CAPABILITIES = { canCreate: true, canEdit: true, canDelete: true };
const BLOCKED = 2;
const text = messages.roles;

function start() {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock(scenario.directory);
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

function renderPage(route = '/roles') {
  return renderWithProviders(<RolesPage capabilities={CAPABILITIES} />, {
    route,
    auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) },
  });
}

const typeGroup = () => screen.getByRole('group', { name: text.filters.typeLabel });
const statusGroup = () => screen.getByRole('group', { name: text.filters.statusLabel });
const typeButton = (name: string) => within(typeGroup()).getByRole('button', { name });
const statusButton = (name: string) => within(statusGroup()).getByRole('button', { name });

describe('RolesPage', () => {
  it('shows the title, Todos and Activos pressed, the roles of both types and no tabs (US1-1)', async () => {
    start();

    renderPage();

    expect(screen.getByRole('heading', { name: text.title, level: 1 })).toBeInTheDocument();
    expect(typeButton(text.filters.type.all)).toHaveAttribute('aria-pressed', 'true');
    expect(statusButton(text.filters.status.active)).toHaveAttribute('aria-pressed', 'true');
    await screen.findByText('Owner');
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByText(text.detail.emptySelection)).toBeInTheDocument();
  });

  it('pressing Sistema shows only the Sistema roles and writes it to the URL (US1-2)', async () => {
    start();
    const { router, user } = renderPage();
    await screen.findByText('Owner');

    await user.click(typeButton(text.filters.type.system));

    await waitFor(() => {
      expect(screen.queryByText('Owner')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(typeButton(text.filters.type.system)).toHaveAttribute('aria-pressed', 'true');
    expect(router.state.location.search).toBe('?type=sistema');
  });

  it('reads the selected role from the URL and keeps it across a re-render', async () => {
    start();

    renderPage('/roles?type=sistema&roleId=1');

    await screen.findByDisplayValue('Administrator');
    expect(screen.queryByText(text.detail.emptySelection)).not.toBeInTheDocument();
  });

  it('selecting a role from the list writes it to the URL, keeping the filters', async () => {
    start();
    const { router, user } = renderPage('/roles?type=sistema');

    await user.click(await screen.findByText('Developer'));

    expect(router.state.location.search).toBe('?type=sistema&roleId=2');
  });

  describe('the blocked roles (US2)', () => {
    it('Bloqueados shows only the blocked roles, and choosing one shows its own detail (US2-1, US2-4)', async () => {
      const { users } = start();
      users.setRoleStatus(7, BLOCKED);
      const { user } = renderPage();
      await screen.findByText('Owner');

      await user.click(statusButton(text.filters.status.blocked));
      await user.click(await screen.findByText('Doctor'));

      expect(await screen.findByRole('heading', { name: 'Doctor', level: 2 })).toBeVisible();
      expect(screen.getByText(text.blocked.explanation)).toBeVisible();
      expect(screen.queryByText('Owner')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: text.detail.save })).not.toBeInTheDocument();
    });

    it('a failure loading the list shows an error with a retry, keeping the title and the filters (US2-6)', async () => {
      const { users } = start();
      users.failNext({ method: 'GET', path: '/api/v1/roles', status: 500, code: 'internal_error' });

      renderPage('/roles?status=bloqueados');

      expect(
        await screen.findByRole('button', { name: messages.common.retry }),
      ).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: text.title, level: 1 })).toBeVisible();
      expect(statusButton(text.filters.status.blocked)).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('the filters, the selection and creating are coherent (US4)', () => {
    it.each([
      ['/roles?type=clinica', text.filters.type.clinic, 'Owner', 'Administrator'],
      ['/roles?type=sistema', text.filters.type.system, 'Administrator', 'Owner'],
    ])(
      'an address from before feature 025 (%s) still opens that type, with Activos (FR-009)',
      async (route, pressed, shown, hidden) => {
        start();

        renderPage(route);

        await screen.findByText(shown);
        expect(screen.queryByText(hidden)).not.toBeInTheDocument();
        expect(typeButton(pressed)).toHaveAttribute('aria-pressed', 'true');
        expect(statusButton(text.filters.status.active)).toHaveAttribute('aria-pressed', 'true');
      },
    );

    it('an address with invalid values opens with the defaults, without an error (US4-3)', async () => {
      start();
      const { router } = renderPage('/roles?type=xyz&status=borrados&roleId=007');

      await screen.findByText('Owner');
      expect(typeButton(text.filters.type.all)).toHaveAttribute('aria-pressed', 'true');
      await waitFor(() => {
        expect(router.state.location.search).toBe('');
      });
    });

    it('changing a filter closes the open role (FR-007) and keeps the other filter', async () => {
      start();
      const { router, user } = renderPage('/roles?type=sistema&roleId=1');
      await screen.findByDisplayValue('Administrator');

      await user.click(statusButton(text.filters.status.blocked));

      expect(await screen.findByText(text.detail.emptySelection)).toBeInTheDocument();
      expect(router.state.location.search).toBe('?type=sistema&status=bloqueados');
    });

    it('an address asking for a role the filters do not show opens nothing, without an error (FR-011)', async () => {
      const { users } = start();
      users.setRoleStatus(7, BLOCKED);

      renderPage('/roles?roleId=7');

      expect(await screen.findByText(text.detail.emptySelection)).toBeInTheDocument();
      expect(screen.queryByText(text.errors.notFound)).not.toBeInTheDocument();
    });

    it('a Sistema role created with Clínica and Bloqueados is left selected and visible (FR-010)', async () => {
      start();
      const { router, user } = renderPage('/roles?type=clinica&status=bloqueados');

      await user.click(await screen.findByRole('button', { name: text.newRole }));
      await user.type(await screen.findByLabelText(text.detail.fields.name), 'Soporte Nivel 2');
      await user.click(within(screen.getByRole('dialog')).getByLabelText(text.detail.fields.type));
      await user.click(screen.getByRole('option', { name: text.filters.type.system }));
      await user.click(screen.getByRole('button', { name: text.form.create }));

      // The dialog's own field has that value too: wait for it to go before looking at the detail.
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      await screen.findByDisplayValue('Soporte Nivel 2');
      expect(router.state.location.search).toBe('?type=sistema&roleId=10');
      expect(typeButton(text.filters.type.system)).toHaveAttribute('aria-pressed', 'true');
      expect(statusButton(text.filters.status.active)).toHaveAttribute('aria-pressed', 'true');
    });

    it('with Todos, a new role keeps Todos (FR-010)', async () => {
      start();
      const { router, user } = renderPage('/roles');

      await user.click(await screen.findByRole('button', { name: text.newRole }));
      await user.type(await screen.findByLabelText(text.detail.fields.name), 'Recepción 2');
      await user.click(within(screen.getByRole('dialog')).getByLabelText(text.detail.fields.type));
      await user.click(screen.getByRole('option', { name: text.filters.type.clinic }));
      await user.click(screen.getByRole('button', { name: text.form.create }));

      // The dialog's own field has that value too: wait for it to go before looking at the detail.
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      await screen.findByDisplayValue('Recepción 2');
      expect(router.state.location.search).toBe('?roleId=10');
    });

    it('Cancelar closes the creation dialog without creating anything', async () => {
      start();
      const { user } = renderPage('/roles');

      await user.click(await screen.findByRole('button', { name: text.newRole }));
      await user.click(screen.getByRole('button', { name: text.form.cancel }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('unsaved changes (FR-017 of 014, FR-007)', () => {
    it('warns before switching roles, and staying keeps the edit and the current role', async () => {
      start();
      const { router, user } = renderPage('/roles?type=sistema&roleId=1');
      const nameField = await screen.findByLabelText(text.detail.fields.name);

      await user.type(nameField, ' Jr');
      await user.click(screen.getByText('Developer'));

      expect(
        await screen.findByRole('dialog', { name: text.detail.unsavedChangesTitle }),
      ).toBeInTheDocument();
      expect(router.state.location.search).toBe('?type=sistema&roleId=1');

      await user.click(screen.getByRole('button', { name: text.detail.unsavedChangesStay }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(screen.getByLabelText(text.detail.fields.name)).toHaveValue('Administrator Jr');
      expect(router.state.location.search).toBe('?type=sistema&roleId=1');
    });

    it('"Descartar y continuar" proceeds with the switch and drops the edit', async () => {
      start();
      const { router, user } = renderPage('/roles?type=sistema&roleId=1');
      const nameField = await screen.findByLabelText(text.detail.fields.name);

      await user.type(nameField, ' Jr');
      await user.click(screen.getByText('Developer'));
      await user.click(
        await screen.findByRole('button', { name: text.detail.unsavedChangesDiscard }),
      );

      await waitFor(() => {
        expect(router.state.location.search).toBe('?type=sistema&roleId=2');
      });
      expect(await screen.findByDisplayValue('Developer')).toBeInTheDocument();
    });

    it('also warns when changing a filter with unsaved changes (US4-5)', async () => {
      start();
      const { router, user } = renderPage('/roles?type=sistema&roleId=1');
      const nameField = await screen.findByLabelText(text.detail.fields.name);

      await user.type(nameField, ' Jr');
      await user.click(typeButton(text.filters.type.clinic));

      expect(
        await screen.findByRole('dialog', { name: text.detail.unsavedChangesTitle }),
      ).toBeInTheDocument();
      expect(router.state.location.search).toBe('?type=sistema&roleId=1');
    });

    it('once the filter change is accepted, the next role opens without warning again', async () => {
      start();
      const { router, user } = renderPage('/roles?type=sistema&roleId=1');
      const nameField = await screen.findByLabelText(text.detail.fields.name);

      await user.type(nameField, ' Jr');
      await user.click(typeButton(text.filters.type.all));
      await user.click(
        await screen.findByRole('button', { name: text.detail.unsavedChangesDiscard }),
      );
      await waitFor(() => {
        expect(router.state.location.search).toBe('');
      });
      await user.click(await screen.findByText('Owner'));

      expect(await screen.findByDisplayValue('Owner')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not warn when there is nothing pending', async () => {
      start();
      const { user } = renderPage('/roles?type=sistema&roleId=1');

      await user.click(await screen.findByText('Developer'));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('blocking and unblocking (US3)', () => {
    it('after blocking, the detail closes and the focus goes to the title (US3-4, US5-3)', async () => {
      const { users } = start();
      const { router, user } = renderPage('/roles?type=sistema&roleId=2');
      await screen.findByDisplayValue('Developer');

      await user.click(screen.getByRole('button', { name: text.status.block }));
      await user.click(
        within(
          await screen.findByRole('dialog', { name: text.status.confirmTitle('Developer') }),
        ).getByRole('button', { name: text.status.confirm }),
      );

      await waitFor(() => {
        expect(router.state.location.search).toBe('?type=sistema');
      });
      expect(users.state.findRole(2)?.statusId).toBe(BLOCKED);
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: text.title, level: 1 })).toHaveFocus();
      });
      expect(screen.queryByText('Developer')).not.toBeInTheDocument();
    });

    it('after unblocking, the detail closes and the focus goes to the title (US3-7)', async () => {
      const { users } = start();
      users.setRoleStatus(2, BLOCKED);
      const { router, user } = renderPage('/roles?status=bloqueados&roleId=2');

      await user.click(await screen.findByRole('button', { name: text.status.unblock }));

      await waitFor(() => {
        expect(router.state.location.search).toBe('?status=bloqueados');
      });
      expect(users.state.findRole(2)?.statusId).toBe(1);
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: text.title, level: 1 })).toHaveFocus();
      });
    });
  });

  describe('accessibility (T070, US5)', () => {
    it('has no violations with a role selected', async () => {
      start();
      const { container } = renderPage('/roles?type=sistema&roleId=1');
      await screen.findByDisplayValue('Administrator');

      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no violations with a blocked role selected', async () => {
      const { users } = start();
      users.setRoleStatus(7, BLOCKED);
      const { container } = renderPage('/roles?status=bloqueados&roleId=7');
      await screen.findByText(text.blocked.explanation);

      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no violations with the confirmation of Bloquear open', async () => {
      start();
      const { user } = renderPage('/roles?type=sistema&roleId=2');
      await screen.findByDisplayValue('Developer');

      await user.click(screen.getByRole('button', { name: text.status.block }));
      await screen.findByRole('dialog', { name: text.status.confirmTitle('Developer') });

      expect(await axe(document.body)).toHaveNoViolations();
    });

    /** Keeps pressing Tab until the focused element matches, or gives up after `max` presses —
     * robust to how many stops lie in between (a detail that may change), not just the order. */
    async function tabUntil(
      user: ReturnType<typeof renderPage>['user'],
      matches: (element: Element | null) => boolean,
      max = 40,
    ): Promise<void> {
      for (let i = 0; i < max; i += 1) {
        if (matches(document.activeElement)) {
          return;
        }
        await user.tab();
      }
      throw new Error(`No focusable element matched within ${max} presses of Tab`);
    }

    /** A toggle button: the filters and the permission buttons are the ones with a pressed state. */
    function isToggleButton(element: Element | null): element is HTMLButtonElement {
      return element instanceof HTMLButtonElement && element.hasAttribute('aria-pressed');
    }

    it('reaches the filters, the role list and the permission list by keyboard alone (US5-1)', async () => {
      start();
      const { router, user } = renderPage('/roles?type=sistema&roleId=1');
      await screen.findByDisplayValue('Administrator');
      // The permission list loads on its own, after the role: wait for it, or Tab would skip it.
      await screen.findByRole('button', { name: 'Ver de Roles' });

      // Each group of filters is a single Tab stop (MUI's roving tabindex); the arrows move within it.
      await tabUntil(user, isToggleButton);
      expect(typeGroup().contains(document.activeElement)).toBe(true);
      await user.tab();
      expect(statusGroup().contains(document.activeElement)).toBe(true);

      await tabUntil(user, (el) => (el?.textContent ?? '').startsWith('Administrator'));
      await tabUntil(user, (el) => el?.tagName === 'INPUT');
      expect(document.activeElement).toHaveAccessibleName(text.detail.fields.name);

      await tabUntil(user, (el) => isToggleButton(el) && el.closest('ul') !== null);
      const toggle = document.activeElement;
      if (!isToggleButton(toggle)) {
        throw new Error('Expected the focus to be on a toggle button');
      }
      const wasPressed = toggle.getAttribute('aria-pressed');
      await user.keyboard(' ');
      expect(toggle).toHaveAttribute('aria-pressed', wasPressed === 'true' ? 'false' : 'true');
      expect(router.state.location.search).toBe('?type=sistema&roleId=1');
    });
  });
});
