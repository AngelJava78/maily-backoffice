import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import {
  ADMIN_AUTH0,
  createUsersDirectoryMock,
  defaultDirectory,
  directoryUser,
} from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';

import { UserRolesPanel } from './UserRolesPanel';
import { uuidOf } from '@/test/ids';

function start(statusId = 1, withRoles = true) {
  const base = defaultDirectory();
  const mock = createUsersDirectoryMock({
    ...base,
    users: [...base.users, directoryUser({ id: uuidOf(121), statusId })],
  });
  if (withRoles) {
    mock.assign(uuidOf(121), 4);
    mock.assign(uuidOf(121), 6);
  }
  return mock;
}

function renderPanel(statusId = 1) {
  return renderWithProviders(
    <UserRolesPanel
      userId={uuidOf(121)}
      userName="Ana Pérez Gómez"
      statusId={statusId}
      canAddRoles={false}
      canRemoveRoles={false}
    />,
    { auth0: ADMIN_AUTH0 },
  );
}

describe('UserRolesPanel (the roles, read only)', () => {
  it('shows that it is loading and then the roles of an active user as a list', async () => {
    const mock = start();
    const release = mock.defer();
    renderPanel();

    expect(screen.getByRole('heading', { name: messages.users.roles.title })).toBeInTheDocument();
    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    release();

    const list = await screen.findByRole('list');
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Doctor', 'Marketing']);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('says that the user has no roles', async () => {
    start(1, false);
    renderPanel();

    expect(await screen.findByText(messages.users.roles.none)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows the error with a retry, and retrying shows the roles', async () => {
    const mock = start();
    mock.failNext({ method: 'GET', status: 500, code: 'internal_error' });
    const { user } = renderPanel();

    expect(await screen.findByText(messages.users.roles.loadError.title)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    expect(await screen.findByRole('list')).toBeInTheDocument();
    expect(screen.queryByText(messages.users.roles.loadError.title)).not.toBeInTheDocument();
  });

  it.each([
    [2, 'blocked'],
    [3, 'deleted'],
  ])(
    'does not show the roles of a %s user: it says why and asks nothing (FR-019)',
    async (statusId) => {
      const mock = start(statusId);
      renderPanel(statusId);

      expect(await screen.findByText(messages.users.roles.unavailable)).toBeInTheDocument();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
      expect(mock.requestsTo('GET', /\/roles$/)).toHaveLength(0);
    },
  );

  it('has no accessibility violations with the roles, with none and when unavailable', async () => {
    start();
    const withRoles = renderPanel();
    await screen.findByRole('list');
    expect(await axe(withRoles.container)).toHaveNoViolations();
    withRoles.unmount();

    const unavailable = renderPanel(2);
    await screen.findByText(messages.users.roles.unavailable);
    expect(await axe(unavailable.container)).toHaveNoViolations();
  });
});
