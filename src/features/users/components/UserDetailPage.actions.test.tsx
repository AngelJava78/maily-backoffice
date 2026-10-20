import { screen, within } from '@testing-library/react';
import { useLocation } from 'react-router';
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

import type { UserCapabilities } from '../policy/availableActions';
import { UserDetailPage } from './UserDetailPage';
import { uuidOf } from '@/test/ids';

const text = messages.users;

function start(statusId = 1) {
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

/** Shows what the edit address received, so the state that travels with the link can be read. */
function EditProbe() {
  const location = useLocation();
  return <p data-testid="edit-page">{`${location.pathname} ${JSON.stringify(location.state)}`}</p>;
}

function renderDetail({
  userId = uuidOf(121),
  operatorUserId = uuidOf(1),
  userCapabilities = ALL_CAPABILITIES,
  entry = `/users/${uuidOf(121)}`,
}: {
  readonly userId?: string;
  readonly operatorUserId?: string;
  readonly userCapabilities?: UserCapabilities;
  readonly entry?: string | { readonly pathname: string; readonly state: unknown };
} = {}) {
  return renderWithProviders(
    [
      {
        path: '/users/:userId',
        element: (
          <UserDetailPage
            userId={userId}
            operatorUserId={operatorUserId}
            capabilities={userCapabilities}
          />
        ),
      },
      { path: '/users/:userId/edit', element: <EditProbe /> },
    ],
    { auth0: ADMIN_AUTH0, initialEntries: [entry] },
  );
}

const editLink = () => screen.queryByRole('link', { name: text.actions.edit });
const addRoleButton = () => screen.queryByRole('button', { name: text.roles.add });
const removeButtons = () => screen.queryAllByRole('button', { name: /^Quitar el role/ });

describe('UserDetailPage: the actions it offers', () => {
  it('offers to edit an active user, linking to its edit page', async () => {
    start();
    renderDetail();

    await screen.findByText('Marketing');

    expect(editLink()).toHaveAttribute('href', `/users/${uuidOf(121)}/edit`);
  });

  it('carries the search of the list to the edit page, to come back to the same page', async () => {
    start();
    const { user } = renderDetail({
      entry: { pathname: `/users/${uuidOf(121)}`, state: { listSearch: '?page=3&page_size=25' } },
    });
    await screen.findByText('Marketing');

    await user.click(screen.getByRole('link', { name: text.actions.edit }));

    expect(await screen.findByTestId('edit-page')).toHaveTextContent(
      `/users/${uuidOf(121)}/edit {"listSearch":"?page=3&page_size=25"}`,
    );
  });

  it('offers the actions on the roles to who can add and remove them', async () => {
    start();
    renderDetail();

    await screen.findByText('Marketing');

    expect(addRoleButton()).toBeInTheDocument();
    expect(removeButtons()).toHaveLength(1);
  });

  it('offers only what the operator can do', async () => {
    start();
    renderDetail({
      userCapabilities: capabilities({ canEdit: false, canAddRoles: false }),
    });

    await screen.findByText('Marketing');

    expect(editLink()).not.toBeInTheDocument();
    expect(addRoleButton()).not.toBeInTheDocument();
    expect(removeButtons()).toHaveLength(1);
  });

  it('offers nothing to an operator who can only read', async () => {
    start();
    renderDetail({
      userCapabilities: capabilities({
        canEdit: false,
        canAddRoles: false,
        canRemoveRoles: false,
        canChangeStatus: false,
        canDelete: false,
      }),
    });

    await screen.findByText('Marketing');

    expect(editLink()).not.toBeInTheDocument();
    expect(addRoleButton()).not.toBeInTheDocument();
    expect(removeButtons()).toHaveLength(0);
    expect(screen.queryByText(text.detail.selfNote)).not.toBeInTheDocument();
  });

  it.each([
    [2, text.status.blocked],
    [3, text.status.deleted],
  ])('does not offer to edit a user in the status %i', async (statusId, statusText) => {
    start(statusId);
    renderDetail();

    await screen.findByText(statusText);

    expect(editLink()).not.toBeInTheDocument();
    expect(addRoleButton()).not.toBeInTheDocument();
  });

  describe("on the operator's own user", () => {
    it('tells why, still offers to edit and offers no action on the roles', async () => {
      start();
      renderDetail({ userId: uuidOf(1), operatorUserId: uuidOf(1), entry: `/users/${uuidOf(1)}` });

      expect(await screen.findByText(text.detail.selfNote)).toBeInTheDocument();
      await screen.findByText('Administrator');

      expect(editLink()).toBeInTheDocument();
      expect(addRoleButton()).not.toBeInTheDocument();
      expect(removeButtons()).toHaveLength(0);
    });

    it('does not tell it on the user of somebody else', async () => {
      start();
      renderDetail();

      await screen.findByText('Marketing');

      expect(screen.queryByText(text.detail.selfNote)).not.toBeInTheDocument();
    });
  });

  it('names the user in the dialogs of the roles', async () => {
    start();
    const { user } = renderDetail();
    await screen.findByText('Marketing');

    await user.click(screen.getByRole('button', { name: text.roles.remove('Marketing') }));

    const dialog = await screen.findByRole('dialog', { name: text.removeRole.title });
    expect(dialog).toHaveAccessibleDescription(
      text.removeRole.body('Marketing', 'Ana Pérez Gómez'),
    );
  });

  it('has no accessibility violations with the actions, and with the note of the own user', async () => {
    start();
    const others = renderDetail();
    await screen.findByText('Marketing');
    expect(await axe(others.container)).toHaveNoViolations();
    others.unmount();

    const own = renderDetail({
      userId: uuidOf(1),
      operatorUserId: uuidOf(1),
      entry: `/users/${uuidOf(1)}`,
    });
    await screen.findByText(text.detail.selfNote);
    await within(own.container).findByText('Administrator');
    expect(await axe(own.container)).toHaveNoViolations();
  });
});
