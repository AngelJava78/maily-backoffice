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
import { uuidOf } from '@/test/ids';

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([
    import('@/features/users/components/UsersListPage'),
    import('@/features/users/components/UserDetailPage'),
    import('@/features/users/components/UserCreatePage'),
  ]);
}, 90_000);

const text = messages.users;
const ACTIVE = 1;
const DELETED = 3;

type App = ReturnType<typeof renderApp>;

/** Ana Pérez Gómez (user 2) has the role Marketing; the administrator who operates is user 1. */
function start(statusId = ACTIVE) {
  const base = defaultDirectory();
  const mock = createUsersDirectoryMock({
    ...base,
    users: [
      ...base.users,
      directoryUser({
        id: uuidOf(2),
        statusId,
        email: 'ana@clinica.com',
        firstName: 'Ana',
        paternalLastName: 'Pérez',
        maternalLastName: 'Gómez',
      }),
    ],
  });
  mock.assign(uuidOf(2), 4);
  return mock;
}

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

const button = (name: string) => screen.findByRole('button', { name });

/** Confirms and waits for the dialog to be gone: while it fades out the rest is hidden from roles. */
async function confirmDialog(user: App['user'], title: string, confirm: string) {
  const dialog = await screen.findByRole('dialog', { name: title });
  await user.click(within(dialog).getByRole('button', { name: confirm }));
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
}

async function confirmDelete(user: App['user']) {
  await user.click(await button(text.actions.delete));
  await confirmDialog(user, text.dialogs.delete.title, text.dialogs.delete.confirm);
}

async function confirmReactivate(user: App['user']) {
  await user.click(await button(text.actions.reactivate));
  await confirmDialog(user, text.dialogs.reactivate.title, text.dialogs.reactivate.confirm);
}

describe(
  'the users section: deleting and reactivating (feature 002, user story 5)',
  {
    timeout: 30_000,
  },
  () => {
    it('deletes a user from its detail, it leaves the list and is found as deleted, and reactivating brings it back with its roles (V22)', async () => {
      const mock = start();
      const { user } = open('/users');
      await screen.findByText('1–2 de 2');
      await user.click(await screen.findByRole('link', { name: 'Ana Pérez Gómez' }));

      // The dialog names the user and says what happens; cancelling changes nothing.
      await user.click(await button(text.actions.delete));
      const dialog = await screen.findByRole('dialog', { name: text.dialogs.delete.title });
      expect(dialog).toHaveAccessibleDescription(text.dialogs.delete.body('Ana Pérez Gómez'));
      await user.click(within(dialog).getByRole('button', { name: messages.common.cancel }));
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(mock.state.findUser(uuidOf(2))?.statusId).toBe(ACTIVE);

      await confirmDelete(user);

      expect(await screen.findByText(text.statusNotices.deleted)).toBeInTheDocument();
      expect(await screen.findByText(text.status.deleted)).toBeInTheDocument();
      expect(mock.state.findUser(uuidOf(2))?.statusId).toBe(DELETED);
      // Its detail offers only to reactivate it, and says that its roles are not shown (US5-7).
      expect(await button(text.actions.reactivate)).toBeInTheDocument();
      expect(await screen.findByText(text.roles.unavailable)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: text.actions.delete })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: text.actions.block })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: text.actions.edit })).not.toBeInTheDocument();

      // It is not in the list any more, but the email finds it, as deleted.
      await user.click(screen.getByRole('link', { name: text.detail.backToList }));
      expect(await screen.findByText('1–1 de 1')).toBeInTheDocument();
      const field = screen.getByLabelText(text.search.label);
      await user.type(field, 'ana@clinica.com');
      await user.click(screen.getByRole('button', { name: text.search.submit }));
      expect(await screen.findByText(text.status.deleted)).toBeInTheDocument();

      // Reactivating it from its detail gives it back its roles.
      await user.click(screen.getByRole('link', { name: text.search.viewDetail }));
      await confirmReactivate(user);
      expect(await screen.findByText(text.statusNotices.reactivated)).toBeInTheDocument();
      expect(await screen.findByText('Marketing', { selector: 'li span' })).toBeInTheDocument();
      expect(mock.state.findUser(uuidOf(2))?.statusId).toBe(ACTIVE);
      await user.click(screen.getByRole('link', { name: text.detail.backToList }));
      expect(await screen.findByText(text.status.active)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: text.search.clear }));
      expect(await screen.findByText('1–2 de 2')).toBeInTheDocument();
    });

    it('keeps the email of a deleted user reserved: creating another user with it is refused, with a way to find the first (FR-022)', async () => {
      start(DELETED);
      const { user } = open('/users/new');
      const labels = text.form.fields;
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /roles/i })).toBeEnabled();
      });

      await user.type(screen.getByLabelText(new RegExp(`^${labels.email}`)), 'ana@clinica.com');
      await user.type(screen.getByLabelText(new RegExp(`^${labels.password}`)), 'Segura-123');
      await user.type(screen.getByLabelText(new RegExp(`^${labels.firstName}`)), 'Otra');
      await user.type(screen.getByLabelText(new RegExp(`^${labels.paternalLastName}`)), 'Persona');
      await user.click(screen.getByRole('combobox', { name: /roles/i }));
      await user.click(screen.getByRole('option', { name: 'Marketing' }));
      await user.keyboard('{Escape}');
      await user.click(
        screen.getByRole('button', { name: new RegExp(`^${messages.common.save}`) }),
      );

      expect(await screen.findByText(text.errors.emailAlreadyRegistered)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: text.errors.searchThisEmail })).toHaveAttribute(
        'href',
        '/users?email=ana%40clinica.com',
      );
    });

    it('does not offer to delete the own user of the operator (US5-5)', async () => {
      start();
      open(`/users/${uuidOf(1)}`);

      expect(await screen.findByText(text.detail.selfNote)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: text.actions.delete })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: text.actions.block })).not.toBeInTheDocument();
    });

    it('offers to delete only to who has users:delete, and to reactivate only to who has users:update (US5-8, V24)', async () => {
      const mock = start();
      mock.revoke('Administrator', 'users:delete');
      const withoutDelete = open(`/users/${uuidOf(2)}`);
      expect(await button(text.actions.block)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: text.actions.delete })).not.toBeInTheDocument();
      withoutDelete.unmount();

      mock.setUserStatus(uuidOf(2), DELETED);
      mock.grant('Administrator', 'users:delete');
      mock.revoke('Administrator', 'users:update');
      open(`/users/${uuidOf(2)}`);
      await screen.findByText(text.roles.unavailable);
      expect(
        screen.queryByRole('button', { name: text.actions.reactivate }),
      ).not.toBeInTheDocument();
    });

    it('warns that the person has no access account when reactivating, and the user stays deleted (V23)', async () => {
      const mock = start(DELETED);
      mock.identity.accountMissing(uuidOf(2));
      const { user } = open(`/users/${uuidOf(2)}`);

      await confirmReactivate(user);

      expect(await screen.findByText(text.errors.accountMissingReactivate)).toBeInTheDocument();
      expect(mock.state.findUser(uuidOf(2))?.statusId).toBe(DELETED);
      expect(await button(text.actions.reactivate)).toBeInTheDocument();
    });
  },
);
