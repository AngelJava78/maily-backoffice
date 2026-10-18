import { configure, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import {
  ADMIN_SUB,
  createUsersDirectoryMock,
  defaultDirectory,
  directoryUser,
  makeUsers,
} from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';

// The screens are lazy, and the first visit transforms the Data Grid, which takes a while when many
// files run at once: load them here so that no test pays for it while it waits for a screen.
beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([
    import('@/features/users/components/UsersListPage'),
    import('@/features/users/components/UserDetailPage'),
  ]);
}, 90_000);

/** The operator, 30 active users, one blocked and one deleted: 31 are listed. */
function start() {
  const base = defaultDirectory();
  return createUsersDirectoryMock({
    ...base,
    users: [
      ...base.users,
      ...makeUsers(30),
      directoryUser({ id: 200, email: 'beto@clinica.com', firstName: 'Beto', statusId: 2 }),
      directoryUser({ id: 201, email: 'carla@clinica.com', firstName: 'Carla', statusId: 3 }),
    ],
  });
}

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

const grid = () => screen.getByRole('grid', { name: messages.users.list.gridLabel });

describe('the users section: consulting (feature 002, user story 1)', { timeout: 30_000 }, () => {
  it('lists the section in the navigation and opens the first page from it (V1)', async () => {
    start();
    const { user } = open('/');

    const navigation = await screen.findByRole('navigation', { name: messages.nav.label });
    await user.click(within(navigation).getByRole('link', { name: messages.nav.sections.users }));

    expect(await screen.findByText('1–10 de 31')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: messages.users.title }),
    ).toBeInTheDocument();
    expect(document.title).toBe(`${messages.titles.users} — ${messages.common.appName}`);
  });

  it('goes back to the same page after seeing a detail (US1-4, V3)', async () => {
    start();
    const { user, router } = open('/users');
    await screen.findByText('1–10 de 31');

    await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }));
    expect(await screen.findByText('21–30 de 31')).toBeInTheDocument();
    await user.click(within(grid()).getAllByRole('link')[0] ?? grid());

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.users.detail.title }),
    ).toBeInTheDocument();
    await user.click(await screen.findByRole('link', { name: messages.users.detail.backToList }));

    expect(await screen.findByText('21–30 de 31')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/users');
    expect(router.state.location.search).toBe('?page=3');
  });

  it('shows 25 users per page when asked, from the first page (US1-2, V2)', async () => {
    start();
    const { user, router } = open('/users?page=2');
    await screen.findByText('11–20 de 31');

    await user.click(screen.getByLabelText(/filas por página/i));
    await user.click(screen.getByRole('option', { name: '25' }));

    expect(await screen.findByText('1–25 de 31')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?page_size=25');
  });

  it('shows the status of a blocked user in its detail, and that its roles are not shown (V3)', async () => {
    start();
    open('/users/200');

    expect(await screen.findByText(messages.users.status.blocked)).toBeInTheDocument();
    expect(await screen.findByText(messages.users.roles.unavailable)).toBeInTheDocument();
  });

  it('finds the blocked and the deleted users by email, and they are not in the list (V7)', async () => {
    start();
    const { user } = open('/users?email=beto%40clinica.com');

    expect(await screen.findByText(messages.users.status.blocked)).toBeInTheDocument();
    const field = screen.getByLabelText(messages.users.search.label);
    await user.clear(field);
    await user.type(field, 'carla@clinica.com');
    await user.click(screen.getByRole('button', { name: messages.users.search.submit }));
    expect(await screen.findByText(messages.users.status.deleted)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: messages.users.search.clear }));
    expect(await screen.findByText('1–10 de 31')).toBeInTheDocument();
    expect(screen.queryByText(/Beto|Carla/)).not.toBeInTheDocument();
  });

  it('gives the same result after reloading a search (US1-14)', async () => {
    start();
    open('/users?email=beto%40clinica.com');

    expect(await screen.findByText(messages.users.status.blocked)).toBeInTheDocument();
    expect(screen.getByLabelText(messages.users.search.label)).toHaveValue('beto@clinica.com');
  });

  it('says that the address does not exist for an id that is not a number, and that the user does not for one that is missing (V5)', async () => {
    start();
    const { unmount } = open('/users/abc');
    expect(
      await screen.findByRole('heading', { level: 1, name: messages.notFound.title }),
    ).toBeInTheDocument();
    unmount();

    open('/users/999999');
    expect(await screen.findByText(messages.users.detail.notFound.title)).toBeInTheDocument();
  });

  it('hides the section from an operator who cannot read the users, and sends them home with a notice (US1-8, V6)', async () => {
    const mock = start();
    mock.revoke('Administrator', 'users:read');
    const { router } = open('/users');

    expect(await screen.findByText(messages.home.permissionsChanged)).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
    const navigation = screen.getByRole('navigation', { name: messages.nav.label });
    expect(
      within(navigation).queryByRole('link', { name: messages.nav.sections.users }),
    ).not.toBeInTheDocument();
  });

  it('shows an error when the service fails, and retrying recovers the list (V4)', async () => {
    const mock = start();
    // A 400 is not retried on its own, so the error shows at once.
    mock.failNext({ method: 'GET', path: '/api/v1/users', status: 400, code: 'bad_request' });
    const { user } = open('/users');

    expect(await screen.findByText(messages.users.list.loadError.title)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    expect(await screen.findByText('1–10 de 31')).toBeInTheDocument();
  });
});
