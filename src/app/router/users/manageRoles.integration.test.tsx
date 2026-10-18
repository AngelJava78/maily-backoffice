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
import { callService } from '@/test/usersClient';

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([
    import('@/features/users/components/UsersListPage'),
    import('@/features/users/components/UserDetailPage'),
  ]);
}, 90_000);

const text = messages.users;

type App = ReturnType<typeof renderApp>;

/** Ana Pérez Gómez has the role Marketing; the administrator who operates is user 1. */
function start() {
  const base = defaultDirectory();
  const mock = createUsersDirectoryMock({
    ...base,
    users: [
      ...base.users,
      directoryUser({
        id: 2,
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

const rolesSection = () => screen.findByRole('region', { name: text.roles.title });
/** The names in the list of roles; the navigation of the page has a list of its own. */
const roleNames = async () =>
  within(within(await rolesSection()).getByRole('list'))
    .getAllByRole('listitem')
    .map((item) => item.firstElementChild?.textContent);

async function confirmInDialog(user: App['user'], title: string, confirm: string) {
  const dialog = await screen.findByRole('dialog', { name: title });
  await user.click(within(dialog).getByRole('button', { name: confirm }));
}

describe('the users section: roles (feature 002, user story 3)', { timeout: 30_000 }, () => {
  it('adds a role and takes another away, each with its confirmation, without reloading the page (V15)', async () => {
    const mock = start();
    const { user } = open('/users/2');
    const section = await rolesSection();
    await within(section).findByText('Marketing');

    await user.click(within(section).getByRole('button', { name: text.roles.add }));
    const adding = await screen.findByRole('dialog', { name: text.addRole.title });
    await user.click(await within(adding).findByRole('combobox', { name: /^Role/ }));
    await user.click(screen.getByRole('option', { name: 'Billing' }));
    expect(adding).toHaveTextContent(text.addRole.summary('Billing', 'Ana Pérez Gómez'));
    await user.click(within(adding).getByRole('button', { name: text.addRole.confirm }));

    expect(await screen.findByText(text.addRole.added)).toBeInTheDocument();
    await waitFor(async () => {
      expect(await roleNames()).toEqual(['Billing', 'Marketing']);
    });

    await user.click(within(section).getByRole('button', { name: text.roles.remove('Marketing') }));
    const removing = await screen.findByRole('dialog', { name: text.removeRole.title });
    expect(removing).toHaveAccessibleDescription(
      text.removeRole.body('Marketing', 'Ana Pérez Gómez'),
    );
    await user.click(within(removing).getByRole('button', { name: text.removeRole.confirm }));

    expect(await screen.findByText(text.removeRole.removed)).toBeInTheDocument();
    await waitFor(async () => {
      expect(await roleNames()).toEqual(['Billing']);
    });
    expect(mock.state.rolesOf(2).map((role) => role.name)).toEqual(['Billing']);
    // Only the roles were asked for again: the page was not loaded anew.
    expect(mock.requestsTo('GET', '/api/v1/users/2')).toHaveLength(1);
  });

  it('warns that it was already done, and shows the roles that the user has, when another tab took the same role away (V16)', async () => {
    start();
    const { user } = open('/users/2');
    const section = await rolesSection();
    await within(section).findByText('Marketing');
    // The other tab takes Marketing away first.
    await callService('/api/v1/users/2/roles/4', { method: 'DELETE' });

    await user.click(within(section).getByRole('button', { name: text.roles.remove('Marketing') }));
    await confirmInDialog(user, text.removeRole.title, text.removeRole.confirm);

    expect(await screen.findByText(text.errors.alreadyDone)).toBeInTheDocument();
    expect(await within(section).findByText(text.roles.none)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('shows no action on the roles on the own user, and explains why (V17)', async () => {
    start();
    const { user } = open('/users');
    await user.click(await screen.findByRole('link', { name: 'Admin Sistema' }));

    expect(await screen.findByText(text.detail.selfNote)).toBeInTheDocument();
    const section = await rolesSection();
    await within(section).findByText('Administrator');
    expect(screen.queryByRole('button', { name: text.roles.add })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Quitar/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: text.actions.edit })).toBeInTheDocument();
  });

  it('lets someone with users:update but without roles:read take roles away, but not add them (V24)', async () => {
    const mock = start();
    mock.revoke('Administrator', 'roles:read');
    open('/users/2');
    const section = await rolesSection();
    await within(section).findByText('Marketing');

    expect(
      within(section).getByRole('button', { name: text.roles.remove('Marketing') }),
    ).toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: text.roles.add })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: text.actions.edit })).toBeInTheDocument();
  });

  it('offers no action on the roles to someone who can only read', async () => {
    const mock = start();
    mock.revoke('Administrator', 'users:update');
    open('/users/2');
    const section = await rolesSection();
    await within(section).findByText('Marketing');

    expect(within(section).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: text.actions.edit })).not.toBeInTheDocument();
  });
});
