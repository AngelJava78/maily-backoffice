import { focusManager } from '@tanstack/react-query';
import { act, configure, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import {
  createSubscriptionsCatalogMock,
  defaultCatalog,
} from '@/test/handlers/subscriptionsCatalog';
import {
  ADMIN_SUB,
  createUsersDirectoryMock,
  defaultDirectory,
} from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';
import { uuidOf } from '@/test/ids';

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([
    import('@/features/subscriptions/components/SubscriptionsListPage'),
    import('@/features/subscriptions/components/SubscriptionDetailPage'),
  ]);
}, 90_000);

const text = messages.subscriptions;

/**
 * The operator has only the role Developer, which starts without permissions, and each test grants
 * the ones it needs: what the section offers follows the permissions (FR-013, SC-010).
 */
function start(...permissions: string[]) {
  const base = defaultDirectory();
  const directory = createUsersDirectoryMock({
    ...base,
    associations: [{ userId: uuidOf(1), roleId: 2 }],
  });
  for (const permission of permissions) {
    directory.grant('Developer', permission);
  }
  const catalog = createSubscriptionsCatalogMock({ directory, initial: defaultCatalog() });
  return { directory, catalog };
}

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

/** What the list and the detail of Pro offer to this operator. */
async function offered() {
  const { user } = open('/subscriptions');
  await screen.findByRole('link', { name: 'Pro' });
  const create = screen.queryByRole('link', { name: text.list.createAction }) !== null;
  await user.click(screen.getByRole('link', { name: 'Pro' }));
  await screen.findByText('Para clínicas en crecimiento.');
  return {
    create,
    edit: screen.queryByRole('link', { name: text.actions.edit }) !== null,
    changeStatus:
      screen.queryByRole('button', { name: new RegExp(text.actions.changeStatus) }) !== null,
    delete: screen.queryByRole('button', { name: text.actions.delete }) !== null,
  };
}

describe(
  'the subscriptions section: what each permission offers (FR-013, SC-010)',
  { timeout: 30_000 },
  () => {
    it('offers only the list and the detail with subscriptions:read', async () => {
      start('subscriptions:read');

      expect(await offered()).toEqual({
        create: false,
        edit: false,
        changeStatus: false,
        delete: false,
      });
    });

    it('adds «Nueva suscripción» with subscriptions:write', async () => {
      start('subscriptions:read', 'subscriptions:write');

      expect(await offered()).toEqual({
        create: true,
        edit: false,
        changeStatus: false,
        delete: false,
      });
    });

    it('adds «Editar» and «Cambiar estatus» with subscriptions:update', async () => {
      start('subscriptions:read', 'subscriptions:update');

      expect(await offered()).toEqual({
        create: false,
        edit: true,
        changeStatus: true,
        delete: false,
      });
    });

    it('adds «Eliminar» with subscriptions:delete', async () => {
      start('subscriptions:read', 'subscriptions:delete');

      expect(await offered()).toEqual({
        create: false,
        edit: false,
        changeStatus: false,
        delete: true,
      });
    });

    it('offers nothing of the section without subscriptions:read, whatever else it has', async () => {
      start('subscriptions:write', 'subscriptions:update', 'subscriptions:delete', 'users:read');
      const { router } = open('/subscriptions');

      expect(await screen.findByText(messages.home.permissionsChanged)).toBeInTheDocument();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/');
      });
    });

    it('hides an action when its permission is taken away while the person is on the screen', async () => {
      const { directory } = start(
        'subscriptions:read',
        'subscriptions:update',
        'subscriptions:delete',
      );
      open('/subscriptions/2');
      await screen.findByText('Para clínicas en crecimiento.');
      expect(screen.getByRole('link', { name: text.actions.edit })).toBeInTheDocument();

      // Another administrator takes the permission away; coming back to the tab rechecks the access.
      directory.revoke('Developer', 'subscriptions:update');
      act(() => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
      });

      await waitFor(() => {
        expect(screen.queryByRole('link', { name: text.actions.edit })).not.toBeInTheDocument();
      });
      expect(
        screen.queryByRole('button', { name: new RegExp(text.actions.changeStatus) }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: text.actions.delete })).toBeInTheDocument();
    });
  },
);
