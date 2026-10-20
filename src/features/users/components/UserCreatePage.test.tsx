import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useLocation, useParams } from 'react-router';
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

import { roleKeys } from '../hooks/userKeys';
import { UserCreatePage } from './UserCreatePage';
import { uuidOf } from '@/test/ids';

function DetailProbe() {
  const { userId } = useParams();
  const location = useLocation();
  return <p>{`Detalle ${userId ?? ''}: ${JSON.stringify(location.state)}`}</p>;
}

function start() {
  return createUsersDirectoryMock();
}

function renderCreate(state?: unknown) {
  return renderWithProviders(
    [
      { path: '/users/new', element: <UserCreatePage /> },
      { path: '/users/:userId', element: <DetailProbe /> },
      { path: '/users', element: <p>Listado</p> },
    ],
    {
      auth0: ADMIN_AUTH0,
      initialEntries: [state === undefined ? '/users/new' : { pathname: '/users/new', state }],
    },
  );
}

/** What the person types in the email: the spaces are cut when the form is sent, not in the field. */
const TYPED_EMAIL = ' nora@clinica.com ';
const labels = messages.users.form.fields;
const email = () => screen.getByLabelText(new RegExp(`^${labels.email}`));
const password = () => screen.getByLabelText(new RegExp(`^${labels.password}`));
const firstName = () => screen.getByLabelText(new RegExp(`^${labels.firstName}`));
const paternal = () => screen.getByLabelText(new RegExp(`^${labels.paternalLastName}`));
const save = () => screen.getByRole('button', { name: new RegExp(`^${messages.common.save}`) });
const rolesBox = () => screen.getByRole('combobox', { name: /roles/i });

/** Waits for the catalog: the roles field is enabled once the roles have arrived. */
async function catalogReady() {
  await waitFor(() => {
    expect(rolesBox()).toBeEnabled();
  });
}

async function chooseRoles(user: ReturnType<typeof renderCreate>['user'], ...names: string[]) {
  await user.click(rolesBox());
  for (const name of names) {
    await user.click(screen.getByRole('option', { name }));
  }
  await user.keyboard('{Escape}');
}

async function fillIn(
  user: ReturnType<typeof renderCreate>['user'],
  overrides: Partial<Record<'email' | 'password' | 'first' | 'paternal', string>> = {},
) {
  await user.type(email(), overrides.email ?? TYPED_EMAIL);
  await user.type(password(), overrides.password ?? 'Segura-123');
  await user.type(firstName(), overrides.first ?? 'Nora');
  await user.type(paternal(), overrides.paternal ?? 'Díaz');
}

describe('UserCreatePage: the form', () => {
  it('has its title, and tells that the email cannot be changed afterwards (US2-12)', async () => {
    start();
    renderCreate();

    expect(
      screen.getByRole('heading', { level: 1, name: messages.users.form.createTitle }),
    ).toBeInTheDocument();
    expect(email()).toHaveAccessibleDescription(messages.users.form.emailNote);
    await catalogReady();
  });

  it('shows the error of every field that is missing and puts the focus on the first (US2-3)', async () => {
    start();
    const { user } = renderCreate();
    await catalogReady();

    await user.click(save());

    expect(await screen.findByText(messages.users.validation.emailRequired)).toBeInTheDocument();
    expect(screen.getByText(messages.users.validation.passwordRequired)).toBeInTheDocument();
    expect(screen.getByText(messages.users.validation.firstNameRequired)).toBeInTheDocument();
    expect(
      screen.getByText(messages.users.validation.paternalLastNameRequired),
    ).toBeInTheDocument();
    expect(screen.getByText(messages.users.validation.rolesRequired)).toBeInTheDocument();
    expect(email()).toHaveFocus();
  });

  it('does not create the user when the email does not have the format of one', async () => {
    const mock = start();
    const { user } = renderCreate();
    await catalogReady();
    await fillIn(user, { email: 'correo-mal' });
    await chooseRoles(user, 'Marketing');

    await user.click(save());

    expect(await screen.findByText(messages.users.validation.emailInvalid)).toBeInTheDocument();
    expect(mock.requestsTo('POST', '/api/v1/users')).toHaveLength(0);
  });

  describe('the catalog of roles', () => {
    it('keeps the roles disabled, with an indicator, and the form unsaveable, while it loads', async () => {
      const mock = start();
      const release = mock.defer();
      renderCreate();

      expect(await screen.findByRole('progressbar')).toBeInTheDocument();
      expect(rolesBox()).toBeDisabled();
      expect(save()).toBeDisabled();
      release();
      await catalogReady();
      expect(save()).toBeEnabled();
    });

    it('shows the error with a retry, and the form cannot be saved until it loads', async () => {
      const mock = start();
      mock.failNext({ method: 'GET', path: '/api/v1/roles', status: 500, code: 'internal_error' });
      const { user } = renderCreate();

      expect(await screen.findByText(messages.users.form.rolesLoadError.title)).toBeInTheDocument();
      expect(save()).toBeDisabled();
      await user.click(screen.getByRole('button', { name: messages.common.retry }));

      await catalogReady();
      expect(save()).toBeEnabled();
    });

    // An empty catalog cannot be produced here: the operator holds the permission through an active
    // role, and that role is in the catalog. The message is checked in the tests of `RolesField`.
  });

  describe('creating the user', () => {
    it('creates it with the data typed and the roles chosen, tells so and opens its detail (US2-1)', async () => {
      const mock = start();
      const { user, router } = renderCreate();
      await catalogReady();

      await fillIn(user);
      await chooseRoles(user, 'Marketing', 'Doctor');
      await user.click(save());

      expect(await screen.findByText(new RegExp(`^Detalle ${uuidOf(2)}:`))).toBeInTheDocument();
      expect(router.state.location.pathname).toBe(`/users/${uuidOf(2)}`);
      expect(await screen.findByText(messages.users.notices.created)).toBeInTheDocument();
      expect(mock.requestsTo('POST', '/api/v1/users')[0]?.body).toEqual({
        email: 'nora@clinica.com',
        password: 'Segura-123',
        first_name: 'Nora',
        paternal_last_name: 'Díaz',
      });
      expect(mock.state.rolesOf(uuidOf(2)).map((role) => role.name)).toEqual([
        'Marketing',
        'Doctor',
      ]);
    });

    it('sends the maternal last name when it is typed', async () => {
      const mock = start();
      const { user } = renderCreate();
      await catalogReady();
      await fillIn(user);
      await user.type(screen.getByLabelText(new RegExp(`^${labels.maternalLastName}`)), 'Vega');
      await chooseRoles(user, 'Marketing');

      await user.click(save());

      await screen.findByText(new RegExp(`^Detalle ${uuidOf(2)}:`));
      expect(mock.requestsTo('POST', '/api/v1/users')[0]?.body).toMatchObject({
        maternal_last_name: 'Vega',
      });
    });

    it('creates one user when "Guardar" is pressed several times in a row (SC-004)', async () => {
      const mock = start();
      const { user } = renderCreate();
      await catalogReady();
      await fillIn(user);
      await chooseRoles(user, 'Marketing');

      fireEvent.click(save());
      fireEvent.click(save());
      fireEvent.click(save());

      await screen.findByText(new RegExp(`^Detalle ${uuidOf(2)}:`));
      expect(mock.requestsTo('POST', '/api/v1/users')).toHaveLength(1);
      expect(mock.requestsTo('POST', `/api/v1/users/${uuidOf(2)}/roles`)).toHaveLength(1);
    });

    it('carries the search of the list it came from, to the detail and in "Cancelar"', async () => {
      start();
      const { user } = renderCreate({ listSearch: '?page=3&page_size=25' });
      await catalogReady();
      expect(screen.getByRole('link', { name: messages.common.cancel })).toHaveAttribute(
        'href',
        '/users?page=3&page_size=25',
      );

      await fillIn(user);
      await chooseRoles(user, 'Marketing');
      await user.click(save());

      expect(
        await screen.findByText(`Detalle ${uuidOf(2)}: {"listSearch":"?page=3&page_size=25"}`),
      ).toBeInTheDocument();
    });
  });

  describe('when the service refuses', () => {
    it('shows a repeated email next to the field, with the way to look for its owner (US2-4)', async () => {
      const base = defaultDirectory();
      createUsersDirectoryMock({
        ...base,
        users: [
          ...base.users,
          directoryUser({ id: uuidOf(2), email: 'nora@clinica.com', statusId: 3 }),
        ],
      });
      const { user } = renderCreate();
      await catalogReady();
      await fillIn(user);
      await chooseRoles(user, 'Marketing');

      await user.click(save());

      expect(
        await screen.findByText(messages.users.errors.emailAlreadyRegistered),
      ).toBeInTheDocument();
      expect(email()).toBeInvalid();
      expect(
        screen.getByText(messages.users.errors.emailAlreadyRegisteredHint),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: messages.users.errors.searchThisEmail }),
      ).toHaveAttribute('href', '/users?email=nora%40clinica.com');
      expect(email()).toHaveValue(TYPED_EMAIL);
    });

    it('shows a password that was refused next to its field and keeps what was typed (US2-5)', async () => {
      const mock = start();
      mock.rejectPassword();
      const { user } = renderCreate();
      await catalogReady();
      await fillIn(user);
      await chooseRoles(user, 'Marketing');

      await user.click(save());

      expect(await screen.findByText(messages.users.errors.passwordRejected)).toBeInTheDocument();
      expect(password()).toBeInvalid();
      expect(email()).toHaveValue(TYPED_EMAIL);
      expect(mock.state.users()).toHaveLength(1);
    });

    it('shows an access account that already exists next to the email (US2-6)', async () => {
      const mock = start();
      mock.identity.accountExists('nora@clinica.com');
      const { user } = renderCreate();
      await catalogReady();
      await fillIn(user);
      await chooseRoles(user, 'Marketing');

      await user.click(save());

      expect(
        await screen.findByText(messages.users.errors.accountAlreadyExists),
      ).toBeInTheDocument();
      expect(email()).toBeInvalid();
    });

    it.each([
      ['does not answer', 'unavailable', messages.users.errors.identityUnavailableCreate],
      ['refuses', 'rejected', messages.users.errors.identityRejectedCreate],
    ] as const)(
      'says that the identity provider %s, keeps what was typed and lets the person try again (US2-8)',
      async (_label, failure, message) => {
        const mock = start();
        mock.identity[failure]();
        const { user } = renderCreate();
        await catalogReady();
        await fillIn(user);
        await chooseRoles(user, 'Marketing');

        await user.click(save());

        expect(await screen.findByText(message)).toBeInTheDocument();
        expect(email()).toHaveValue(TYPED_EMAIL);
        expect(password()).toHaveValue('Segura-123');
        expect(save()).toBeEnabled();
        expect(mock.state.users()).toHaveLength(1);
        mock.identity.recover();
        await user.click(save());
        expect(await screen.findByText(new RegExp(`^Detalle ${uuidOf(2)}:`))).toBeInTheDocument();
      },
    );

    it('shows an error that can be retried when the service does not answer', async () => {
      const mock = start();
      const { user } = renderCreate();
      await catalogReady();
      mock.failNext({
        method: 'POST',
        path: '/api/v1/users',
        status: 503,
        code: 'authentication_unavailable',
      });
      await fillIn(user);
      await chooseRoles(user, 'Marketing');

      await user.click(save());

      expect(await screen.findByText(messages.users.errors.retryable)).toBeInTheDocument();
      expect(email()).toHaveValue(TYPED_EMAIL);
    });

    it('opens the detail with the roles that are missing when one could not be assigned (US2-9)', async () => {
      const mock = start();
      const { user, router } = renderCreate();
      await catalogReady();
      mock.setRoleStatus(6, 2);
      await fillIn(user);
      await chooseRoles(user, 'Marketing', 'Doctor');

      await user.click(save());

      expect(await screen.findByText(messages.users.notices.createdPartial)).toBeInTheDocument();
      expect(router.state.location.pathname).toBe(`/users/${uuidOf(2)}`);
      expect(router.state.location.state).toEqual({
        rolesNotAssigned: [{ id: 6, name: 'Doctor' }],
      });
      expect(mock.state.findUser(uuidOf(2))).toBeDefined();
    });
  });

  it('has no accessibility violations: empty, and with errors', async () => {
    start();
    const { user, container } = renderCreate();
    await catalogReady();
    expect(await axe(container)).toHaveNoViolations();

    await user.click(save());
    await screen.findByText(messages.users.validation.emailRequired);

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('UserCreatePage: the roles that were chosen, while it saves, and when asking fails', () => {
  it('does not create the user when a role that was chosen is gone from the catalog, and keeps the roles that are left', async () => {
    const mock = start();
    const { user, queryClient } = renderCreate();
    await catalogReady();
    await fillIn(user);
    await chooseRoles(user, 'Marketing', 'Doctor');
    // The role was blocked and the catalog was asked for again (it is, every few minutes).
    mock.setRoleStatus(6, 2);
    await queryClient.invalidateQueries({ queryKey: roleKeys.catalog() });
    await waitFor(() => {
      expect(queryClient.getQueryData<unknown[]>(roleKeys.catalog())).toHaveLength(6);
    });

    await user.click(save());

    expect(
      await screen.findByText(messages.users.validation.rolesNoLongerAvailable),
    ).toBeInTheDocument();
    expect(mock.requestsTo('POST', '/api/v1/users')).toHaveLength(0);
    expect(mock.state.users()).toHaveLength(1);

    // What is left is Marketing, and saving again creates the user with it only.
    await user.click(save());
    expect(await screen.findByText(messages.users.notices.created)).toBeInTheDocument();
    expect(mock.state.rolesOf(uuidOf(2)).map((role) => role.name)).toEqual(['Marketing']);
  });

  it('keeps the field of the roles, with the roles that were chosen, when asking for the catalog again fails', async () => {
    const mock = start();
    const { user, queryClient } = renderCreate();
    await catalogReady();
    await chooseRoles(user, 'Marketing');

    mock.failNext({ method: 'GET', path: '/api/v1/roles', status: 400, code: 'bad_request' });
    await queryClient.invalidateQueries({ queryKey: roleKeys.catalog() });
    await waitFor(() => {
      expect(queryClient.getQueryState(roleKeys.catalog())?.status).toBe('error');
    });

    expect(rolesBox()).toBeEnabled();
    expect(screen.getByText('Marketing', { selector: '.MuiChip-label' })).toBeInTheDocument();
    expect(screen.queryByText(messages.users.form.rolesLoadError.title)).not.toBeInTheDocument();
  });

  it('does not let the person leave with "Cancelar" while it saves: the save would take them to the new user', async () => {
    const mock = start();
    const { user } = renderCreate();
    await catalogReady();
    await fillIn(user);
    await chooseRoles(user, 'Marketing');
    const release = mock.defer();

    await user.click(save());

    await waitFor(() => {
      expect(screen.getByRole('link', { name: messages.common.cancel })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });
    release();
    await screen.findByText(messages.users.notices.created);
  });

  it('tells that it was created, but does not take the person to the new user if they left meanwhile', async () => {
    const mock = start();
    const { user, router } = renderCreate();
    await catalogReady();
    await fillIn(user);
    await chooseRoles(user, 'Marketing');
    const release = mock.defer();
    await user.click(save());

    await router.navigate('/users');
    expect(await screen.findByText('Listado')).toBeInTheDocument();
    release();

    expect(await screen.findByText(messages.users.notices.created)).toBeInTheDocument();
    await waitFor(() => {
      expect(mock.state.findUser(uuidOf(2))).toBeDefined();
    });
    expect(router.state.location.pathname).toBe('/users');
  });

  it('takes the focus to the error that is not of a field, which is far from "Guardar" in a narrow screen', async () => {
    const mock = start();
    mock.identity.unavailable();
    const { user } = renderCreate();
    await catalogReady();
    await fillIn(user);
    await chooseRoles(user, 'Marketing');

    await user.click(save());

    const alert = (
      await screen.findByText(messages.users.errors.identityUnavailableCreate)
    ).closest('[role="alert"]');
    expect(alert).toHaveFocus();
  });
});
