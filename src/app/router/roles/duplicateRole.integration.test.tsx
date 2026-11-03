import { configure, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import {
  ADMIN_SUB,
  createRolesCatalogMock,
  rolesCatalogScenario,
} from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';

beforeAll(() => {
  configure({ asyncUtilTimeout: 10_000 });
});

const text = messages.roles;

function start() {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock(scenario.directory);
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

/** Enters by the table and opens Administrator (role 1) by its name, so that its way back travels. */
async function openAdministrator(url = '/roles?type=sistema') {
  const app = renderApp({ url, sub: ADMIN_SUB, signedIn: true });
  await app.user.click(await screen.findByRole('link', { name: 'Administrator' }));
  await screen.findByDisplayValue('Administrator');
  return app;
}

describe(
  'Roles y permisos: duplicate a role (features 014 and 027, user story 4)',
  { timeout: 30_000 },
  () => {
    it('US4-1: duplicates Administrator, with an editable name ready right away (FR-014)', async () => {
      start();
      const { user } = await openAdministrator();

      await user.click(screen.getByRole('button', { name: text.detail.duplicate }));

      // The name is immediately editable, with a distinct value already there and the focus in it
      // (US4-1): the route moves the focus to the title first, and the panel takes it to the field.
      await waitFor(() => {
        expect(screen.getByLabelText(text.detail.fields.name)).toHaveValue('Administrator (copia)');
      });
      expect(screen.getByLabelText(text.detail.fields.name)).toBeEnabled();
      await waitFor(() => {
        expect(screen.getByLabelText(text.detail.fields.name)).toHaveFocus();
      });
      expect(screen.getByText(`${text.detail.fields.type}: Sistema`)).toBeInTheDocument();
      expect(await screen.findByText(text.detail.permissionsCount(16, 16))).toBeInTheDocument();

      await user.type(screen.getByLabelText(text.detail.fields.name), ' II');
      await user.click(screen.getByRole('button', { name: text.detail.save }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: text.detail.save })).toBeDisabled();
      });
    });

    it('US4-2: the duplicate is independent — changing its permissions does not touch the original', async () => {
      const { users } = start();
      const { user } = await openAdministrator();

      await user.click(screen.getByRole('button', { name: text.detail.duplicate }));
      await waitFor(() => {
        expect(screen.getByLabelText(text.detail.fields.name)).toHaveValue('Administrator (copia)');
      });

      // Unpressing "Ver" also unpresses the rest of that module (FR-008): all four actions of Usuarios.
      await user.click(await screen.findByRole('button', { name: 'Ver de Usuarios' }));
      await user.click(screen.getByRole('button', { name: text.detail.save }));
      await waitFor(() => {
        expect(screen.getByText(text.detail.permissionsCount(12, 16))).toBeInTheDocument();
      });

      expect(users.state.findRole(1)?.permissions).toContain('users:read');
    });

    it('SC-009, FR-015, FR-017: the copy opens on its own address, and «Volver al listado» shows it, keeping Todos', async () => {
      start();
      const { user, router } = await openAdministrator('/roles');

      await user.click(screen.getByRole('button', { name: text.detail.duplicate }));

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/roles/10');
      });
      await screen.findByDisplayValue('Administrator (copia)');
      await user.click(screen.getByRole('link', { name: text.detail.backToList }));

      expect(await screen.findByRole('link', { name: 'Administrator (copia)' })).toBeVisible();
      expect(router.state.location.pathname).toBe('/roles');
      expect(
        within(screen.getByRole('group', { name: text.filters.typeLabel })).getByRole('button', {
          name: text.filters.type.all,
        }),
      ).toHaveAttribute('aria-pressed', 'true');
    });
  },
);
