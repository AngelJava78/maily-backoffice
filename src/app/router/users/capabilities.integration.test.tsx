import { focusManager } from '@tanstack/react-query';
import { act, configure, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import {
  ADMIN_SUB,
  createUsersDirectoryMock,
  defaultDirectory,
  directoryUser,
} from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';
import { uuidOf } from '@/test/ids';

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([
    import('@/features/users/components/UsersListPage'),
    import('@/features/users/components/UserDetailPage'),
  ]);
}, 90_000);

const text = messages.users;

/**
 * The operator has only the role Developer, which starts without permissions, and each test grants
 * the ones it needs: what the section offers follows the permissions (FR-015, FR-025).
 */
function start(...permissions: string[]) {
  const base = defaultDirectory();
  const mock = createUsersDirectoryMock({
    ...base,
    users: [
      ...base.users,
      directoryUser({
        id: uuidOf(2),
        email: 'ana@clinica.com',
        firstName: 'Ana',
        paternalLastName: 'Pérez',
        maternalLastName: 'Gómez',
      }),
    ],
    associations: [{ userId: uuidOf(1), roleId: 2 }],
  });
  mock.assign(uuidOf(2), 4);
  for (const permission of permissions) {
    mock.grant('Developer', permission);
  }
  return mock;
}

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

/** What the detail of Ana offers to this operator, once her roles are on screen. */
async function offeredInDetail() {
  // Everyone who gets here can read the users, so the roles of Ana are always shown: if they are
  // not, the panel is broken and the test must say so, not report that nothing is offered.
  await screen.findByText('Marketing', { selector: 'li span' });
  await screen.findByText('ana@clinica.com');
  const has = (role: 'button' | 'link', name: string | RegExp) =>
    screen.queryByRole(role, { name }) !== null;
  return {
    edit: has('link', text.actions.edit),
    block: has('button', text.actions.block),
    delete: has('button', text.actions.delete),
    addRole: has('button', text.roles.add),
    removeRole: has('button', /^Quitar el role/),
  };
}

const createLink = () => screen.queryByRole('link', { name: text.list.createAction });

describe(
  'the users section: what is offered follows the permissions (FR-015, FR-025)',
  {
    timeout: 30_000,
  },
  () => {
    it('shows the list, the detail and the search, without any action, to who can only read', async () => {
      start('users:read');
      const { user } = open('/users');

      expect(await screen.findByRole('link', { name: 'Ana Pérez Gómez' })).toBeInTheDocument();
      expect(createLink()).not.toBeInTheDocument();
      await user.type(screen.getByLabelText(text.search.label), 'ana@clinica.com');
      await user.click(screen.getByRole('button', { name: text.search.submit }));
      await user.click(await screen.findByRole('link', { name: text.search.viewDetail }));

      expect(await offeredInDetail()).toEqual({
        edit: false,
        block: false,
        delete: false,
        addRole: false,
        removeRole: false,
      });
      expect(screen.getByText('Marketing', { selector: 'li span' })).toBeInTheDocument();
    });

    it('adds editing, taking roles away and the changes of status with users:update, but not adding roles, creating or deleting', async () => {
      start('users:read', 'users:update');
      open(`/users/${uuidOf(2)}`);

      expect(await offeredInDetail()).toEqual({
        edit: true,
        block: true,
        delete: false,
        addRole: false,
        removeRole: true,
      });
    });

    it('adds "Agregar role" with roles:read', async () => {
      start('users:read', 'users:update', 'roles:read');
      open(`/users/${uuidOf(2)}`);

      expect(await offeredInDetail()).toMatchObject({ addRole: true, delete: false });
    });

    it('adds "Crear usuario" with users:write, once it can also update and read the roles', async () => {
      const mock = start('users:read', 'users:update', 'users:write');
      const view = open('/users');
      await screen.findByRole('link', { name: 'Ana Pérez Gómez' });
      // Without the permission to read the roles, creating is not offered.
      expect(createLink()).not.toBeInTheDocument();
      view.unmount();

      mock.grant('Developer', 'roles:read');
      open('/users');
      expect(await screen.findByRole('link', { name: text.list.createAction })).toBeInTheDocument();
    });

    it('adds "Eliminar" with users:delete', async () => {
      start('users:read', 'users:update', 'users:delete');
      open(`/users/${uuidOf(2)}`);

      expect(await offeredInDetail()).toMatchObject({ delete: true });
    });

    it('hides the action when the permission is taken away while the person is on the screen', async () => {
      const mock = start('users:read', 'users:update', 'roles:read');
      open(`/users/${uuidOf(2)}`);
      expect(await offeredInDetail()).toMatchObject({
        edit: true,
        addRole: true,
        removeRole: true,
      });

      // Another administrator takes the permission away; coming back to the tab rechecks the access.
      mock.revoke('Developer', 'users:update');
      act(() => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
      });

      await waitFor(() => {
        expect(screen.queryByRole('link', { name: text.actions.edit })).not.toBeInTheDocument();
      });
      expect(screen.queryByRole('button', { name: text.roles.add })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Quitar el role/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: text.actions.block })).not.toBeInTheDocument();
      expect(screen.getByText('Marketing', { selector: 'li span' })).toBeInTheDocument();
    });
  },
);
