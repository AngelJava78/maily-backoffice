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
    import('@/features/users/components/UserCreatePage'),
    import('@/features/users/components/UserDetailPage'),
  ]);
}, 90_000);

const labels = messages.users.form.fields;
const email = () => screen.getByLabelText(new RegExp(`^${labels.email}`));
const password = () => screen.getByLabelText(new RegExp(`^${labels.password}`));
const firstName = () => screen.getByLabelText(new RegExp(`^${labels.firstName}`));
const paternal = () => screen.getByLabelText(new RegExp(`^${labels.paternalLastName}`));
const save = () => screen.getByRole('button', { name: new RegExp(`^${messages.users.form.save}`) });
const rolesBox = () => screen.getByRole('combobox', { name: /roles/i });

type App = ReturnType<typeof renderApp>;

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

async function rolesReady() {
  await waitFor(() => {
    expect(rolesBox()).toBeEnabled();
  });
}

async function fillIn(user: App['user'], ...roleNames: string[]) {
  await user.type(email(), 'nora@clinica.com');
  await user.type(password(), 'Segura-123');
  await user.type(firstName(), 'Nora');
  await user.type(paternal(), 'Díaz');
  await user.click(rolesBox());
  for (const name of roleNames) {
    await user.click(screen.getByRole('option', { name }));
  }
  await user.keyboard('{Escape}');
}

describe('the users section: creating (feature 002, user story 2)', { timeout: 30_000 }, () => {
  it('creates a user with two roles from the list, and finds it afterwards (V9)', async () => {
    const mock = createUsersDirectoryMock();
    const { user, router } = open('/users');
    await user.click(await screen.findByRole('link', { name: messages.users.list.createAction }));
    expect(
      await screen.findByRole('heading', { level: 1, name: messages.users.form.createTitle }),
    ).toBeInTheDocument();
    await rolesReady();

    await fillIn(user, 'Marketing', 'Doctor');
    await user.click(save());

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.users.detail.title }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/users/2');
    const roles = await screen.findByRole('region', { name: messages.users.roles.title });
    expect(await within(roles).findByText('Marketing')).toBeInTheDocument();
    expect(within(roles).getByText('Doctor')).toBeInTheDocument();
    expect(mock.state.findByEmail('nora@clinica.com')?.statusId).toBe(1);

    await user.click(screen.getByRole('link', { name: messages.users.detail.backToList }));
    expect(await screen.findByRole('link', { name: 'Nora Díaz' })).toBeInTheDocument();
  });

  it('creates nothing when the form is wrong, the email is repeated, the password is weak or the account exists (V10)', async () => {
    const base = defaultDirectory();
    const mock = createUsersDirectoryMock({
      ...base,
      users: [...base.users, directoryUser({ id: 2, email: 'nora@clinica.com', statusId: 3 })],
    });
    const { user } = open('/users/new');
    await rolesReady();

    await user.click(save());
    expect(await screen.findByText(messages.users.validation.emailRequired)).toBeInTheDocument();
    expect(email()).toHaveFocus();

    await fillIn(user, 'Marketing');
    await user.click(save());
    expect(
      await screen.findByText(messages.users.errors.emailAlreadyRegistered),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: messages.users.errors.searchThisEmail }),
    ).toHaveAttribute('href', '/users?email=nora%40clinica.com');

    await user.clear(email());
    await user.type(email(), 'otra@clinica.com');
    mock.rejectPassword();
    await user.click(save());
    expect(await screen.findByText(messages.users.errors.passwordRejected)).toBeInTheDocument();

    mock.rejectPassword(false);
    mock.identity.accountExists('otra@clinica.com');
    await user.click(save());
    expect(await screen.findByText(messages.users.errors.accountAlreadyExists)).toBeInTheDocument();

    // Only the user that already existed: none of the four attempts created anything.
    expect(mock.state.users()).toHaveLength(2);
  });

  it('keeps what was typed and creates nothing when the identity provider fails (V11)', async () => {
    const mock = createUsersDirectoryMock();
    mock.identity.unavailable();
    const { user } = open('/users/new');
    await rolesReady();
    await fillIn(user, 'Marketing');

    await user.click(save());

    expect(
      await screen.findByText(messages.users.errors.identityUnavailableCreate),
    ).toBeInTheDocument();
    expect(email()).toHaveValue('nora@clinica.com');
    expect(mock.state.users()).toHaveLength(1);

    mock.identity.recover();
    await user.click(save());
    expect(
      await screen.findByRole('heading', { level: 1, name: messages.users.detail.title }),
    ).toBeInTheDocument();
  });

  it('keeps the user when a role fails, warns which one is missing and assigns it after the role is restored (V12)', async () => {
    const mock = createUsersDirectoryMock();
    const { user } = open('/users/new');
    await rolesReady();
    mock.setRoleStatus(6, 2);
    await fillIn(user, 'Marketing', 'Doctor');

    await user.click(save());

    // The notice that the user was created is an alert too: this one is found by its title.
    const warning = (await screen.findByText(messages.users.pendingRoles.title)).closest(
      '[role="alert"]',
    );
    expect(warning).toHaveTextContent(messages.users.pendingRoles.message('Doctor'));
    expect(mock.state.findByEmail('nora@clinica.com')).toBeDefined();
    expect(
      await within(
        await screen.findByRole('region', { name: messages.users.roles.title }),
      ).findByText('Marketing'),
    ).toBeInTheDocument();

    mock.setRoleStatus(6, 1);
    await user.click(screen.getByRole('button', { name: messages.users.pendingRoles.retry }));

    await waitFor(() => {
      expect(screen.queryByText(messages.users.pendingRoles.title)).not.toBeInTheDocument();
    });
    expect(await screen.findByText('Doctor', { selector: 'li span' })).toBeInTheDocument();
  });

  it.each([
    ['users:update', 'can write but not update'],
    ['roles:read', 'can write and update but not read the roles'],
  ])(
    'does not offer to create to someone without %s, and sends them back to the list (V13, US2-11)',
    async (permission) => {
      const mock = createUsersDirectoryMock();
      mock.revoke('Administrator', permission);
      const { router } = open('/users/new');

      expect(await screen.findByText(messages.forbidden.action)).toBeInTheDocument();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/users');
      });
      expect(
        screen.queryByRole('link', { name: messages.users.list.createAction }),
      ).not.toBeInTheDocument();
    },
  );
});
