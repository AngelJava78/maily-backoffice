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

function open(url = '/roles?type=sistema') {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

/** Enters by the table and opens Billing (role 5) by its name, so that its way back travels. */
async function openBilling(url = '/roles?type=sistema') {
  const app = open(url);
  await app.user.click(await screen.findByRole('link', { name: 'Billing' }));
  await screen.findByDisplayValue('Billing');
  return app;
}

const filterButton = (group: string, name: string) =>
  within(screen.getByRole('group', { name: group })).getByRole('button', { name });

async function confirmBlock(user: ReturnType<typeof open>['user'], roleName: string) {
  await user.click(screen.getByRole('button', { name: text.status.block }));
  const dialog = await screen.findByRole('dialog', { name: text.status.confirmTitle(roleName) });
  await user.click(within(dialog).getByRole('button', { name: text.status.confirm }));
}

describe(
  'Roles y permisos: block and unblock a role (features 025 and 027, user story 3)',
  { timeout: 30_000 },
  () => {
    it('US3-3 to US3-8, SC-005, SC-006, SC-008: blocking takes the role back to the table, out of Activos, and unblocking brings it back as it was', async () => {
      const { users } = start();
      users.grant('Billing', 'users:read');
      users.grant('Billing', 'roles:read');
      const { user, router } = await openBilling();

      await confirmBlock(user, 'Billing');

      expect(await screen.findByText(text.status.blocked('Billing'))).toBeInTheDocument();
      // The table it came from takes the place of the detail, without the role, and the title of
      // the screen takes the focus (FR-016).
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/roles');
      });
      expect(router.state.location.search).toBe('?type=sistema');
      expect(await screen.findByRole('link', { name: 'Developer' })).toBeVisible();
      expect(screen.queryByRole('link', { name: 'Billing' })).not.toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: text.title, level: 1 })).toHaveFocus();
      });

      await user.click(filterButton(text.filters.statusLabel, text.filters.status.blocked));
      await user.click(await screen.findByRole('link', { name: 'Billing' }));
      await user.click(await screen.findByRole('button', { name: text.status.unblock }));

      expect(await screen.findByText(text.status.unblocked('Billing'))).toBeInTheDocument();
      await waitFor(() => {
        expect(router.state.location.search).toBe('?type=sistema&status=bloqueados');
      });
      // In the box of the table: the same message is also written in the status region.
      const grid = await screen.findByRole('grid', { name: text.list.gridLabel });
      expect(await within(grid).findByText(text.list.emptyBlocked)).toBeInTheDocument();

      await user.click(filterButton(text.filters.statusLabel, text.filters.status.active));
      await user.click(await screen.findByRole('link', { name: 'Billing' }));
      expect(await screen.findByDisplayValue('Billing')).toBeInTheDocument();
      expect(screen.getByText(`${text.detail.fields.type}: Sistema`)).toBeInTheDocument();
      expect(await screen.findByText(text.detail.permissionsCount(2, 16))).toBeInTheDocument();
    });

    it('US3-10: a role someone else already blocked is told as information and the table is refreshed', async () => {
      const { users } = start();
      const { user, router } = await openBilling();
      users.setRoleStatus(5, 2);

      await confirmBlock(user, 'Billing');

      expect(await screen.findByText(text.status.alreadyBlocked('Billing'))).toBeInTheDocument();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/roles');
      });
      expect(router.state.location.search).toBe('?type=sistema');
      expect(await screen.findByRole('link', { name: 'Developer' })).toBeVisible();
      await waitFor(() => {
        expect(screen.queryByRole('link', { name: 'Billing' })).not.toBeInTheDocument();
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
      const { user, router } = await openBilling();

      await confirmBlock(user, 'Billing');

      expect(await screen.findByText(text.errors.retryable)).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/roles/5');
      expect(users.state.findRole(5)?.statusId).toBe(1);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      await confirmBlock(user, 'Billing');

      expect(await screen.findByText(text.status.blocked('Billing'))).toBeInTheDocument();
      expect(users.state.findRole(5)?.statusId).toBe(2);
    });

    it('US3-12, FR-017: a blocked role, opened from Bloqueados, offers no "Eliminar role", and its explanation says to unblock it first', async () => {
      const { users } = start();
      users.setRoleStatus(5, 2);
      const { user } = open('/roles?status=bloqueados');

      await user.click(await screen.findByRole('link', { name: 'Billing' }));

      expect(await screen.findByText(text.blocked.explanation)).toBeVisible();
      expect(screen.queryByRole('button', { name: text.delete.action })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: text.status.unblock })).toBeVisible();
    });
  },
);
