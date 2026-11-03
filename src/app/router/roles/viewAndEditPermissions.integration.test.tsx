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
 * unevenly-featured modules (mockup, páginas 15-18), so both types have real rows to exercise. */
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
/** A button of the Tipo filter (feature 025), which replaced the Clínica/Sistema tabs. */
const typeFilter = async (name: string) =>
  within(await screen.findByRole('group', { name: text.filters.typeLabel })).getByRole('button', {
    name,
  });
const rolesLink = () =>
  within(navigation()).queryByRole('link', { name: messages.nav.sections.roles });

describe(
  'Roles y permisos: view and edit an existing role, opened from the table (features 014 and 027, user story 1)',
  { timeout: 30_000 },
  () => {
    it('US1-1: Todos is selected by default, and the Tipo filter shows each type on its own (025)', async () => {
      start();
      const { user } = open();

      await screen.findByText('Owner');
      expect(screen.getByText('Administrator')).toBeInTheDocument();
      expect(await typeFilter(text.filters.type.all)).toHaveAttribute('aria-pressed', 'true');

      await user.click(await typeFilter(text.filters.type.system));

      await waitFor(() => {
        expect(screen.queryByText('Owner')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Administrator')).toBeInTheDocument();
    });

    it('US1-2: shows the full detail of a role, only with the actions each module actually has', async () => {
      start();
      const { user } = open();

      await user.click(await screen.findByRole('link', { name: 'Owner' }));

      expect(await screen.findByLabelText(text.detail.fields.name)).toHaveValue('Owner');
      expect(screen.getByText(`${text.detail.fields.type}: Clínica`)).toBeInTheDocument();
      // The screen opens on its own address, so the name shows before the permission list does
      // (it needs the catalog too): wait for the counter, which only appears with the list.
      // 10 de Clínica (Pacientes/Agenda/Recordatorios) + 16 de Sistema que ya puede recibir (015).
      expect(await screen.findByText(text.detail.permissionsCount(0, 26))).toBeInTheDocument();
      // "Recordatorios" only has Ver and Modificar in the catalog (mockup): no Crear/Eliminar button.
      expect(screen.getByRole('button', { name: 'Ver de Recordatorios' })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Crear de Recordatorios' }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Crear de Pacientes' })).toBeInTheDocument();
    });

    it('US1-3, US1-4: granting write/update/delete also grants read, and revoking read clears the row', async () => {
      start();
      const { user } = open();
      await user.click(await screen.findByRole('link', { name: 'Owner' }));
      await screen.findByLabelText(text.detail.fields.name);

      await user.click(screen.getByRole('button', { name: 'Modificar de Recordatorios' }));
      expect(screen.getByRole('button', { name: 'Ver de Recordatorios' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.getByRole('button', { name: 'Modificar de Recordatorios' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );

      await user.click(screen.getByRole('button', { name: 'Ver de Recordatorios' }));
      expect(screen.getByRole('button', { name: 'Ver de Recordatorios' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      expect(screen.getByRole('button', { name: 'Modificar de Recordatorios' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });

    it('US1-5: "Todo el módulo" grants every action that module has, no more', async () => {
      start();
      const { user } = open();
      await user.click(await screen.findByRole('link', { name: 'Owner' }));
      await screen.findByLabelText(text.detail.fields.name);

      await user.click(screen.getByRole('button', { name: 'Todo el módulo de Recordatorios' }));

      expect(screen.getByRole('button', { name: 'Ver de Recordatorios' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.getByRole('button', { name: 'Modificar de Recordatorios' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(
        screen.getByRole('button', { name: 'Todo el módulo de Recordatorios' }),
      ).toHaveAttribute('aria-pressed', 'true');
      // "Recordatorios" has no Crear/Eliminar: "Todo el módulo" does not invent them (FR-006).
      expect(
        screen.queryByRole('button', { name: 'Crear de Recordatorios' }),
      ).not.toBeInTheDocument();
      expect(screen.getByText(text.detail.permissionsCount(2, 26))).toBeInTheDocument();
    });

    it('US1-6: Guardar cambios updates the list and the counter, and it is still there after reopening', async () => {
      start();
      const { user, unmount } = open();
      await user.click(await screen.findByRole('link', { name: 'Owner' }));
      await screen.findByLabelText(text.detail.fields.name);

      // "Modificar" grants "Ver" too (FR-008): the same two permissions "Todo el módulo" would give.
      await user.click(screen.getByRole('button', { name: 'Modificar de Recordatorios' }));
      await user.click(screen.getByRole('button', { name: text.detail.save }));

      await waitFor(() => {
        expect(screen.getByText(text.detail.permissionsCount(2, 26))).toBeInTheDocument();
        expect(screen.getByRole('button', { name: text.detail.save })).toBeDisabled();
      });
      unmount();

      // A fresh load (as if the person came back later): the server, not the page, is the source.
      const { user: userAgain } = open();
      await userAgain.click(await screen.findByRole('link', { name: 'Owner' }));

      await waitFor(() => {
        expect(screen.getByText(text.detail.permissionsCount(2, 26))).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Ver de Recordatorios' })).toHaveAttribute(
          'aria-pressed',
          'true',
        );
      });
    });

    it('US1-7: Descartar cambios reverts the table and the name/description to the last saved state', async () => {
      start();
      const { user } = open();
      await user.click(await typeFilter(text.filters.type.system));
      await user.click(await screen.findByRole('link', { name: 'Developer' }));
      const nameField = await screen.findByLabelText(text.detail.fields.name);

      await user.type(nameField, ' Jr');
      await user.click(screen.getByRole('button', { name: 'Ver de Usuarios' }));
      await user.click(screen.getByRole('button', { name: text.detail.discard }));

      expect(nameField).toHaveValue('Developer');
      expect(screen.getByRole('button', { name: 'Ver de Usuarios' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      expect(screen.getByText(text.detail.permissionsCount(0, 16))).toBeInTheDocument();
    });

    it('US1-8: saves the name together with the permissions, and rejects an empty or taken name first', async () => {
      const { roles } = start();
      const { user } = open();
      await user.click(await typeFilter(text.filters.type.system));
      await user.click(await screen.findByRole('link', { name: 'Developer' }));
      const nameField = await screen.findByLabelText(text.detail.fields.name);

      // Empty: blocked client-side, nothing sent.
      await user.clear(nameField);
      await user.click(screen.getByRole('button', { name: text.detail.save }));
      expect(await screen.findByText(messages.roles.validation.nameRequired)).toBeInTheDocument();
      expect(roles.requests.filter((request) => request.method === 'PATCH')).toHaveLength(0);

      // Taken by another role (any type): rejected by the service, nothing saved either.
      await user.type(nameField, 'Owner');
      await user.click(screen.getByRole('button', { name: 'Ver de Usuarios' }));
      await user.click(screen.getByRole('button', { name: text.detail.save }));
      expect(await screen.findByText(text.errors.nameAlreadyExists)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ver de Usuarios' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );

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

    // «FR-017 of 014: warns before leaving the section, from the main menu, with unsaved changes» is
    // checked in `rolesTable.integration.test.tsx` (feature 027, user story 4), where the guard of the
    // screen of the detail is tested.
  },
);
