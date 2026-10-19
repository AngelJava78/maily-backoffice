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
  await Promise.all([
    import('@/features/users/components/UsersListPage'),
    import('@/features/users/components/UserDetailPage'),
  ]);
}, 90_000);

const text = messages.users;
const ACTIVE = 1;
const BLOCKED = 2;

type App = ReturnType<typeof renderApp>;

/** Ana Pérez Gómez (user 2) is the one that is blocked; the administrator who operates is user 1. */
function start(statusId = ACTIVE) {
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

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

const blockButton = () => screen.findByRole('button', { name: text.actions.block });
const unblockButton = () => screen.findByRole('button', { name: text.actions.unblock });

/** Confirms and waits for the dialog to be gone: while it fades out the rest is hidden from roles. */
async function confirmDialog(user: App['user'], title: string, confirm: string) {
  const dialog = await screen.findByRole('dialog', { name: title });
  await user.click(within(dialog).getByRole('button', { name: confirm }));
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
}

async function confirmBlock(user: App['user']) {
  await user.click(await blockButton());
  await confirmDialog(user, text.dialogs.block.title, text.dialogs.block.confirm);
}

async function confirmUnblock(user: App['user']) {
  await user.click(await unblockButton());
  await confirmDialog(user, text.dialogs.unblock.title, text.dialogs.unblock.confirm);
}

describe(
  'the users section: blocking and unblocking (feature 002, user story 4)',
  {
    timeout: 30_000,
  },
  () => {
    it('blocks a user from its detail, and it leaves the list and is found by email; unblocking brings it back (V20)', async () => {
      const mock = start();
      const { user } = open('/users');
      await screen.findByText('1–2 de 2');
      await user.click(await screen.findByRole('link', { name: 'Ana Pérez Gómez' }));

      // The dialog names the user and says what happens; cancelling changes nothing.
      await user.click(await blockButton());
      const dialog = await screen.findByRole('dialog', { name: text.dialogs.block.title });
      expect(dialog).toHaveAccessibleDescription(text.dialogs.block.body('Ana Pérez Gómez'));
      await user.click(within(dialog).getByRole('button', { name: messages.common.cancel }));
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(mock.state.findUser(2)?.statusId).toBe(ACTIVE);

      await confirmBlock(user);

      expect(await screen.findByText(text.statusNotices.blocked)).toBeInTheDocument();
      expect(await screen.findByText(text.status.blocked)).toBeInTheDocument();
      expect(mock.state.findUser(2)?.statusId).toBe(BLOCKED);
      expect(await screen.findByText(text.roles.unavailable)).toBeInTheDocument();

      // It is not in the list any more, nor in its total, but the email finds it.
      await user.click(screen.getByRole('link', { name: text.detail.backToList }));
      expect(await screen.findByText('1–1 de 1')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Ana Pérez Gómez' })).not.toBeInTheDocument();
      const field = screen.getByLabelText(text.search.label);
      await user.type(field, 'ana@clinica.com');
      await user.click(screen.getByRole('button', { name: text.search.submit }));
      expect(await screen.findByText(text.status.blocked)).toBeInTheDocument();

      // Unblocking it from its detail brings it back.
      await user.click(screen.getByRole('link', { name: text.search.viewDetail }));
      await confirmUnblock(user);
      expect(await screen.findByText(text.statusNotices.unblocked)).toBeInTheDocument();
      expect(mock.state.findUser(2)?.statusId).toBe(ACTIVE);
      // Back to the search it came from, which now finds it active, and then to the whole list.
      await user.click(screen.getByRole('link', { name: text.detail.backToList }));
      expect(await screen.findByText(text.status.active)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: text.search.clear }));
      expect(await screen.findByText('1–2 de 2')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Ana Pérez Gómez' })).toBeInTheDocument();
    });

    it('offers only to unblock a blocked user, without editing or actions on the roles (V19)', async () => {
      start(BLOCKED);
      open('/users/2');

      expect(await unblockButton()).toBeInTheDocument();
      expect(await screen.findByText(text.roles.unavailable)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: text.actions.block })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: text.actions.edit })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: text.roles.add })).not.toBeInTheDocument();
    });

    it('does not offer to block the own user of the operator (US4-8)', async () => {
      start();
      open('/users/1');

      expect(await screen.findByText(text.detail.selfNote)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: text.actions.edit })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: text.actions.block })).not.toBeInTheDocument();
    });

    it('does not offer to block or unblock to someone without users:update (US4-9)', async () => {
      const mock = start();
      mock.revoke('Administrator', 'users:update');
      const { unmount } = open('/users/2');
      await screen.findByText('ana@clinica.com');
      expect(screen.queryByRole('button', { name: text.actions.block })).not.toBeInTheDocument();
      unmount();

      mock.setUserStatus(2, BLOCKED);
      open('/users/2');
      await screen.findByText(text.roles.unavailable);
      expect(screen.queryByRole('button', { name: text.actions.unblock })).not.toBeInTheDocument();
    });

    it('keeps the status and explains it when the access account cannot be updated, and works once it can (US4-6)', async () => {
      const mock = start();
      mock.identity.unavailable();
      const { user } = open('/users/2');

      await confirmBlock(user);

      expect(await screen.findByText(text.errors.identityUnavailable)).toBeInTheDocument();
      expect(mock.state.findUser(2)?.statusId).toBe(ACTIVE);
      expect(await screen.findByText(text.status.active)).toBeInTheDocument();

      mock.identity.recover();
      await confirmBlock(user);
      expect(await screen.findByText(text.statusNotices.blocked)).toBeInTheDocument();
      expect(mock.state.findUser(2)?.statusId).toBe(BLOCKED);
    });

    it('warns in the second tab that the user already has another status, and updates it (V21)', async () => {
      const mock = start();
      const { user } = open('/users/2');
      await blockButton();
      // The first tab blocked the same user.
      mock.setUserStatus(2, BLOCKED);

      await confirmBlock(user);

      expect(await screen.findByText(text.errors.statusChanged)).toBeInTheDocument();
      expect(await screen.findByText(text.status.blocked)).toBeInTheDocument();
      expect(await unblockButton()).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: text.actions.block })).not.toBeInTheDocument();
    });

    it('warns that the person has no access account when unblocking, and the user stays blocked (V23)', async () => {
      const mock = start(BLOCKED);
      mock.identity.accountMissing(2);
      const { user } = open('/users/2');

      await confirmUnblock(user);

      expect(await screen.findByText(text.errors.accountMissingUnblock)).toBeInTheDocument();
      expect(mock.state.findUser(2)?.statusId).toBe(BLOCKED);
      expect(await unblockButton()).toBeInTheDocument();
    });
  },
);
