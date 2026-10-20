import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { ALL_CAPABILITIES, capabilities } from '@/test/capabilities';
import {
  ADMIN_AUTH0,
  createUsersDirectoryMock,
  defaultDirectory,
  directoryUser,
  makeUsers,
} from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';

import { UsersListPage } from './UsersListPage';
import { uuidOf } from '@/test/ids';

/** The operator and 25 more active users, so the list has 26 and three pages of 10. */
function start() {
  const base = defaultDirectory();
  return createUsersDirectoryMock({
    ...base,
    users: [
      ...base.users,
      ...makeUsers(25),
      directoryUser({ id: uuidOf(200), email: 'beto@clinica.com', firstName: 'Beto', statusId: 2 }),
      directoryUser({
        id: uuidOf(201),
        email: 'carla@clinica.com',
        firstName: 'Carla',
        statusId: 3,
      }),
    ],
  });
}

function renderList(route = '/users', userCapabilities = ALL_CAPABILITIES) {
  return renderWithProviders(
    [
      { path: '/users', element: <UsersListPage capabilities={userCapabilities} /> },
      { path: '/users/new', element: <p>Formulario</p> },
      { path: '/users/:userId', element: <p>Detalle</p> },
    ],
    { auth0: ADMIN_AUTH0, route },
  );
}

const grid = () => screen.getByRole('grid', { name: messages.users.list.gridLabel });
const searchField = () => screen.getByLabelText(messages.users.search.label);

describe('UsersListPage: the list', () => {
  it('shows the title, the search and the first 10 active users with their total (US1-1)', async () => {
    start();
    renderList();

    expect(
      screen.getByRole('heading', { level: 1, name: messages.users.title }),
    ).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
    await screen.findByRole('link', { name: 'Admin Sistema' });
    expect(within(grid()).getAllByRole('link')).toHaveLength(10);
    expect(screen.getByText('1–10 de 26')).toBeInTheDocument();
  });

  it('tells which users are shown whenever the page changes, in a status region that is already there', async () => {
    start();
    const { user } = renderList();
    await screen.findByRole('link', { name: 'Admin Sistema' });
    const region = screen.getByRole('status');
    await waitFor(() => {
      expect(region).toHaveTextContent(messages.users.list.pageStatus(1, 10, 26));
    });

    await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        messages.users.list.pageStatus(11, 20, 26),
      );
    });
    expect(screen.getByRole('status')).toBe(region);
  });

  it('does not list the blocked or the deleted users, nor count them (US1-10)', async () => {
    start();
    renderList();

    await screen.findByRole('link', { name: 'Admin Sistema' });
    expect(screen.queryByText(/Beto/)).not.toBeInTheDocument();
    expect(screen.getByText('1–10 de 26')).toBeInTheDocument();
  });

  it('writes the page in the address, and a new page size takes the list back to the first page (US1-2)', async () => {
    start();
    const { user, router } = renderList();
    await screen.findByRole('link', { name: 'Admin Sistema' });

    await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }));
    expect(await screen.findByText('11–20 de 26')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?page=2');

    await user.click(screen.getByLabelText(/filas por página/i));
    await user.click(screen.getByRole('option', { name: '25' }));

    expect(await screen.findByText('1–25 de 26')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?page_size=25');
  });

  it('opens the page that the address names', async () => {
    start();
    renderList('/users?page=3');

    expect(await screen.findByText('21–26 de 26')).toBeInTheDocument();
    expect(within(grid()).getAllByRole('link')).toHaveLength(6);
  });

  it('replaces a page that does not exist by the last one, without adding to the history', async () => {
    start();
    const { router } = renderList('/users?page=99');

    await waitFor(() => {
      expect(router.state.location.search).toBe('?page=3');
    });
    expect(router.state.historyAction).toBe('REPLACE');
    expect(await screen.findByText('21–26 de 26')).toBeInTheDocument();
  });

  it('normalizes an address with values that are not valid', async () => {
    start();
    const { router } = renderList('/users?page=abc&page_size=7');

    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(await screen.findByText('1–10 de 26')).toBeInTheDocument();
  });

  it('shows the error with a retry when the service fails, and retrying shows the list (US1-6)', async () => {
    const mock = start();
    mock.failNext({ method: 'GET', path: '/api/v1/users', status: 500, code: 'internal_error' });
    const { user } = renderList();

    expect(await screen.findByText(messages.users.list.loadError.title)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    expect(await screen.findByRole('link', { name: 'Admin Sistema' })).toBeInTheDocument();
    expect(screen.queryByText(messages.users.list.loadError.title)).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    start();
    const { container } = renderList();
    await screen.findByRole('link', { name: 'Admin Sistema' });

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('UsersListPage: creating a user (FR-025)', () => {
  it('offers to create a user to someone who can, and the action leads to the form', async () => {
    start();
    const { user, router } = renderList('/users?page=2');
    await screen.findByRole('link', { name: 'Usuario Prueba 10' });

    await user.click(screen.getByRole('link', { name: messages.users.list.createAction }));

    expect(router.state.location.pathname).toBe('/users/new');
    expect(router.state.location.state).toEqual({ listSearch: '?page=2' });
  });

  it('does not offer it to someone who cannot create users', async () => {
    start();
    renderList('/users', capabilities({ canCreate: false }));
    await screen.findByRole('link', { name: 'Admin Sistema' });

    expect(
      screen.queryByRole('link', { name: messages.users.list.createAction }),
    ).not.toBeInTheDocument();
  });
});

describe('UsersListPage: the search by email', () => {
  it('shows a blocked user with its status, and a way to its detail (US1-11)', async () => {
    start();
    renderList('/users?email=beto%40clinica.com');

    expect(await screen.findByText(messages.users.status.blocked)).toBeInTheDocument();
    expect(screen.getByText('Beto Prueba 200')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: new RegExp(messages.users.search.viewDetail) }),
    ).toHaveAttribute('href', `/users/${uuidOf(200)}`);
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('keeps the email that was searched in the field and offers to clear the search', async () => {
    start();
    renderList('/users?email=carla%40clinica.com');

    await screen.findByText(messages.users.status.deleted);
    expect(searchField()).toHaveValue('carla@clinica.com');
    expect(screen.getByRole('button', { name: messages.users.search.clear })).toBeInTheDocument();
  });

  it('says that nobody has that email, which is not an error (US1-12)', async () => {
    start();
    renderList('/users?email=nadie%40clinica.com');

    expect(await screen.findByText(messages.users.search.notFound)).toBeInTheDocument();
    expect(screen.queryByText(messages.users.search.loadError.title)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: messages.common.retry })).not.toBeInTheDocument();
  });

  it('searches from the form, writing the email in the address', async () => {
    start();
    const { user, router } = renderList();
    await screen.findByRole('link', { name: 'Admin Sistema' });

    await user.type(searchField(), ' Beto@Clinica.com ');
    await user.click(screen.getByRole('button', { name: messages.users.search.submit }));

    expect(await screen.findByText(messages.users.status.blocked)).toBeInTheDocument();
    expect(router.state.location.search).toBe('?email=Beto%40Clinica.com');
  });

  it('shows the error next to the field and asks nothing when the email is not valid (US1-13)', async () => {
    const mock = start();
    const { user } = renderList();
    await screen.findByRole('link', { name: 'Admin Sistema' });

    await user.type(searchField(), 'no-es-correo');
    await user.click(screen.getByRole('button', { name: messages.users.search.submit }));

    expect(await screen.findByText(messages.users.validation.emailInvalid)).toBeInTheDocument();
    expect(mock.requestsTo('GET', '/api/v1/users/by-email')).toHaveLength(0);
  });

  it('does not ask for an email written by hand in the address that is not valid, and says so', async () => {
    const mock = start();
    renderList('/users?email=no-es-correo');

    expect(await screen.findByText(messages.users.validation.emailInvalid)).toBeInTheDocument();
    expect(mock.requestsTo('GET', '/api/v1/users/by-email')).toHaveLength(0);
  });

  it('goes back to the list when the search is cleared', async () => {
    start();
    const { user, router } = renderList('/users?email=beto%40clinica.com');
    await screen.findByText(messages.users.status.blocked);

    await user.click(screen.getByRole('button', { name: messages.users.search.clear }));

    expect(await screen.findByRole('link', { name: 'Admin Sistema' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
    expect(searchField()).toHaveValue('');
  });

  it('shows the error of the search with a retry', async () => {
    const mock = start();
    mock.failNext({
      method: 'GET',
      path: '/api/v1/users/by-email',
      status: 500,
      code: 'internal_error',
    });
    const { user } = renderList('/users?email=beto%40clinica.com');

    expect(await screen.findByText(messages.users.search.loadError.title)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    expect(await screen.findByText(messages.users.status.blocked)).toBeInTheDocument();
  });

  it('announces that a user was found, in a status region that was already in the page (FR-018)', async () => {
    start();
    renderList('/users?email=beto%40clinica.com');

    await screen.findByText(messages.users.status.blocked);

    expect(screen.getByRole('status')).toHaveTextContent(messages.users.search.found);
  });

  it('announces nothing in the status region when nobody has that email: the alert says it', async () => {
    start();
    renderList('/users?email=nadie%40clinica.com');

    expect(await screen.findByText(messages.users.search.notFound)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('has no accessibility violations with a result', async () => {
    start();
    const { container } = renderList('/users?email=beto%40clinica.com');
    await screen.findByText(messages.users.status.blocked);

    expect(await axe(container)).toHaveNoViolations();
  });
});
