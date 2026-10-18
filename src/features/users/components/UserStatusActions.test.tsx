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

const text = messages.users;
const ACTIVE = 1;
const BLOCKED = 2;

function start(statusId = ACTIVE) {
  const base = defaultDirectory();
  return createUsersDirectoryMock({
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
}

/** What the detail does with the actions: it reads the user and offers what applies to its status. */
function Harness({
  userCapabilities,
  isSelf,
}: {
  readonly userCapabilities: UserCapabilities;
  readonly isSelf: boolean;
}) {
  const query = useUser(121);
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

const blockButton = () => screen.queryByRole('button', { name: text.actions.block });
const unblockButton = () => screen.queryByRole('button', { name: text.actions.unblock });
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

describe('UserStatusActions: which actions it offers', () => {
  it('offers to block an active user', async () => {
    start();
    renderActions();
    await ready();

    expect(blockButton()).toBeInTheDocument();
    expect(unblockButton()).not.toBeInTheDocument();
  });

  it('offers only to unblock a blocked user', async () => {
    start(BLOCKED);
    renderActions();
    await ready();

    expect(unblockButton()).toBeInTheDocument();
    expect(blockButton()).not.toBeInTheDocument();
  });

  it('offers nothing to who cannot change the status', async () => {
    start();
    renderActions({ userCapabilities: capabilities({ canChangeStatus: false }) });
    await ready();

    expect(blockButton()).not.toBeInTheDocument();
    expect(unblockButton()).not.toBeInTheDocument();
  });

  it('does not offer to block the own user of the operator (FR-012)', async () => {
    start();
    renderActions({ isSelf: true });
    await ready();

    expect(blockButton()).not.toBeInTheDocument();
  });
});

describe('UserStatusActions: blocking', () => {
  it('asks first, naming the user and saying that the person cannot sign in, and does nothing until confirmed', async () => {
    const mock = start();
    const { user } = renderActions();
    await ready();

    const dialog = await open(user, text.actions.block);

    expect(dialog).toHaveAccessibleName(text.dialogs.block.title);
    expect(dialog).toHaveAccessibleDescription(text.dialogs.block.body('Ana Pérez Gómez'));
    expect(mock.requestsTo('POST', /\/block$/)).toHaveLength(0);
  });

  it('does not change anything when it is cancelled, with the button or with Escape', async () => {
    const mock = start();
    const { user } = renderActions();
    await ready();

    const dialog = await open(user, text.actions.block);
    await user.click(within(dialog).getByRole('button', { name: messages.common.cancel }));
    await noDialog();
    await open(user, text.actions.block);
    await user.keyboard('{Escape}');
    await noDialog();

    expect(mock.requestsTo('POST', /\/block$/)).toHaveLength(0);
    expect(statusText()).toBe(text.status.active);
    expect(blockButton()).toBeInTheDocument();
  });

  it('blocks the user once confirmed, says so and shows the new status and the action that follows', async () => {
    const mock = start();
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.block);

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.block.confirm }));

    expect(await screen.findByText(text.statusNotices.blocked)).toBeInTheDocument();
    await waitFor(() => {
      expect(statusText()).toBe(text.status.blocked);
    });
    expect(mock.requestsTo('POST', '/api/v1/users/121/block')).toHaveLength(1);
    expect(mock.state.findUser(121)?.statusId).toBe(BLOCKED);
    expect(await screen.findByRole('button', { name: text.actions.unblock })).toBeInTheDocument();
    expect(blockButton()).not.toBeInTheDocument();
    await noDialog();
  });

  it('keeps the focus on the same button, which now offers the opposite', async () => {
    start();
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.block);

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.block.confirm }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: text.actions.unblock })).toHaveFocus();
    });
  });

  it('sends one request however many times it is confirmed while it works', async () => {
    const mock = start();
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.block);
    const confirm = within(dialog).getByRole('button', { name: text.dialogs.block.confirm });
    const release = mock.defer();

    await user.click(confirm);
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(within(dialog).getByRole('button', { name: messages.common.cancel })).toBeDisabled();
    });
    release();
    await screen.findByText(text.statusNotices.blocked);
    expect(mock.requestsTo('POST', /\/block$/)).toHaveLength(1);
  });
});

describe('UserStatusActions: unblocking', () => {
  it('asks first, naming the user, and unblocks once confirmed', async () => {
    const mock = start(BLOCKED);
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.unblock);
    expect(dialog).toHaveAccessibleName(text.dialogs.unblock.title);
    expect(dialog).toHaveAccessibleDescription(text.dialogs.unblock.body('Ana Pérez Gómez'));
    expect(mock.requestsTo('POST', /\/unblock$/)).toHaveLength(0);

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.unblock.confirm }));

    expect(await screen.findByText(text.statusNotices.unblocked)).toBeInTheDocument();
    await waitFor(() => {
      expect(statusText()).toBe(text.status.active);
    });
    expect(mock.state.findUser(121)?.statusId).toBe(ACTIVE);
    expect(await screen.findByRole('button', { name: text.actions.block })).toBeInTheDocument();
  });

  it('tells that the person has no access account, and the user stays blocked', async () => {
    const mock = start(BLOCKED);
    mock.identity.accountMissing(121);
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.unblock);

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.unblock.confirm }));

    expect(await screen.findByText(text.errors.accountMissingUnblock)).toBeInTheDocument();
    await noDialog();
    expect(statusText()).toBe(text.status.blocked);
    expect(unblockButton()).toBeEnabled();
  });
});

describe('UserStatusActions: when it cannot be done', () => {
  it('tells that the access account could not be updated, the user keeps its status and the action can be tried again', async () => {
    const mock = start();
    mock.identity.unavailable();
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.block);

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.block.confirm }));

    expect(await screen.findByText(text.errors.identityUnavailable)).toBeInTheDocument();
    await noDialog();
    expect(statusText()).toBe(text.status.active);
    expect(mock.state.findUser(121)?.statusId).toBe(ACTIVE);
    expect(blockButton()).toBeEnabled();

    mock.identity.recover();
    await user.click(screen.getByRole('button', { name: text.actions.block }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: text.dialogs.block.confirm,
      }),
    );
    expect(await screen.findByText(text.statusNotices.blocked)).toBeInTheDocument();
  });

  it('tells that the provider refused the operation', async () => {
    const mock = start();
    mock.identity.rejected();
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.block);

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.block.confirm }));

    expect(await screen.findByText(text.errors.identityRejected)).toBeInTheDocument();
    expect(mock.state.findUser(121)?.statusId).toBe(ACTIVE);
  });

  it('tells that the user has another status, and asks for the user again (US4-7)', async () => {
    const mock = start();
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.block);
    // Another operator blocks the same user while this dialog is open.
    mock.setUserStatus(121, BLOCKED);

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.block.confirm }));

    expect(await screen.findByText(text.errors.statusChanged)).toBeInTheDocument();
    await waitFor(() => {
      expect(statusText()).toBe(text.status.blocked);
    });
    expect(mock.requestsTo('GET', '/api/v1/users/121')).toHaveLength(2);
    expect(await screen.findByRole('button', { name: text.actions.unblock })).toBeInTheDocument();
  });

  it('tells that the user does not exist any more', async () => {
    const mock = start();
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.block);
    mock.failNext({ method: 'POST', status: 404, code: 'user_not_found' });

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.block.confirm }));

    expect(await screen.findByText(text.errors.notFound)).toBeInTheDocument();
    await noDialog();
  });

  it('tells that it could not be done when the service fails, and the user keeps its status', async () => {
    const mock = start();
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.block);
    mock.failNext({ method: 'POST', status: 500, code: 'internal_error' });

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.block.confirm }));

    expect(await screen.findByText(text.errors.retryable)).toBeInTheDocument();
    await noDialog();
    expect(statusText()).toBe(text.status.active);
    expect(blockButton()).toBeEnabled();
  });

  it('does not repeat the notice of a lack of permission, which the application already shows', async () => {
    const mock = start();
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.block);
    mock.revoke('Administrator', 'users:update');

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.block.confirm }));

    await noDialog();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(statusText()).toBe(text.status.active);
  });
});

describe('UserStatusActions: accessibility', () => {
  it('has no violations with the actions, with the confirmation open and when blocked', async () => {
    start();
    const view = renderActions();
    await ready();
    expect(await axe(view.container)).toHaveNoViolations();

    await open(view.user, text.actions.block);
    expect(await axe(view.baseElement)).toHaveNoViolations();
    view.unmount();

    const mock = start(BLOCKED);
    expect(mock.state.findUser(121)?.statusId).toBe(BLOCKED);
    const blocked = renderActions();
    await ready();
    expect(await axe(blocked.container)).toHaveNoViolations();
  });
});

describe('UserStatusActions: how the result is told, and the dialog that is closing', () => {
  it('tells how it went only once the dialog has closed, because the page is hidden from a screen reader until then', async () => {
    start();
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.block);

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.block.confirm }));

    expect(await screen.findByText(text.statusNotices.blocked)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not send what a dialog that is closing asks, however late it is clicked', async () => {
    const mock = start();
    const { user } = renderActions();
    await ready();
    const dialog = await open(user, text.actions.block);
    const confirm = within(dialog).getByRole('button', { name: text.dialogs.block.confirm });
    await user.click(within(dialog).getByRole('button', { name: messages.common.cancel }));

    // The dialog is still on screen while it fades out, and its button can still be pressed.
    fireEvent.click(confirm);

    expect(mock.requestsTo('POST', /\/block$/)).toHaveLength(0);
    await noDialog();
    expect(statusText()).toBe(text.status.active);
  });
});
