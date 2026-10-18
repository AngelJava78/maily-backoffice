import { configure, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import {
  ADMIN_SUB,
  createUsersDirectoryMock,
  defaultDirectory,
  directoryUser,
} from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([import('@/features/users/components/UserDetailPage')]);
}, 90_000);

const text = messages.users;
const FULL_NAME = 'Ana Pérez Gómez';
const ACTIVE = 1;
const BLOCKED = 2;
const DELETED = 3;

type App = ReturnType<typeof renderApp>;

function start(statusId: number) {
  const base = defaultDirectory();
  const mock = createUsersDirectoryMock({
    ...base,
    users: [
      ...base.users,
      directoryUser({
        id: 2,
        statusId,
        email: 'ana@clinica.com',
        firstName: 'Ana',
        paternalLastName: 'Pérez',
        maternalLastName: 'Gómez',
      }),
    ],
  });
  mock.assign(2, 4);
  return mock;
}

/** Every request that would change something in the service. */
function changes(mock: ReturnType<typeof start>) {
  return mock.requests.filter((request) =>
    ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method),
  );
}

interface Scenario {
  readonly action: string;
  readonly statusId: number;
  /** Starts the action and returns the dialog, with what it must say about the user. */
  readonly begin: (user: App['user']) => Promise<{ dialog: HTMLElement; says: string }>;
  /** The button that confirms in the dialog. */
  readonly confirm: string;
  /** The request that the confirmation sends. */
  readonly sends: { readonly method: string; readonly path: string };
}

const confirmationOf =
  (opener: string, title: string, says: string) =>
  async (user: App['user']): Promise<{ dialog: HTMLElement; says: string }> => {
    await user.click(await screen.findByRole('button', { name: opener }));
    return { dialog: await screen.findByRole('dialog', { name: title }), says };
  };

/** The six actions that change who can enter or what a user can do (FR-009, FR-010, SC-003). */
const SCENARIOS: readonly Scenario[] = [
  {
    action: 'block',
    statusId: ACTIVE,
    begin: confirmationOf(
      text.actions.block,
      text.dialogs.block.title,
      text.dialogs.block.body(FULL_NAME),
    ),
    confirm: text.dialogs.block.confirm,
    sends: { method: 'POST', path: '/api/v1/users/2/block' },
  },
  {
    action: 'unblock',
    statusId: BLOCKED,
    begin: confirmationOf(
      text.actions.unblock,
      text.dialogs.unblock.title,
      text.dialogs.unblock.body(FULL_NAME),
    ),
    confirm: text.dialogs.unblock.confirm,
    sends: { method: 'POST', path: '/api/v1/users/2/unblock' },
  },
  {
    action: 'delete',
    statusId: ACTIVE,
    begin: confirmationOf(
      text.actions.delete,
      text.dialogs.delete.title,
      text.dialogs.delete.body(FULL_NAME),
    ),
    confirm: text.dialogs.delete.confirm,
    sends: { method: 'DELETE', path: '/api/v1/users/2' },
  },
  {
    action: 'reactivate',
    statusId: DELETED,
    begin: confirmationOf(
      text.actions.reactivate,
      text.dialogs.reactivate.title,
      text.dialogs.reactivate.body(FULL_NAME),
    ),
    confirm: text.dialogs.reactivate.confirm,
    sends: { method: 'POST', path: '/api/v1/users/2/reactivate' },
  },
  {
    action: 'remove a role',
    statusId: ACTIVE,
    begin: confirmationOf(
      text.roles.remove('Marketing'),
      text.removeRole.title,
      text.removeRole.body('Marketing', FULL_NAME),
    ),
    confirm: text.removeRole.confirm,
    sends: { method: 'DELETE', path: '/api/v1/users/2/roles/4' },
  },
  {
    action: 'add a role',
    statusId: ACTIVE,
    begin: async (user) => {
      await user.click(await screen.findByRole('button', { name: text.roles.add }));
      const dialog = await screen.findByRole('dialog', { name: text.addRole.title });
      await user.click(await within(dialog).findByRole('combobox', { name: /^Role/ }));
      await user.click(screen.getByRole('option', { name: 'Billing' }));
      return { dialog, says: text.addRole.summary('Billing', FULL_NAME) };
    },
    confirm: text.addRole.confirm,
    sends: { method: 'POST', path: '/api/v1/users/2/roles' },
  },
];

describe('the users section: confirmations (SC-003, FR-009, FR-010)', { timeout: 30_000 }, () => {
  it.each(SCENARIOS)(
    'asks for confirmation naming the user before it can $action, and cancelling changes nothing',
    async ({ statusId, begin, confirm, sends }) => {
      const mock = start(statusId);
      const { user } = renderApp({ url: '/users/2', sub: ADMIN_SUB, signedIn: true });

      const { dialog, says } = await begin(user);

      expect(dialog).toHaveTextContent(says);
      expect(changes(mock)).toHaveLength(0);

      await user.click(within(dialog).getByRole('button', { name: messages.common.cancel }));
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(changes(mock)).toHaveLength(0);
      expect(mock.state.findUser(2)?.statusId).toBe(statusId);
      expect(mock.state.rolesOf(2).map((role) => role.name)).toEqual(['Marketing']);

      // Only the confirmation sends the change, once.
      const again = await begin(user);
      await user.click(within(again.dialog).getByRole('button', { name: confirm }));
      await waitFor(() => {
        expect(changes(mock)).toHaveLength(1);
      });
      expect(changes(mock)[0]).toMatchObject(sends);
    },
  );
});
