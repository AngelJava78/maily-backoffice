import { screen, waitFor } from '@testing-library/react';
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

describe('RolesPage', () => {
  it('shows the title, the tabs, the list and the empty-selection message', async () => {
    start();

    renderPage();

    expect(screen.getByRole('heading', { name: messages.roles.title })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: messages.roles.tabs.clinica })).toBeInTheDocument();
    await screen.findByText('Owner');
    expect(screen.getByText(messages.roles.detail.emptySelection)).toBeInTheDocument();
  });

  it('reads the selected role from the URL and keeps it across a re-render', async () => {
    start();

    renderPage('/roles?type=sistema&roleId=1');

    await screen.findByDisplayValue('Administrator');
    expect(screen.queryByText(messages.roles.detail.emptySelection)).not.toBeInTheDocument();
  });

  it('selecting a role from the list writes it to the URL', async () => {
    start();
    const { router, user } = renderPage('/roles?type=sistema');

    await user.click(await screen.findByText('Developer'));

    expect(router.state.location.search).toBe('?type=sistema&roleId=2');
  });

  describe('creating a role (US2, T077)', () => {
    it('opens the dialog from "Nuevo role" and, once created, selects it even in a different tab', async () => {
      start();
      const { router, user } = renderPage('/roles');

      await user.click(await screen.findByRole('button', { name: messages.roles.newRole }));
      await user.type(
        await screen.findByLabelText(messages.roles.detail.fields.name),
        'Soporte Nivel 2',
      );
      await user.click(screen.getByLabelText(messages.roles.detail.fields.type));
      await user.click(screen.getByRole('option', { name: messages.roles.tabs.sistema }));
      await user.click(screen.getByRole('button', { name: messages.roles.form.create }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      await screen.findByDisplayValue('Soporte Nivel 2');
      expect(router.state.location.search).toBe('?type=sistema&roleId=10');
    });

    it('Cancelar closes the dialog without creating anything', async () => {
      start();
      const { user } = renderPage('/roles');

      await user.click(await screen.findByRole('button', { name: messages.roles.newRole }));
      await user.click(screen.getByRole('button', { name: messages.roles.form.cancel }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('unsaved changes (FR-017, edge case of spec.md)', () => {
    it('warns before switching roles, and staying keeps the edit and the current role', async () => {
      start();
      const { router, user } = renderPage('/roles?type=sistema&roleId=1');
      const nameField = await screen.findByLabelText(messages.roles.detail.fields.name);

      await user.type(nameField, ' Jr');
      await user.click(screen.getByText('Developer'));

      expect(
        await screen.findByRole('dialog', { name: messages.roles.detail.unsavedChangesTitle }),
      ).toBeInTheDocument();
      expect(router.state.location.search).toBe('?type=sistema&roleId=1');

      await user.click(
        screen.getByRole('button', { name: messages.roles.detail.unsavedChangesStay }),
      );

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(screen.getByLabelText(messages.roles.detail.fields.name)).toHaveValue(
        'Administrator Jr',
      );
      expect(router.state.location.search).toBe('?type=sistema&roleId=1');
    });

    it('"Descartar y continuar" proceeds with the switch and drops the edit', async () => {
      start();
      const { router, user } = renderPage('/roles?type=sistema&roleId=1');
      const nameField = await screen.findByLabelText(messages.roles.detail.fields.name);

      await user.type(nameField, ' Jr');
      await user.click(screen.getByText('Developer'));
      await user.click(
        await screen.findByRole('button', { name: messages.roles.detail.unsavedChangesDiscard }),
      );

      await waitFor(() => {
        expect(router.state.location.search).toBe('?type=sistema&roleId=2');
      });
      expect(await screen.findByDisplayValue('Developer')).toBeInTheDocument();
    });

    it('also warns when switching tabs with unsaved changes', async () => {
      start();
      const { router, user } = renderPage('/roles?type=sistema&roleId=1');
      const nameField = await screen.findByLabelText(messages.roles.detail.fields.name);

      await user.type(nameField, ' Jr');
      await user.click(screen.getByRole('tab', { name: messages.roles.tabs.clinica }));

      expect(
        await screen.findByRole('dialog', { name: messages.roles.detail.unsavedChangesTitle }),
      ).toBeInTheDocument();
      expect(router.state.location.search).toBe('?type=sistema&roleId=1');
    });

    it('does not warn when there is nothing pending', async () => {
      start();
      const { user } = renderPage('/roles?type=sistema&roleId=1');

      await user.click(await screen.findByText('Developer'));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('accessibility (T070)', () => {
    it('has no violations with a role selected', async () => {
      start();
      const { container } = renderPage('/roles?type=sistema&roleId=1');
      await screen.findByDisplayValue('Administrator');

      expect(await axe(container)).toHaveNoViolations();
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

    function isCheckbox(element: Element | null): element is HTMLInputElement {
      return element instanceof HTMLInputElement && element.type === 'checkbox';
    }

    it('reaches the tabs, the role list and the permission table by keyboard alone', async () => {
      start();
      const { user } = renderPage('/roles?type=sistema&roleId=1');
      await screen.findByDisplayValue('Administrator');

      await tabUntil(user, (el) => el?.getAttribute('role') === 'tab');
      expect(document.activeElement).toHaveAccessibleName(messages.roles.tabs.sistema);

      await tabUntil(user, (el) => (el?.textContent ?? '').startsWith('Administrator'));
      await tabUntil(user, (el) => el?.tagName === 'INPUT');
      expect(document.activeElement).toHaveAccessibleName(messages.roles.detail.fields.name);

      await tabUntil(user, isCheckbox);
      const checkbox = document.activeElement;
      if (!isCheckbox(checkbox)) {
        throw new Error('Expected the focus to be on a checkbox');
      }
      const wasChecked = checkbox.checked;
      await user.keyboard(' ');
      expect(checkbox.checked).toBe(!wasChecked);
    });
  });
});
