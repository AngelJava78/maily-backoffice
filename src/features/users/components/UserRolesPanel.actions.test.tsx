import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
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
import { callService } from '@/test/usersClient';

import { userKeys } from '../hooks/userKeys';
import { UserRolesPanel } from './UserRolesPanel';

/**
 * The actions on the roles of the panel (US3): they are driven from here, with the simulator, which
 * also covers `AddRoleDialog` in place, the confirmation, the notices and the refresh of the list.
 */
const USER_NAME = 'Ana Pérez Gómez';
const text = messages.users;

function start(statusId = 1) {
  const base = defaultDirectory();
  const mock = createUsersDirectoryMock({
    ...base,
    users: [
      ...base.users,
      directoryUser({
        id: 121,
        statusId,
        firstName: 'Ana',
        paternalLastName: 'Pérez',
        maternalLastName: 'Gómez',
      }),
    ],
  });
  mock.assign(121, 4);
  mock.assign(121, 6);
  return mock;
}

function renderPanel(props: Partial<ComponentProps<typeof UserRolesPanel>> = {}) {
  return renderWithProviders(
    <UserRolesPanel
      userId={121}
      userName={USER_NAME}
      statusId={1}
      canAddRoles
      canRemoveRoles
      {...props}
    />,
    { auth0: ADMIN_AUTH0 },
  );
}

const removeButton = (roleName: string) =>
  screen.getByRole('button', { name: text.roles.remove(roleName) });
const addRoleButton = () => screen.getByRole('button', { name: text.roles.add });
const roleNames = () =>
  within(screen.getByRole('list'))
    .getAllByRole('listitem')
    .map((item) => item.firstElementChild?.textContent);

type Rendered = ReturnType<typeof renderPanel>;

async function askToRemove(user: Rendered['user'], roleName: string) {
  await screen.findByRole('list');
  await user.click(removeButton(roleName));
  return screen.findByRole('dialog', { name: text.removeRole.title });
}

async function confirmRemoval(user: Rendered['user'], dialog: HTMLElement) {
  await user.click(within(dialog).getByRole('button', { name: text.removeRole.confirm }));
}

/** Opens the dialog to add a role and chooses one; the catalog is loaded when this returns. */
async function chooseToAdd(user: Rendered['user'], roleName: string) {
  await screen.findByRole('list');
  await user.click(addRoleButton());
  const dialog = await screen.findByRole('dialog', { name: text.addRole.title });
  await user.click(await within(dialog).findByRole('combobox', { name: /^Role/ }));
  await user.click(screen.getByRole('option', { name: roleName }));
  return dialog;
}

async function confirmAddition(user: Rendered['user'], dialog: HTMLElement) {
  await user.click(within(dialog).getByRole('button', { name: text.addRole.confirm }));
}

const noDialog = () =>
  waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

describe('UserRolesPanel: which actions it offers', () => {
  it('offers "Agregar role" and a "Quitar" for each role to who can add and remove', async () => {
    start();
    renderPanel();

    await screen.findByRole('list');

    expect(addRoleButton()).toBeInTheDocument();
    expect(removeButton('Marketing')).toBeInTheDocument();
    expect(removeButton('Doctor')).toBeInTheDocument();
  });

  it.each([
    [{ canAddRoles: true, canRemoveRoles: false }, true, false],
    [{ canAddRoles: false, canRemoveRoles: true }, false, true],
    [{ canAddRoles: false, canRemoveRoles: false }, false, false],
  ])('offers only what the operator can do: %j', async (capabilities, add, remove) => {
    start();
    renderPanel(capabilities);

    await screen.findByRole('list');

    expect(screen.queryByRole('button', { name: text.roles.add }) !== null).toBe(add);
    expect(screen.queryAllByRole('button', { name: /^Quitar el role/ }).length > 0).toBe(remove);
  });

  it('does not offer to add a role while the roles are not there, because it would not know which', async () => {
    const mock = start();
    mock.failNext({ method: 'GET', status: 500, code: 'internal_error' });
    renderPanel();

    expect(await screen.findByText(text.roles.loadError.title)).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: text.roles.add })).not.toBeInTheDocument();
  });

  it('offers nothing for a user that is not active, and does not ask for its roles', async () => {
    const mock = start(2);
    renderPanel({ statusId: 2 });

    expect(await screen.findByText(text.roles.unavailable)).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: text.roles.add })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Quitar/ })).not.toBeInTheDocument();
    expect(mock.requestsTo('GET', /\/roles$/)).toHaveLength(0);
  });
});

describe('UserRolesPanel: taking a role away', () => {
  it('asks first, naming the user and the role, and does nothing until it is confirmed', async () => {
    const mock = start();
    const { user } = renderPanel();

    const dialog = await askToRemove(user, 'Marketing');

    expect(dialog).toHaveAccessibleDescription(text.removeRole.body('Marketing', USER_NAME));
    expect(mock.requestsTo('DELETE', /\/roles\//)).toHaveLength(0);

    await user.click(within(dialog).getByRole('button', { name: messages.common.cancel }));
    await noDialog();

    expect(mock.requestsTo('DELETE', /\/roles\//)).toHaveLength(0);
    expect(roleNames()).toEqual(['Doctor', 'Marketing']);
  });

  it('takes it away once confirmed, says so and shows the roles that are left', async () => {
    const mock = start();
    const { user } = renderPanel();
    const dialog = await askToRemove(user, 'Marketing');

    await confirmRemoval(user, dialog);

    expect(await screen.findByText(text.removeRole.removed)).toBeInTheDocument();
    await waitFor(() => {
      expect(roleNames()).toEqual(['Doctor']);
    });
    expect(mock.requestsTo('DELETE', '/api/v1/users/121/roles/4')).toHaveLength(1);
    expect(mock.state.rolesOf(121).map((role) => role.name)).toEqual(['Doctor']);
    await noDialog();
  });

  it('puts the focus on the heading of the roles, because the button that opened the dialog is gone', async () => {
    start();
    const { user } = renderPanel();
    const dialog = await askToRemove(user, 'Marketing');

    await confirmRemoval(user, dialog);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: text.roles.title })).toHaveFocus();
    });
  });

  it('keeps the dialog busy while it works and sends one request, however much it is clicked', async () => {
    const mock = start();
    const { user } = renderPanel();
    const dialog = await askToRemove(user, 'Marketing');
    const release = mock.defer();
    const confirm = within(dialog).getByRole('button', { name: text.removeRole.confirm });

    await user.click(confirm);
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(within(dialog).getByRole('button', { name: messages.common.cancel })).toBeDisabled();
    });
    release();
    await screen.findByText(text.removeRole.removed);
    expect(mock.requestsTo('DELETE', /\/roles\//)).toHaveLength(1);
  });

  it('tells that it was already done, and shows the roles that the user has', async () => {
    start();
    const { user } = renderPanel();
    const dialog = await askToRemove(user, 'Marketing');
    // Another operator took it away while this dialog was open.
    await callService('/api/v1/users/121/roles/4', { method: 'DELETE' });

    await confirmRemoval(user, dialog);

    expect(await screen.findByText(text.errors.alreadyDone)).toBeInTheDocument();
    await waitFor(() => {
      expect(roleNames()).toEqual(['Doctor']);
    });
    await noDialog();
  });

  it('tells that the user has another status, asks for the user again and does not ask for its roles', async () => {
    const mock = start();
    const { user, queryClient } = renderPanel();
    queryClient.setQueryData(userKeys.detail(121), 'the user as it was believed to be');
    const dialog = await askToRemove(user, 'Marketing');
    mock.setUserStatus(121, 2);

    await confirmRemoval(user, dialog);

    expect(await screen.findByText(text.errors.statusChanged)).toBeInTheDocument();
    await noDialog();
    expect(queryClient.getQueryState(userKeys.detail(121))?.isInvalidated).toBe(true);
    expect(mock.requestsTo('GET', /\/roles$/)).toHaveLength(1);
  });

  it('tells that the user does not exist any more', async () => {
    const mock = start();
    const { user, queryClient } = renderPanel();
    queryClient.setQueryData(userKeys.detail(121), 'the user as it was believed to be');
    const dialog = await askToRemove(user, 'Marketing');
    mock.failNext({ method: 'DELETE', status: 404, code: 'user_not_found' });

    await confirmRemoval(user, dialog);

    expect(await screen.findByText(text.errors.notFound)).toBeInTheDocument();
    await noDialog();
    expect(queryClient.getQueryState(userKeys.detail(121))?.isInvalidated).toBe(true);
  });

  it('tells that it could not be done when the service fails, and keeps the roles as they were', async () => {
    const mock = start();
    const { user } = renderPanel();
    const dialog = await askToRemove(user, 'Marketing');
    mock.failNext({ method: 'DELETE', status: 503, code: 'service_unavailable' });

    await confirmRemoval(user, dialog);

    expect(await screen.findByText(text.errors.retryable)).toBeInTheDocument();
    await noDialog();
    expect(roleNames()).toEqual(['Doctor', 'Marketing']);
    expect(mock.state.rolesOf(121)).toHaveLength(2);
  });

  it('does not repeat the notice of a lack of permission, which the application already shows', async () => {
    const mock = start();
    const { user } = renderPanel();
    const dialog = await askToRemove(user, 'Marketing');
    mock.revoke('Administrator', 'users:update');

    await confirmRemoval(user, dialog);

    await noDialog();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mock.state.rolesOf(121)).toHaveLength(2);
  });
});

describe('UserRolesPanel: adding a role', () => {
  it('asks which one in a dialog, adds it once confirmed, says so and shows it', async () => {
    const mock = start();
    const { user } = renderPanel();

    const dialog = await chooseToAdd(user, 'Billing');
    expect(dialog).toHaveTextContent(text.addRole.summary('Billing', USER_NAME));
    expect(mock.requestsTo('POST', /\/roles$/)).toHaveLength(0);
    await confirmAddition(user, dialog);

    expect(await screen.findByText(text.addRole.added)).toBeInTheDocument();
    await waitFor(() => {
      expect(roleNames()).toEqual(['Billing', 'Doctor', 'Marketing']);
    });
    expect(mock.requestsTo('POST', '/api/v1/users/121/roles')).toHaveLength(1);
    expect(mock.requestsTo('POST', '/api/v1/users/121/roles')[0]?.body).toEqual({ role_id: 5 });
    await noDialog();
  });

  it('gives the focus back to the button that opened the dialog', async () => {
    start();
    const { user } = renderPanel();
    await screen.findByRole('list');
    const opener = addRoleButton();
    await user.click(opener);
    const dialog = await screen.findByRole('dialog', { name: text.addRole.title });

    await user.click(within(dialog).getByRole('button', { name: messages.common.cancel }));

    await waitFor(() => {
      expect(opener).toHaveFocus();
    });
  });

  it('does not add anything when the dialog is cancelled', async () => {
    const mock = start();
    const { user } = renderPanel();
    const dialog = await chooseToAdd(user, 'Billing');

    await user.click(within(dialog).getByRole('button', { name: messages.common.cancel }));
    await noDialog();

    expect(mock.requestsTo('POST', /\/roles$/)).toHaveLength(0);
    expect(roleNames()).toEqual(['Doctor', 'Marketing']);
  });

  it('tells that it was already done, and shows the roles that the user has', async () => {
    start();
    const { user } = renderPanel();
    const dialog = await chooseToAdd(user, 'Billing');
    // Another operator gave it while this dialog was open.
    await callService('/api/v1/users/121/roles', { method: 'POST', body: { role_id: 5 } });

    await confirmAddition(user, dialog);

    expect(await screen.findByText(text.errors.alreadyDone)).toBeInTheDocument();
    await waitFor(() => {
      expect(roleNames()).toEqual(['Billing', 'Doctor', 'Marketing']);
    });
    await noDialog();
  });

  it('tells that the role is not available any more, and does not offer it again', async () => {
    const mock = start();
    const { user } = renderPanel();
    const dialog = await chooseToAdd(user, 'Billing');
    mock.setRoleStatus(5, 2);

    await confirmAddition(user, dialog);

    expect(await screen.findByText(text.errors.roleUnavailable)).toBeInTheDocument();
    await noDialog();
    expect(roleNames()).toEqual(['Doctor', 'Marketing']);
    // The catalog was asked for again, so the dialog no longer offers that role.
    expect(mock.requestsTo('GET', '/api/v1/roles')).toHaveLength(2);
    await user.click(addRoleButton());
    const again = await screen.findByRole('dialog', { name: text.addRole.title });
    await user.click(await within(again).findByRole('combobox', { name: /^Role/ }));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).not.toContain(
      'Billing',
    );
  });

  it('tells that the user has another status', async () => {
    const mock = start();
    const { user, queryClient } = renderPanel();
    queryClient.setQueryData(userKeys.detail(121), 'the user as it was believed to be');
    const dialog = await chooseToAdd(user, 'Billing');
    mock.setUserStatus(121, 3);

    await confirmAddition(user, dialog);

    expect(await screen.findByText(text.errors.statusChanged)).toBeInTheDocument();
    await noDialog();
    expect(queryClient.getQueryState(userKeys.detail(121))?.isInvalidated).toBe(true);
  });

  it('tells that it could not be done when the service fails', async () => {
    const mock = start();
    const { user } = renderPanel();
    const dialog = await chooseToAdd(user, 'Billing');
    mock.failNext({ method: 'POST', status: 500, code: 'internal_error' });

    await confirmAddition(user, dialog);

    expect(await screen.findByText(text.errors.retryable)).toBeInTheDocument();
    await noDialog();
    expect(mock.state.rolesOf(121)).toHaveLength(2);
  });
});

describe('UserRolesPanel: accessibility of the actions', () => {
  it('has no violations with the actions, with the confirmation open and with the dialog to add', async () => {
    start();
    const { user, container, baseElement } = renderPanel();
    await screen.findByRole('list');
    expect(await axe(container)).toHaveNoViolations();

    await user.click(removeButton('Marketing'));
    await screen.findByRole('dialog', { name: text.removeRole.title });
    expect(await axe(baseElement)).toHaveNoViolations();
    await user.keyboard('{Escape}');
    await noDialog();

    await user.click(addRoleButton());
    const dialog = await screen.findByRole('dialog', { name: text.addRole.title });
    await within(dialog).findByRole('combobox', { name: /^Role/ });
    expect(await axe(baseElement)).toHaveNoViolations();
  });
});

describe('UserRolesPanel: how the result is told, and where the focus goes', () => {
  it('tells how it went only once the dialog has closed, because the page is hidden from a screen reader until then', async () => {
    start();
    const { user } = renderPanel();
    const dialog = await askToRemove(user, 'Marketing');

    await confirmRemoval(user, dialog);

    expect(await screen.findByText(text.removeRole.removed)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('puts the focus on the heading of the roles when the button that opened the dialog went away, whatever the result', async () => {
    start();
    const { user } = renderPanel();
    const dialog = await askToRemove(user, 'Marketing');
    // Another operator took it away first: the answer is "already done", and the button is gone.
    await callService('/api/v1/users/121/roles/4', { method: 'DELETE' });

    await confirmRemoval(user, dialog);

    expect(await screen.findByText(text.errors.alreadyDone)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: text.roles.title })).toHaveFocus();
    });
  });

  it('gives the focus back to the button that opened the dialog when the button is still there', async () => {
    const mock = start();
    const { user } = renderPanel();
    const dialog = await askToRemove(user, 'Marketing');
    mock.failNext({ method: 'DELETE', status: 503, code: 'service_unavailable' });

    await confirmRemoval(user, dialog);

    expect(await screen.findByText(text.errors.retryable)).toBeInTheDocument();
    await waitFor(() => {
      expect(removeButton('Marketing')).toHaveFocus();
    });
  });

  it('tells that the role is not available any more when taking it away, and no longer shows it', async () => {
    const mock = start();
    const { user } = renderPanel();
    const dialog = await askToRemove(user, 'Marketing');
    // The role was blocked meanwhile: the service treats it as if it did not exist.
    mock.setRoleStatus(4, 2);

    await confirmRemoval(user, dialog);

    expect(await screen.findByText(text.errors.roleUnavailable)).toBeInTheDocument();
    await waitFor(() => {
      expect(roleNames()).toEqual(['Doctor']);
    });
  });

  it('does not send what a dialog that is closing asks, however late it is clicked', async () => {
    const mock = start();
    const { user } = renderPanel();
    const removal = await askToRemove(user, 'Marketing');
    const confirmRemove = within(removal).getByRole('button', { name: text.removeRole.confirm });
    await user.click(within(removal).getByRole('button', { name: messages.common.cancel }));

    // The dialog is still on screen while it fades out, and its button can still be pressed.
    fireEvent.click(confirmRemove);

    // A request would reach the service while the dialog goes away: look once it is gone.
    await noDialog();
    expect(mock.requestsTo('DELETE', /\/roles\//)).toHaveLength(0);
    expect(roleNames()).toEqual(['Doctor', 'Marketing']);

    const adding = await chooseToAdd(user, 'Billing');
    const confirmAdd = within(adding).getByRole('button', { name: text.addRole.confirm });
    await user.click(within(adding).getByRole('button', { name: messages.common.cancel }));
    fireEvent.click(confirmAdd);

    await noDialog();
    expect(mock.requestsTo('POST', /\/roles$/)).toHaveLength(0);
    expect(roleNames()).toEqual(['Doctor', 'Marketing']);
  });
});

describe('UserRolesPanel: when asking for the roles again fails', () => {
  it('keeps the roles that were shown, says that they may be out of date and offers to try again', async () => {
    const mock = start();
    const { user, queryClient } = renderPanel();
    await screen.findByRole('list');

    mock.failNext({
      method: 'GET',
      path: '/api/v1/users/121/roles',
      status: 400,
      code: 'bad_request',
    });
    await queryClient.invalidateQueries({ queryKey: userKeys.roles(121) });

    expect(await screen.findByText(text.roles.refreshError)).toBeInTheDocument();
    expect(roleNames()).toEqual(['Doctor', 'Marketing']);
    expect(screen.queryByText(text.roles.loadError.title)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    await waitFor(() => {
      expect(screen.queryByText(text.roles.refreshError)).not.toBeInTheDocument();
    });
    expect(roleNames()).toEqual(['Doctor', 'Marketing']);
  });
});
