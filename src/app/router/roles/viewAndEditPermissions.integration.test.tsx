import { configure, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import {
  ADMIN_SUB,
  createRolesCatalogMock,
  richClinicModulesScenario,
} from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';

beforeAll(() => {
  configure({ asyncUtilTimeout: 10_000 });
});

const text = messages.roles;

/** The rich scenario (research D8): Sistema stays exactly as the real environment seeds it
 * (Administrator with its 16 permissions, Developer with none); Clínica additionally gets three
 * unevenly-featured modules (mockup, páginas 15-18), so both tabs have real rows to exercise. */
function start() {
  const scenario = richClinicModulesScenario();
  const users = createUsersDirectoryMock(scenario.directory);
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

function open(url = '/roles') {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

const navigation = () => screen.getByRole('navigation', { name: messages.nav.label });
const rolesLink = () =>
  within(navigation()).queryByRole('link', { name: messages.nav.sections.roles });

describe(
  'Roles y permisos: view and edit an existing role (feature 014, user story 1)',
  { timeout: 30_000 },
  () => {
    it("US1-1: Clínica is selected by default, and switching tabs shows each one's own roles", async () => {
      start();
      const { user } = open();

      await screen.findByText('Owner');
      expect(
        screen.getByRole('tab', { name: text.tabs.clinica, selected: true }),
      ).toBeInTheDocument();
      expect(screen.queryByText('Administrator')).not.toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: text.tabs.sistema }));

      await screen.findByText('Administrator');
      expect(screen.queryByText('Owner')).not.toBeInTheDocument();
    });

    it('US1-2: shows the full detail of a role, only with the actions each module actually has', async () => {
      start();
      const { user } = open();

      await user.click(await screen.findByText('Owner'));

      expect(await screen.findByLabelText(text.detail.fields.name)).toHaveValue('Owner');
      expect(screen.getByText(`${text.detail.fields.type}: Clínica`)).toBeInTheDocument();
      expect(screen.getByText(text.detail.permissionsCount(0, 10))).toBeInTheDocument();
      // "Recordatorios" only has Ver and Modificar in the catalog (mockup): no Crear/Eliminar checkbox.
      expect(screen.getByRole('checkbox', { name: 'Ver de Recordatorios' })).toBeInTheDocument();
      expect(
        screen.queryByRole('checkbox', { name: 'Crear de Recordatorios' }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Crear de Pacientes' })).toBeInTheDocument();
    });

    it('US1-3, US1-4: granting write/update/delete also grants read, and revoking read clears the row', async () => {
      start();
      const { user } = open();
      await user.click(await screen.findByText('Owner'));
      await screen.findByLabelText(text.detail.fields.name);

      await user.click(screen.getByRole('checkbox', { name: 'Modificar de Recordatorios' }));
      expect(screen.getByRole('checkbox', { name: 'Ver de Recordatorios' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Modificar de Recordatorios' })).toBeChecked();

      await user.click(screen.getByRole('checkbox', { name: 'Ver de Recordatorios' }));
      expect(screen.getByRole('checkbox', { name: 'Ver de Recordatorios' })).not.toBeChecked();
      expect(
        screen.getByRole('checkbox', { name: 'Modificar de Recordatorios' }),
      ).not.toBeChecked();
    });

    it('US1-5: "Todo el módulo" grants every action that module has, no more', async () => {
      start();
      const { user } = open();
      await user.click(await screen.findByText('Owner'));
      await screen.findByLabelText(text.detail.fields.name);

      await user.click(screen.getByRole('checkbox', { name: 'Todo el módulo de Recordatorios' }));

      expect(screen.getByRole('checkbox', { name: 'Ver de Recordatorios' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Modificar de Recordatorios' })).toBeChecked();
      expect(screen.getByText(text.detail.permissionsCount(2, 10))).toBeInTheDocument();
    });

    it('US1-6: Guardar cambios updates the table and the counter, and it is still there after reopening', async () => {
      start();
      const { user, unmount } = open();
      await user.click(await screen.findByText('Owner'));
      await screen.findByLabelText(text.detail.fields.name);

      await user.click(screen.getByRole('checkbox', { name: 'Todo el módulo de Recordatorios' }));
      await user.click(screen.getByRole('button', { name: text.detail.save }));

      await waitFor(() => {
        expect(screen.getByText(text.detail.permissionsCount(2, 10))).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: text.detail.save })).toBeDisabled();
      unmount();

      // A fresh load (as if the person came back later): the server, not the page, is the source.
      const { user: userAgain } = open();
      await userAgain.click(await screen.findByText('Owner'));

      expect(await screen.findByText(text.detail.permissionsCount(2, 10))).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Ver de Recordatorios' })).toBeChecked();
    });

    it('US1-7: Descartar cambios reverts the table and the name/description to the last saved state', async () => {
      start();
      const { user } = open();
      await user.click(await screen.findByRole('tab', { name: text.tabs.sistema }));
      await user.click(await screen.findByText('Developer'));
      const nameField = await screen.findByLabelText(text.detail.fields.name);

      await user.type(nameField, ' Jr');
      await user.click(screen.getByRole('checkbox', { name: 'Ver de Usuarios' }));
      await user.click(screen.getByRole('button', { name: text.detail.discard }));

      expect(nameField).toHaveValue('Developer');
      expect(screen.getByRole('checkbox', { name: 'Ver de Usuarios' })).not.toBeChecked();
      expect(screen.getByText(text.detail.permissionsCount(0, 16))).toBeInTheDocument();
    });

    it('US1-8: saves the name together with the permissions, and rejects an empty or taken name first', async () => {
      const { roles } = start();
      const { user } = open();
      await user.click(await screen.findByRole('tab', { name: text.tabs.sistema }));
      await user.click(await screen.findByText('Developer'));
      const nameField = await screen.findByLabelText(text.detail.fields.name);

      // Empty: blocked client-side, nothing sent.
      await user.clear(nameField);
      await user.click(screen.getByRole('button', { name: text.detail.save }));
      expect(await screen.findByText(messages.roles.validation.nameRequired)).toBeInTheDocument();
      expect(roles.requests.filter((request) => request.method === 'PATCH')).toHaveLength(0);

      // Taken by another role (any type): rejected by the service, nothing saved either.
      await user.type(nameField, 'Owner');
      await user.click(screen.getByRole('checkbox', { name: 'Ver de Usuarios' }));
      await user.click(screen.getByRole('button', { name: text.detail.save }));
      expect(await screen.findByText(text.errors.nameAlreadyExists)).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Ver de Usuarios' })).toBeChecked();

      // Corrected: name and the pending permission save together.
      await user.clear(nameField);
      await user.type(nameField, 'Developer II');
      await user.click(screen.getByRole('button', { name: text.detail.save }));

      await waitFor(() => {
        expect(screen.getByText(text.detail.permissionsCount(1, 16))).toBeInTheDocument();
      });
      expect(nameField).toHaveValue('Developer II');
    });

    it('US1-9, SC-005: without roles:read, the section is neither in the menu nor reachable', async () => {
      const { users } = start();
      users.revoke('Administrator', 'roles:read');

      const { router } = open();

      expect(await screen.findByText(messages.home.permissionsChanged)).toBeInTheDocument();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/');
      });
      expect(rolesLink()).not.toBeInTheDocument();
    });

    it('FR-017: warns before leaving the section, from the main menu, with unsaved changes', async () => {
      start();
      const { user } = open();
      await user.click(await screen.findByText('Owner'));
      const nameField = await screen.findByLabelText(text.detail.fields.name);

      await user.type(nameField, ' Jr');
      await user.click(
        within(navigation()).getByRole('link', { name: messages.nav.sections.users }),
      );

      expect(
        await screen.findByRole('dialog', { name: text.detail.unsavedChangesTitle }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: messages.titles.users }),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: text.detail.unsavedChangesDiscard }));

      expect(
        await screen.findByRole('heading', { level: 1, name: messages.titles.users }),
      ).toBeInTheDocument();
    });
  },
);
