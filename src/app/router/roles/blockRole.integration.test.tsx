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

function open(url = '/roles?type=sistema&roleId=5') {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

const filterButton = (group: string, name: string) =>
  within(screen.getByRole('group', { name: group })).getByRole('button', { name });

async function confirmBlock(user: ReturnType<typeof open>['user'], roleName: string) {
  await user.click(screen.getByRole('button', { name: text.status.block }));
  const dialog = await screen.findByRole('dialog', { name: text.status.confirmTitle(roleName) });
  await user.click(within(dialog).getByRole('button', { name: text.status.confirm }));
}

describe(
  'Roles y permisos: block and unblock a role (feature 025, user story 3)',
  { timeout: 30_000 },
  () => {
    it('US3-3 to US3-8, SC-005, SC-006: blocking moves the role to Bloqueados and unblocking brings it back as it was', async () => {
      const { users } = start();
      users.grant('Billing', 'users:read');
      users.grant('Billing', 'roles:read');
      const { user, router } = open();
      await screen.findByDisplayValue('Billing');

      await confirmBlock(user, 'Billing');

      expect(await screen.findByText(text.status.blocked('Billing'))).toBeInTheDocument();
      // The notice comes first; the detail closes with the navigation that follows it.
      expect(await screen.findByText(text.detail.emptySelection)).toBeInTheDocument();
      expect(router.state.location.search).toBe('?type=sistema');
      expect(screen.queryByText('Billing')).not.toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: text.title, level: 1 })).toHaveFocus();
      });

      await user.click(filterButton(text.filters.statusLabel, text.filters.status.blocked));
      await user.click(await screen.findByText('Billing'));
      await user.click(await screen.findByRole('button', { name: text.status.unblock }));

      expect(await screen.findByText(text.status.unblocked('Billing'))).toBeInTheDocument();
      await waitFor(() => {
        expect(router.state.location.search).toBe('?type=sistema&status=bloqueados');
      });
      expect(await screen.findByText(text.list.emptyBlocked)).toBeInTheDocument();

      await user.click(filterButton(text.filters.statusLabel, text.filters.status.active));
      await user.click(await screen.findByText('Billing'));
      expect(await screen.findByDisplayValue('Billing')).toBeInTheDocument();
      expect(screen.getByText(`${text.detail.fields.type}: Sistema`)).toBeInTheDocument();
      expect(await screen.findByText(text.detail.permissionsCount(2, 16))).toBeInTheDocument();
    });

    it('US3-10: a role someone else already blocked is told as information and the list is refreshed', async () => {
      const { users } = start();
      const { user, router } = open();
      await screen.findByDisplayValue('Billing');
      users.setRoleStatus(5, 2);

      await confirmBlock(user, 'Billing');

      expect(await screen.findByText(text.status.alreadyBlocked('Billing'))).toBeInTheDocument();
      await waitFor(() => {
        expect(router.state.location.search).toBe('?type=sistema');
      });
      await waitFor(() => {
        expect(screen.queryByText('Billing')).not.toBeInTheDocument();
      });
    });

    it('US3-11: any other failure is an error notice; the role stays open and can be blocked again', async () => {
      const { users, roles } = start();
      roles.failNext({
        method: 'POST',
        path: '/api/v1/roles/5/block',
        status: 500,
        code: 'internal_error',
      });
      const { user, router } = open();
      await screen.findByDisplayValue('Billing');

      await confirmBlock(user, 'Billing');

      expect(await screen.findByText(text.errors.retryable)).toBeInTheDocument();
      expect(router.state.location.search).toBe('?type=sistema&roleId=5');
      expect(users.state.findRole(5)?.statusId).toBe(1);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      await confirmBlock(user, 'Billing');

      expect(await screen.findByText(text.status.blocked('Billing'))).toBeInTheDocument();
      expect(users.state.findRole(5)?.statusId).toBe(2);
    });

    it('US3-12, FR-017: a blocked role offers no "Eliminar role", and its explanation says to unblock it first', async () => {
      const { users } = start();
      users.setRoleStatus(5, 2);

      open('/roles?status=bloqueados&roleId=5');

      expect(await screen.findByText(text.blocked.explanation)).toBeVisible();
      expect(screen.queryByRole('button', { name: text.delete.action })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: text.status.unblock })).toBeVisible();
    });
  },
);
