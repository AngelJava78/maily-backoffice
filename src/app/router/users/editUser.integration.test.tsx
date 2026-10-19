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
import { uuidOf } from '@/test/ids';

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([
    import('@/features/users/components/UsersListPage'),
    import('@/features/users/components/UserDetailPage'),
    import('@/features/users/components/UserEditPage'),
  ]);
}, 90_000);

const text = messages.users;
const firstName = () => screen.findByLabelText(new RegExp(`^${text.form.fields.firstName}`));
const save = () => screen.getByRole('button', { name: new RegExp(`^${text.form.save}`) });

type App = ReturnType<typeof renderApp>;

/** Ana Pérez Gómez is the user of these tests; the administrator who operates is user 1. */
function start() {
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
  });
  mock.assign(uuidOf(2), 4);
  return mock;
}

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

async function typeFirstName(user: App['user'], value: string) {
  const input = await firstName();
  await user.clear(input);
  await user.type(input, value);
}

describe('the users section: editing (feature 002, user story 3)', { timeout: 30_000 }, () => {
  it('edits the name from the detail, and the change shows in the detail and in the list (V14)', async () => {
    const mock = start();
    const { user } = open('/users');
    await user.click(await screen.findByRole('link', { name: 'Ana Pérez Gómez' }));
    await user.click(await screen.findByRole('link', { name: text.actions.edit }));

    expect(
      await screen.findByRole('heading', { level: 1, name: text.edit.title }),
    ).toBeInTheDocument();
    expect(await firstName()).toHaveValue('Ana');
    expect(screen.getByText('ana@clinica.com')).toBeInTheDocument();
    expect(screen.getByText(text.edit.emailReadOnlyNote)).toBeInTheDocument();
    await typeFirstName(user, 'Anita');
    await user.click(save());

    expect(await screen.findByText(text.edit.saved)).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 1, name: text.detail.title }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Anita', { selector: 'dd' })).toBeInTheDocument();
    expect(mock.state.findUser(uuidOf(2))?.firstName).toBe('Anita');

    await user.click(screen.getByRole('link', { name: text.detail.backToList }));
    expect(await screen.findByRole('link', { name: 'Anita Pérez Gómez' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ana Pérez Gómez' })).not.toBeInTheDocument();
  });

  it('changes nothing when the edit is cancelled, and goes back to the same detail', async () => {
    const mock = start();
    const { user, router } = open(`/users/${uuidOf(2)}/edit`);
    await typeFirstName(user, 'Otro nombre');

    await user.click(screen.getByRole('link', { name: messages.common.cancel }));

    expect(
      await screen.findByRole('heading', { level: 1, name: text.detail.title }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/users/${uuidOf(2)}`);
    expect(await screen.findByText('Ana', { selector: 'dd' })).toBeInTheDocument();
    expect(mock.requestsTo('PATCH', /./)).toHaveLength(0);
    expect(mock.state.findUser(uuidOf(2))?.firstName).toBe('Ana');
  });

  it('goes back to the page of the list it came from after saving', async () => {
    start();
    const { user, router } = open('/users?page_size=25');
    await user.click(await screen.findByRole('link', { name: 'Ana Pérez Gómez' }));
    await user.click(await screen.findByRole('link', { name: text.actions.edit }));
    await typeFirstName(user, 'Anita');
    await user.click(save());
    await screen.findByText(text.edit.saved);

    await user.click(await screen.findByRole('link', { name: text.detail.backToList }));

    await waitFor(() => {
      expect(router.state.location.search).toBe('?page_size=25');
    });
  });

  it('does not offer to edit to someone without users:update, and sends them to the detail (FR-025)', async () => {
    const mock = start();
    mock.revoke('Administrator', 'users:update');
    const { router } = open(`/users/${uuidOf(2)}/edit`);

    expect(await screen.findByText(messages.forbidden.action)).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/users/${uuidOf(2)}`);
    });
    expect(await screen.findByText('Ana', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: text.actions.edit })).not.toBeInTheDocument();
  });

  it('warns, applies nothing and shows the current status when the user was blocked in another tab (V18)', async () => {
    const mock = start();
    const { user } = open(`/users/${uuidOf(2)}/edit`);
    await typeFirstName(user, 'Anita');
    // The other tab blocks the user while this form is open.
    mock.setUserStatus(uuidOf(2), 2);

    await user.click(save());

    expect(await screen.findByText(text.errors.statusChanged)).toBeInTheDocument();
    expect(await screen.findByText(text.edit.inactive.title)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(mock.state.findUser(uuidOf(2))?.firstName).toBe('Ana');

    await user.click(screen.getByRole('link', { name: text.edit.inactive.backToDetail }));
    expect(await screen.findByText(text.status.blocked)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: text.actions.edit })).not.toBeInTheDocument();
  });

  it('keeps the last of two changes made one after the other (Assumptions of US3)', async () => {
    const mock = start();
    const { user } = open(`/users/${uuidOf(2)}/edit`);
    await typeFirstName(user, 'Uno');
    // Another operator changes the same user after this form was opened.
    await callService(`/api/v1/users/${uuidOf(2)}`, {
      method: 'PATCH',
      body: { first_name: 'Otro' },
    });
    expect(mock.state.findUser(uuidOf(2))?.firstName).toBe('Otro');

    await user.click(save());

    expect(await screen.findByText(text.edit.saved)).toBeInTheDocument();
    expect(await screen.findByText('Uno', { selector: 'dd' })).toBeInTheDocument();
    expect(mock.state.findUser(uuidOf(2))?.firstName).toBe('Uno');
  });

  it('shows the new name of the operator in the header as soon as they change their own, not minutes later', async () => {
    const mock = start();
    const { user } = open(`/users/${uuidOf(1)}/edit`);
    const header = await screen.findByRole('banner');
    expect(await within(header).findByText('Admin Sistema')).toBeInTheDocument();
    await typeFirstName(user, 'Nuevo');

    await user.click(save());

    expect(await screen.findByText(text.edit.saved)).toBeInTheDocument();
    expect(mock.state.findUser(uuidOf(1))?.firstName).toBe('Nuevo');
    expect(await within(header).findByText('Nuevo Sistema')).toBeInTheDocument();
  });

  it('does not ask for the access again when what is changed is the name of somebody else', async () => {
    const mock = start();
    const { user } = open(`/users/${uuidOf(2)}/edit`);
    await typeFirstName(user, 'Anita');
    const asksBefore = mock.requestsTo('GET', '/api/v1/authorization/me').length;

    await user.click(save());

    expect(await screen.findByText(text.edit.saved)).toBeInTheDocument();
    expect(mock.requestsTo('GET', '/api/v1/authorization/me')).toHaveLength(asksBefore);
  });
});
