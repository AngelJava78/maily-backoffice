import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useLocation, useParams } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import {
  ADMIN_AUTH0,
  createUsersDirectoryMock,
  defaultDirectory,
  directoryUser,
} from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';

import { userKeys } from '../hooks/userKeys';
import type { PlatformUser } from '../schemas/user';
import { UserEditPage } from './UserEditPage';

const text = messages.users;
const labels = text.form.fields;
const LIST_SEARCH = '?page=3&page_size=25';

function DetailProbe() {
  const { userId } = useParams();
  const location = useLocation();
  return <p>{`Detalle ${userId ?? ''}: ${JSON.stringify(location.state)}`}</p>;
}

function start(statusId = 1) {
  const base = defaultDirectory();
  return createUsersDirectoryMock({
    ...base,
    users: [
      ...base.users,
      directoryUser({
        id: 121,
        statusId,
        email: 'ana@clinica.com',
        firstName: 'Ana',
        paternalLastName: 'Pérez',
        maternalLastName: 'Gómez',
      }),
    ],
  });
}

function renderEdit({
  userId = 121,
  withSearch = true,
  onSaved,
}: {
  readonly userId?: number;
  readonly withSearch?: boolean;
  readonly onSaved?: (user: PlatformUser) => void;
} = {}) {
  return renderWithProviders(
    [
      {
        path: '/users/:userId/edit',
        element: <UserEditPage userId={userId} onSaved={onSaved} />,
      },
      { path: '/users/:userId', element: <DetailProbe /> },
      { path: '/users', element: <p>Listado</p> },
    ],
    {
      auth0: ADMIN_AUTH0,
      initialEntries: [
        {
          pathname: `/users/${userId}/edit`,
          state: withSearch ? { listSearch: LIST_SEARCH } : undefined,
        },
      ],
    },
  );
}

type Rendered = ReturnType<typeof renderEdit>;

const field = (label: string) => screen.findByLabelText(new RegExp(`^${label}`));
const save = () => screen.getByRole('button', { name: new RegExp(`^${text.form.save}`) });

async function replaceText(user: Rendered['user'], label: string, value: string) {
  const input = await field(label);
  await user.clear(input);
  if (value !== '') {
    await user.type(input, value);
  }
}

describe('UserEditPage: the form', () => {
  it('has its title from the first render, while the user loads', async () => {
    const mock = start();
    const release = mock.defer();
    renderEdit();

    expect(screen.getByRole('heading', { level: 1, name: text.edit.title })).toBeInTheDocument();
    release();
    expect(await field(labels.firstName)).toBeInTheDocument();
  });

  it('shows the current values, and the email as data that cannot be changed', async () => {
    start();
    renderEdit();

    expect(await field(labels.firstName)).toHaveValue('Ana');
    expect(await field(labels.paternalLastName)).toHaveValue('Pérez');
    expect(await field(labels.maternalLastName)).toHaveValue('Gómez');
    expect(screen.getByText('ana@clinica.com')).toBeInTheDocument();
    expect(screen.getByText(text.edit.emailReadOnlyNote)).toBeInTheDocument();
    // It is not a field of the form: nothing can be typed in it.
    expect(screen.queryByLabelText(new RegExp(`^${labels.email}`))).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /correo/i })).not.toBeInTheDocument();
  });

  it('saves the three fields, never the email, and goes back to the detail of the list it came from', async () => {
    const mock = start();
    const { user } = renderEdit();
    await replaceText(user, labels.firstName, '  Anita ');

    await user.click(save());

    expect(await screen.findByText(text.edit.saved)).toBeInTheDocument();
    expect(await screen.findByText(`Detalle 121: {"listSearch":"${LIST_SEARCH}"}`)).toBeVisible();
    expect(mock.requestsTo('PATCH', '/api/v1/users/121')).toHaveLength(1);
    expect(mock.requestsTo('PATCH', '/api/v1/users/121')[0]?.body).toEqual({
      first_name: 'Anita',
      paternal_last_name: 'Pérez',
      maternal_last_name: 'Gómez',
    });
    expect(mock.state.findUser(121)?.firstName).toBe('Anita');
  });

  it('removes the maternal last name when it is emptied', async () => {
    const mock = start();
    const { user } = renderEdit();
    await replaceText(user, labels.maternalLastName, '');

    await user.click(save());

    await screen.findByText(text.edit.saved);
    expect(mock.requestsTo('PATCH', '/api/v1/users/121')[0]?.body).toMatchObject({
      maternal_last_name: null,
    });
    expect(mock.state.findUser(121)?.maternalLastName).toBeNull();
  });

  it('does not save, tells which values are missing and puts the focus on the first one', async () => {
    const mock = start();
    const { user } = renderEdit();
    await replaceText(user, labels.firstName, '');
    await replaceText(user, labels.paternalLastName, '');

    await user.click(save());

    expect(await screen.findByText(text.validation.firstNameRequired)).toBeInTheDocument();
    expect(screen.getByText(text.validation.paternalLastNameRequired)).toBeInTheDocument();
    expect(await field(labels.firstName)).toHaveFocus();
    expect(mock.requestsTo('PATCH', /./)).toHaveLength(0);
  });

  it('does not save names that are too long', async () => {
    const mock = start();
    const { user } = renderEdit();
    const lastName = await field(labels.paternalLastName);
    await user.clear(lastName);
    await user.click(lastName);
    await user.paste('P'.repeat(101));

    await user.click(save());

    expect(await screen.findByText(text.validation.paternalLastNameTooLong)).toBeInTheDocument();
    expect(mock.requestsTo('PATCH', /./)).toHaveLength(0);
  });

  it('does not save when it is cancelled, and goes back to the detail it came from', async () => {
    const mock = start();
    const { user } = renderEdit();
    await replaceText(user, labels.firstName, 'Otro nombre');

    await user.click(screen.getByRole('link', { name: messages.common.cancel }));

    expect(await screen.findByText(/^Detalle 121:/)).toBeInTheDocument();
    expect(screen.getByText(/listSearch/)).toBeInTheDocument();
    expect(mock.requestsTo('PATCH', /./)).toHaveLength(0);
    expect(mock.state.findUser(121)?.firstName).toBe('Ana');
  });

  it('sends one request however many times it is saved while it works', async () => {
    const mock = start();
    const { user } = renderEdit();
    await replaceText(user, labels.firstName, 'Anita');
    const release = mock.defer();

    await user.click(save());
    fireEvent.click(save());
    fireEvent.click(save());

    await waitFor(() => {
      expect(save()).toBeDisabled();
    });
    release();
    await screen.findByText(text.edit.saved);
    expect(mock.requestsTo('PATCH', /./)).toHaveLength(1);
  });

  it('tells that it could not be saved when the service fails, and keeps what was typed', async () => {
    const mock = start();
    const { user } = renderEdit();
    await replaceText(user, labels.firstName, 'Anita');
    mock.failNext({ method: 'PATCH', status: 503, code: 'service_unavailable' });

    await user.click(save());

    expect(await screen.findByText(text.errors.retryable)).toBeInTheDocument();
    expect(await field(labels.firstName)).toHaveValue('Anita');
    expect(save()).toBeEnabled();
    expect(mock.state.findUser(121)?.firstName).toBe('Ana');
  });

  it('does not repeat the notice of a lack of permission, which the application already shows', async () => {
    const mock = start();
    const { user } = renderEdit();
    await replaceText(user, labels.firstName, 'Anita');
    mock.revoke('Administrator', 'users:update');

    await user.click(save());

    await waitFor(() => {
      expect(save()).toBeEnabled();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(await field(labels.firstName)).toHaveValue('Anita');
  });
});

describe('UserEditPage: a user that cannot be edited', () => {
  it.each([
    [2, 'blocked'],
    [3, 'deleted'],
  ])(
    'shows no form for a %s user, and a way back to the detail and to the list',
    async (statusId) => {
      start(statusId);
      renderEdit();

      expect(await screen.findByText(text.edit.inactive.title)).toBeInTheDocument();
      expect(screen.getByText(text.edit.inactive.message)).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: text.edit.inactive.backToDetail })).toHaveAttribute(
        'href',
        '/users/121',
      );
      expect(screen.getByRole('link', { name: text.edit.inactive.backToList })).toHaveAttribute(
        'href',
        `/users${LIST_SEARCH}`,
      );
    },
  );

  it('tells that the user has another status, when it was blocked before saving (US3-9)', async () => {
    const mock = start();
    const { user } = renderEdit();
    await replaceText(user, labels.firstName, 'Anita');
    // Another operator blocks the user while this form is open.
    mock.setUserStatus(121, 2);

    await user.click(save());

    expect(await screen.findByText(text.errors.statusChanged)).toBeInTheDocument();
    // The user is asked for again, and the form gives way to the explanation.
    expect(await screen.findByText(text.edit.inactive.title)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(mock.requestsTo('GET', '/api/v1/users/121')).toHaveLength(2);
    expect(mock.state.findUser(121)?.firstName).toBe('Ana');
  });
});

describe('UserEditPage: a user that cannot be loaded', () => {
  it('says that the user was not found, with a way back to the list', async () => {
    start();
    renderEdit({ userId: 999 });

    expect(await screen.findByText(text.detail.notFound.title)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: text.detail.notFound.backToList })).toHaveAttribute(
      'href',
      '/users',
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('tells that the user is gone when it disappears before saving', async () => {
    const mock = start();
    const { user } = renderEdit();
    await replaceText(user, labels.firstName, 'Anita');
    mock.failNext({ method: 'PATCH', status: 404, code: 'user_not_found' });
    mock.failNext({
      method: 'GET',
      path: '/api/v1/users/121',
      status: 404,
      code: 'user_not_found',
    });

    await user.click(save());

    expect(await screen.findByText(text.errors.notFound)).toBeInTheDocument();
    expect(await screen.findByText(text.detail.notFound.title)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows the error with a retry, and retrying shows the form', async () => {
    const mock = start();
    mock.failNext({
      method: 'GET',
      path: '/api/v1/users/121',
      status: 500,
      code: 'internal_error',
    });
    const { user } = renderEdit();

    expect(await screen.findByText(text.detail.loadError.title)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    expect(await field(labels.firstName)).toHaveValue('Ana');
    expect(screen.queryByText(text.detail.loadError.title)).not.toBeInTheDocument();
  });
});

describe('UserEditPage: while it saves, and when asking for the user fails', () => {
  it('keeps the form, and what was typed, when asking for the user again fails', async () => {
    const mock = start();
    const { user, queryClient } = renderEdit();
    await replaceText(user, labels.firstName, 'Anita');

    mock.failNext({ method: 'GET', path: '/api/v1/users/121', status: 400, code: 'bad_request' });
    await queryClient.invalidateQueries({ queryKey: userKeys.detail(121), exact: true });
    await waitFor(() => {
      expect(queryClient.getQueryState(userKeys.detail(121))?.status).toBe('error');
    });

    expect(await field(labels.firstName)).toHaveValue('Anita');
    expect(screen.queryByText(text.detail.loadError.title)).not.toBeInTheDocument();
  });

  it('does not let the person leave with "Cancelar" while it saves: the save would take them back', async () => {
    const mock = start();
    const { user } = renderEdit();
    await replaceText(user, labels.firstName, 'Anita');
    const release = mock.defer();

    await user.click(save());

    await waitFor(() => {
      expect(screen.getByRole('link', { name: messages.common.cancel })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });
    release();
    await screen.findByText(text.edit.saved);
  });

  it('tells that it was saved, but does not take the person to the detail if they left meanwhile', async () => {
    const mock = start();
    const { user, router } = renderEdit();
    await replaceText(user, labels.firstName, 'Anita');
    const release = mock.defer();
    await user.click(save());

    // The person goes to the list while the service is still working.
    await router.navigate('/users');
    expect(await screen.findByText('Listado')).toBeInTheDocument();
    release();

    expect(await screen.findByText(text.edit.saved)).toBeInTheDocument();
    await waitFor(() => {
      expect(mock.state.findUser(121)?.firstName).toBe('Anita');
    });
    expect(router.state.location.pathname).toBe('/users');
  });

  it('gives the user that was saved to who asked, while the form is on screen', async () => {
    start();
    const onSaved = vi.fn<(user: PlatformUser) => void>();
    const { user } = renderEdit({ onSaved });
    await replaceText(user, labels.firstName, 'Anita');

    await user.click(save());

    await screen.findByText(text.edit.saved);
    expect(onSaved).toHaveBeenCalledOnce();
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 121, firstName: 'Anita' }));
  });

  it('takes the focus to the error that is not of a field, which is far from "Guardar" in a narrow screen', async () => {
    const mock = start();
    const { user } = renderEdit();
    await replaceText(user, labels.firstName, 'Anita');
    mock.failNext({ method: 'PATCH', status: 503, code: 'service_unavailable' });

    await user.click(save());

    const alert = (await screen.findByText(text.errors.retryable)).closest('[role="alert"]');
    expect(alert).toHaveFocus();
  });
});

describe('UserEditPage: accessibility', () => {
  it('has no violations: the form, with errors, a user that cannot be edited and a failure', async () => {
    const mock = start();
    const form = renderEdit();
    await field(labels.firstName);
    expect(await axe(form.container)).toHaveNoViolations();

    await replaceText(form.user, labels.firstName, '');
    await form.user.click(save());
    await screen.findByText(text.validation.firstNameRequired);
    expect(await axe(form.container)).toHaveNoViolations();
    form.unmount();

    mock.setUserStatus(121, 2);
    const inactive = renderEdit();
    await screen.findByText(text.edit.inactive.title);
    expect(await axe(inactive.container)).toHaveNoViolations();
    inactive.unmount();

    mock.failNext({
      method: 'GET',
      path: '/api/v1/users/121',
      status: 500,
      code: 'internal_error',
    });
    const failing = renderEdit();
    await screen.findByText(text.detail.loadError.title);
    expect(await axe(failing.container)).toHaveNoViolations();
  });
});
