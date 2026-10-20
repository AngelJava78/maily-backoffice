import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { ALL_CAPABILITIES, capabilities } from '@/test/capabilities';
import {
  ADMIN_AUTH0,
  createUsersDirectoryMock,
  defaultDirectory,
  directoryUser,
} from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';

import { useUser } from '../hooks/useUser';
import { getAvailableActions, type UserCapabilities } from '../policy/availableActions';
import { UserStatusActions } from './UserStatusActions';
import { uuidOf } from '@/test/ids';

const text = messages.users;
const ACTIVE = 1;
const DELETED = 3;

function start(statusId = ACTIVE) {
  const base = defaultDirectory();
  const mock = createUsersDirectoryMock({
    ...base,
    users: [
      ...base.users,
      directoryUser({
        id: uuidOf(121),
        statusId,
        firstName: 'Ana',
        paternalLastName: 'Pérez',
        maternalLastName: 'Gómez',
      }),
    ],
  });
  mock.assign(uuidOf(121), 4);
  return mock;
}

/** What the detail does with the actions: it reads the user and offers what applies to its status. */
function Harness({
  userCapabilities,
  isSelf,
}: {
  readonly userCapabilities: UserCapabilities;
  readonly isSelf: boolean;
}) {
  const query = useUser(uuidOf(121));
  if (query.data === undefined) {
    return null;
  }
  const available = getAvailableActions({
    statusId: query.data.status.id,
    capabilities: userCapabilities,
    isSelf,
  });
  return (
    <>
      <p data-testid="status">{query.data.status.name}</p>
      <UserStatusActions user={query.data} available={available} />
    </>
  );
}

function renderActions({
  userCapabilities = ALL_CAPABILITIES,
  isSelf = false,
}: { readonly userCapabilities?: UserCapabilities; readonly isSelf?: boolean } = {}) {
  return renderWithProviders(<Harness userCapabilities={userCapabilities} isSelf={isSelf} />, {
    auth0: ADMIN_AUTH0,
  });
}

type Rendered = ReturnType<typeof renderActions>;

const button = (name: string) => screen.queryByRole('button', { name });
const statusText = () => screen.getByTestId('status').textContent;

async function ready() {
  await screen.findByTestId('status');
}

async function open(user: Rendered['user'], name: string) {
  await user.click(screen.getByRole('button', { name }));
  return screen.findByRole('dialog');
}

const noDialog = () =>
  waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

describe('UserStatusActions: which removal actions it offers', () => {
  it('offers to delete an active user, besides blocking it', async () => {
    start();
    renderActions();
    await ready();

    expect(button(text.actions.delete)).toBeInTheDocument();
    expect(button(text.actions.block)).toBeInTheDocument();
    expect(button(text.actions.reactivate)).not.toBeInTheDocument();
  });

  it('offers only to reactivate a deleted user', async () => {
    start(DELETED);
    renderActions();
    await ready();

    expect(button(text.actions.reactivate)).toBeInTheDocument();
    expect(button(text.actions.delete)).not.toBeInTheDocument();
    expect(button(text.actions.block)).not.toBeInTheDocument();
    expect(button(text.actions.unblock)).not.toBeInTheDocument();
  });

  it('offers to delete only to who can delete, and to reactivate only to who can change the status', async () => {
    start();
    const noDelete = renderActions({ userCapabilities: capabilities({ canDelete: false }) });
    await ready();
    expect(button(text.actions.delete)).not.toBeInTheDocument();
    expect(button(text.actions.block)).toBeInTheDocument();
    noDelete.unmount();

    start(DELETED);
    renderActions({ userCapabilities: capabilities({ canChangeStatus: false }) });
    await ready();
    expect(button(text.actions.reactivate)).not.toBeInTheDocument();
  });

  it('does not offer to delete the own user of the operator (FR-012)', async () => {
    start();
    renderActions({ isSelf: true });
    await ready();

    expect(button(text.actions.delete)).not.toBeInTheDocument();
    expect(button(text.actions.block)).not.toBeInTheDocument();
  });
});

describe('UserStatusActions: deleting', () => {
  it('asks first, naming the user and saying what happens, and does nothing until confirmed', async () => {
    const mock = start();
    const { user } = renderActions();
    await ready();

    const dialog = await open(user, text.actions.delete);

    expect(dialog).toHaveAccessibleName(text.dialogs.delete.title);
    expect(dialog).toHaveAccessibleDescription(text.dialogs.delete.body('Ana Pérez Gómez'));
    expect(mock.requestsTo('DELETE', /./)).toHaveLength(0);
  });

  it('does not change anything when it is cancelled', async () => {
    const mock = start();
    const { user } = renderActions();
    await ready();

    const dialog = await open(user, text.actions.delete);
    await user.click(within(dialog).getByRole('button', { name: messages.common.cancel }));
    await noDialog();
    await open(user, text.actions.delete);
    await user.keyboard('{Escape}');
    await noDialog();

    expect(mock.requestsTo('DELETE', /./)).toHaveLength(0);
    expect(statusText()).toBe(text.status.active);
  });

  it('deletes the user once confirmed, says so, shows the new status and offers to reactivate', async () => {
    const mock = start();
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.delete);

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.delete.confirm }));

    expect(await screen.findByText(text.statusNotices.deleted)).toBeInTheDocument();
    await waitFor(() => {
      expect(statusText()).toBe(text.status.deleted);
    });
    expect(mock.requestsTo('DELETE', `/api/v1/users/${uuidOf(121)}`)).toHaveLength(1);
    expect(mock.state.findUser(uuidOf(121))?.statusId).toBe(DELETED);
    expect(
      await screen.findByRole('button', { name: text.actions.reactivate }),
    ).toBeInTheDocument();
    expect(button(text.actions.delete)).not.toBeInTheDocument();
    expect(button(text.actions.block)).not.toBeInTheDocument();
  });

  it('puts the focus on the button that is left, because the one that opened the dialog is gone', async () => {
    start();
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.delete);

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.delete.confirm }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: text.actions.reactivate })).toHaveFocus();
    });
  });

  it('sends one request however many times it is confirmed while it works', async () => {
    const mock = start();
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.delete);
    const confirm = within(dialog).getByRole('button', { name: text.dialogs.delete.confirm });
    const release = mock.defer();

    await user.click(confirm);
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(within(dialog).getByRole('button', { name: messages.common.cancel })).toBeDisabled();
    });
    release();
    await screen.findByText(text.statusNotices.deleted);
    expect(mock.requestsTo('DELETE', /./)).toHaveLength(1);
  });

  it('tells that the access account could not be updated, and the user keeps its status', async () => {
    const mock = start();
    mock.identity.unavailable();
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.delete);

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.delete.confirm }));

    expect(await screen.findByText(text.errors.identityUnavailable)).toBeInTheDocument();
    await noDialog();
    expect(statusText()).toBe(text.status.active);
    expect(button(text.actions.delete)).toBeEnabled();
  });

  it('tells that the user has another status, and asks for the user again', async () => {
    const mock = start();
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.delete);
    // Another operator deletes the same user while this dialog is open.
    mock.setUserStatus(uuidOf(121), DELETED);

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.delete.confirm }));

    expect(await screen.findByText(text.errors.statusChanged)).toBeInTheDocument();
    await waitFor(() => {
      expect(statusText()).toBe(text.status.deleted);
    });
    expect(mock.requestsTo('GET', `/api/v1/users/${uuidOf(121)}`)).toHaveLength(2);
  });

  it('tells that a blocked user has to be unblocked before it can be deleted', async () => {
    const mock = start();
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.delete);
    mock.setUserStatus(uuidOf(121), 2);

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.delete.confirm }));

    expect(await screen.findByText(text.errors.statusChanged)).toBeInTheDocument();
    await waitFor(() => {
      expect(statusText()).toBe(text.status.blocked);
    });
    await noDialog();
    expect(button(text.actions.delete)).not.toBeInTheDocument();
  });

  it('does not repeat the notice of a lack of permission, which the application already shows', async () => {
    const mock = start();
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.delete);
    mock.revoke('Administrator', 'users:delete');

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.delete.confirm }));

    await noDialog();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(statusText()).toBe(text.status.active);
  });
});

describe('UserStatusActions: reactivating', () => {
  it('asks first, naming the user, and reactivates once confirmed', async () => {
    const mock = start(DELETED);
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.reactivate);
    expect(dialog).toHaveAccessibleName(text.dialogs.reactivate.title);
    expect(dialog).toHaveAccessibleDescription(text.dialogs.reactivate.body('Ana Pérez Gómez'));
    expect(mock.requestsTo('POST', /\/reactivate$/)).toHaveLength(0);

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.reactivate.confirm }));

    expect(await screen.findByText(text.statusNotices.reactivated)).toBeInTheDocument();
    await waitFor(() => {
      expect(statusText()).toBe(text.status.active);
    });
    expect(mock.state.findUser(uuidOf(121))?.statusId).toBe(ACTIVE);
    expect(await screen.findByRole('button', { name: text.actions.delete })).toBeInTheDocument();
    expect(button(text.actions.block)).toBeInTheDocument();
  });

  it('tells that the person has no access account, and the user stays deleted', async () => {
    const mock = start(DELETED);
    mock.identity.accountMissing(uuidOf(121));
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.reactivate);

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.reactivate.confirm }));

    expect(await screen.findByText(text.errors.accountMissingReactivate)).toBeInTheDocument();
    await noDialog();
    expect(statusText()).toBe(text.status.deleted);
    expect(button(text.actions.reactivate)).toBeEnabled();
  });

  it('tells that it could not be done when the service fails', async () => {
    const mock = start(DELETED);
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.reactivate);
    mock.failNext({ method: 'POST', status: 500, code: 'internal_error' });

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.reactivate.confirm }));

    expect(await screen.findByText(text.errors.retryable)).toBeInTheDocument();
    await noDialog();
    expect(statusText()).toBe(text.status.deleted);
  });
});

describe('UserStatusActions: accessibility of the removal actions', () => {
  it('has no violations with the actions, with the confirmation open and when deleted', async () => {
    start();
    const view = renderActions();
    await ready();
    expect(await axe(view.container)).toHaveNoViolations();

    await open(view.user, text.actions.delete);
    expect(await axe(view.baseElement)).toHaveNoViolations();
    view.unmount();

    start(DELETED);
    const deleted = renderActions();
    await ready();
    expect(await axe(deleted.container)).toHaveNoViolations();
    await open(deleted.user, text.actions.reactivate);
    expect(await axe(deleted.baseElement)).toHaveNoViolations();
  });
});
