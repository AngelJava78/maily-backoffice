import { screen, waitFor, within } from '@testing-library/react';
import { useState, type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { ADMIN_AUTH0, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';

import type { Role } from '../schemas/role';
import { AddRoleDialog } from './AddRoleDialog';

const text = messages.users.addRole;
const USER_NAME = 'Ana Pérez Gómez';
/** The user has Marketing (4) and Doctor (6); the catalog of the simulator has seven roles. */
const ASSIGNED = [4, 6];
const ALL_ROLE_IDS = [1, 2, 3, 4, 5, 6, 7];

function renderDialog(props: Partial<ComponentProps<typeof AddRoleDialog>> = {}) {
  const onConfirm = vi.fn<(role: Role) => void>();
  const onCancel = vi.fn<() => void>();
  const view = renderWithProviders(
    <AddRoleDialog
      open
      userName={USER_NAME}
      assignedRoleIds={ASSIGNED}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
    { auth0: ADMIN_AUTH0 },
  );
  return { ...view, onConfirm, onCancel };
}

const selector = () => screen.findByRole('combobox', { name: /^Role/ });
const addButton = () => screen.getByRole('button', { name: /^Agregar$/ });

async function choose(user: ReturnType<typeof renderDialog>['user'], roleName: string) {
  await user.click(await selector());
  await user.click(screen.getByRole('option', { name: roleName }));
}

/** An opener, to see the focus leave for the dialog and come back. */
function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Abrir
      </button>
      <AddRoleDialog
        open={open}
        userName={USER_NAME}
        assignedRoleIds={ASSIGNED}
        onConfirm={() => {
          setOpen(false);
        }}
        onCancel={() => {
          setOpen(false);
        }}
      />
    </>
  );
}

describe('AddRoleDialog', () => {
  it('is a dialog named after the action, with a selector of a single role', async () => {
    createUsersDirectoryMock();
    renderDialog();

    const dialog = await screen.findByRole('dialog', { name: text.title });

    expect(await within(dialog).findByRole('combobox', { name: /^Role/ })).toBeInTheDocument();
  });

  it('offers only the roles of the catalog that the user does not have yet', async () => {
    createUsersDirectoryMock();
    const { user } = renderDialog();

    await user.click(await selector());

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Administrator',
      'Billing',
      'Developer',
      'Owner',
      'Support',
    ]);
  });

  it('keeps "Agregar" disabled until a role is chosen, and then names the user and the role', async () => {
    createUsersDirectoryMock();
    const { user } = renderDialog();
    await selector();
    expect(addButton()).toBeDisabled();
    expect(screen.queryByText(/Se agregará/)).not.toBeInTheDocument();

    await choose(user, 'Billing');

    expect(addButton()).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent(text.summary('Billing', USER_NAME));
  });

  it('confirms with the role that was chosen, as it is in the catalog', async () => {
    createUsersDirectoryMock();
    const { user, onConfirm, onCancel } = renderDialog();
    await choose(user, 'Billing');

    await user.click(addButton());

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ id: 5, name: 'Billing' }));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancels with the button and with Escape, without confirming anything', async () => {
    createUsersDirectoryMock();
    const { user, onConfirm, onCancel } = renderDialog();
    await choose(user, 'Billing');

    await user.click(screen.getByRole('button', { name: messages.common.cancel }));
    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cannot be left, nor used again, while the role is being added', async () => {
    createUsersDirectoryMock();
    const { user, onConfirm, onCancel } = renderDialog({ pending: true });

    expect(await selector()).toBeDisabled();
    expect(screen.getByRole('button', { name: messages.common.cancel })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Agregar/ })).toBeDisabled();
    await user.keyboard('{Escape}');

    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('says that there are no more roles to add, and offers no selector', async () => {
    createUsersDirectoryMock();
    renderDialog({ assignedRoleIds: ALL_ROLE_IDS });

    expect(await screen.findByText(text.none)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(addButton()).toBeDisabled();
  });

  it('shows that the catalog is loading', async () => {
    const mock = createUsersDirectoryMock();
    const release = mock.defer();
    renderDialog();

    expect(
      await screen.findByRole('progressbar', { name: messages.common.loading }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    release();

    expect(await selector()).toBeInTheDocument();
  });

  it('shows the error of the catalog with a retry, and retrying shows the selector', async () => {
    const mock = createUsersDirectoryMock();
    mock.failNext({ method: 'GET', path: '/api/v1/roles', status: 500, code: 'internal_error' });
    const { user } = renderDialog();

    expect(await screen.findByText(messages.users.roles.loadError.title)).toBeInTheDocument();
    expect(addButton()).toBeDisabled();
    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    expect(await selector()).toBeInTheDocument();
    expect(screen.queryByText(messages.users.roles.loadError.title)).not.toBeInTheDocument();
  });

  it('asks for the catalog when it opens, not before', async () => {
    const mock = createUsersDirectoryMock();
    const { user } = renderWithProviders(<Harness />, { auth0: ADMIN_AUTH0 });
    expect(mock.requestsTo('GET', '/api/v1/roles')).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    await selector();
    expect(mock.requestsTo('GET', '/api/v1/roles')).toHaveLength(1);
  });

  it('starts on the selector and gives the focus back to the button that opened it', async () => {
    createUsersDirectoryMock();
    const { user } = renderWithProviders(<Harness />, { auth0: ADMIN_AUTH0 });
    const opener = screen.getByRole('button', { name: 'Abrir' });

    await user.click(opener);
    expect(await selector()).toHaveFocus();
    await user.click(screen.getByRole('button', { name: messages.common.cancel }));

    await waitFor(() => {
      expect(opener).toHaveFocus();
    });
  });

  it('opens again without the role that was chosen the last time', async () => {
    createUsersDirectoryMock();
    const { user } = renderWithProviders(<Harness />, { auth0: ADMIN_AUTH0 });
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.click(await selector());
    await user.click(screen.getByRole('option', { name: 'Billing' }));
    await user.click(screen.getByRole('button', { name: messages.common.cancel }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(await selector()).toHaveValue('');
    expect(addButton()).toBeDisabled();
  });

  it('has no accessibility violations: loading, with a role chosen, empty and failing', async () => {
    const mock = createUsersDirectoryMock();
    const release = mock.defer();
    const loading = renderDialog();
    await screen.findByRole('progressbar');
    expect(await axe(loading.baseElement)).toHaveNoViolations();
    release();

    await choose(loading.user, 'Billing');
    expect(await axe(loading.baseElement)).toHaveNoViolations();
    loading.unmount();

    const empty = renderDialog({ assignedRoleIds: ALL_ROLE_IDS });
    await screen.findByText(text.none);
    expect(await axe(empty.baseElement)).toHaveNoViolations();
    empty.unmount();

    mock.failNext({ method: 'GET', path: '/api/v1/roles', status: 500, code: 'internal_error' });
    const failing = renderDialog();
    await screen.findByText(messages.users.roles.loadError.title);
    expect(await axe(failing.baseElement)).toHaveNoViolations();
  });
});
