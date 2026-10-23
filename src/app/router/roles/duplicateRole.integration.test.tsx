import { configure, screen, waitFor } from '@testing-library/react';
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

function open(url = '/roles?type=sistema&roleId=1') {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

describe(
  'Roles y permisos: duplicate a role (feature 014, user story 4)',
  { timeout: 30_000 },
  () => {
    it('US4-1: duplicates Administrator, with an editable name ready right away (FR-014)', async () => {
      start();
      const { user } = open();
      await screen.findByDisplayValue('Administrator');

      await user.click(screen.getByRole('button', { name: text.detail.duplicate }));

      // The name is immediately editable, with a distinct value already there (US4-1); the DOM
      // focus itself is already covered at the component level (RoleDetailPanel.test.tsx).
      await waitFor(() => {
        expect(screen.getByLabelText(text.detail.fields.name)).toHaveValue('Administrator (copia)');
      });
      expect(screen.getByLabelText(text.detail.fields.name)).toBeEnabled();
      expect(screen.getByText(`${text.detail.fields.type}: Sistema`)).toBeInTheDocument();
      expect(screen.getByText(text.detail.permissionsCount(16, 16))).toBeInTheDocument();

      await user.type(screen.getByLabelText(text.detail.fields.name), ' II');
      await user.click(screen.getByRole('button', { name: text.detail.save }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: text.detail.save })).toBeDisabled();
      });
    });

    it('US4-2: the duplicate is independent — changing its permissions does not touch the original', async () => {
      const { users } = start();
      const { user } = open();
      await screen.findByDisplayValue('Administrator');

      await user.click(screen.getByRole('button', { name: text.detail.duplicate }));
      await waitFor(() => {
        expect(screen.getByLabelText(text.detail.fields.name)).toHaveValue('Administrator (copia)');
      });

      // Unchecking "Ver" also unchecks the rest of that row (FR-008): all four actions of Usuarios.
      await user.click(screen.getByRole('checkbox', { name: 'Ver de Usuarios' }));
      await user.click(screen.getByRole('button', { name: text.detail.save }));
      await waitFor(() => {
        expect(screen.getByText(text.detail.permissionsCount(12, 16))).toBeInTheDocument();
      });

      expect(users.state.findRole(1)?.permissions).toContain('users:read');
    });
  },
);
