import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';
import { ALL_CAPABILITIES } from '@/test/capabilities';
import {
  ADMIN_AUTH0,
  createUsersDirectoryMock,
  defaultDirectory,
  directoryUser,
  type DirectoryUser,
} from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';

import { UserDetailPage } from './UserDetailPage';

const ANA = directoryUser({
  id: 121,
  email: 'ana@clinica.com',
  firstName: 'Ana',
  paternalLastName: 'Pérez',
  maternalLastName: 'Gómez',
  createdAt: '2026-10-15T14:20:11.032Z',
  updatedAt: '2026-10-16T09:30:00.000Z',
});

function start(extra: DirectoryUser[] = []) {
  const base = defaultDirectory();
  const mock = createUsersDirectoryMock({ ...base, users: [...base.users, ANA, ...extra] });
  mock.assign(121, 4);
  return mock;
}

/** The value shown next to a label of the data of the user (`dt` followed by its `dd`). */
function valueOf(label: string): string | null {
  return screen.getByText(label).nextElementSibling?.textContent ?? null;
}

function renderDetail(userId = 121, state?: unknown) {
  const route = state === undefined ? `/users/${userId}` : { pathname: `/users/${userId}`, state };
  return renderWithProviders(
    [
      {
        path: '/users/:userId',
        element: (
          <UserDetailPage userId={userId} operatorUserId={1} capabilities={ALL_CAPABILITIES} />
        ),
      },
    ],
    { auth0: ADMIN_AUTH0, initialEntries: [route] },
  );
}

describe('UserDetailPage', () => {
  it('shows the title from the first render, even while the data loads', async () => {
    const mock = start();
    const release = mock.defer();
    renderDetail();

    expect(
      screen.getByRole('heading', { level: 1, name: messages.users.detail.title }),
    ).toBeInTheDocument();
    release();
    expect(await screen.findByText('ana@clinica.com')).toBeInTheDocument();
  });

  it('shows all the data of the user, with the dates in the local format', async () => {
    start();
    renderDetail();

    await screen.findByText('ana@clinica.com');
    const { fields } = messages.users.detail;
    expect(valueOf(fields.name)).toBe('Ana');
    expect(valueOf(fields.paternalLastName)).toBe('Pérez');
    expect(valueOf(fields.maternalLastName)).toBe('Gómez');
    expect(valueOf(fields.email)).toBe('ana@clinica.com');
    expect(valueOf(fields.status)).toBe(messages.users.status.active);
    expect(valueOf(fields.createdAt)).toBe(formatDateTime('2026-10-15T14:20:11.032Z'));
    expect(valueOf(fields.updatedAt)).toBe(formatDateTime('2026-10-16T09:30:00.000Z'));
  });

  it('shows a dash where the user has no maternal last name', async () => {
    start([directoryUser({ id: 130, maternalLastName: null })]);
    renderDetail(130);

    await screen.findByText('user130@ejemplo.com');

    expect(valueOf(messages.users.detail.fields.maternalLastName)).toBe(
      messages.users.detail.emptyValue,
    );
  });

  it('shows the roles of the user in its own section', async () => {
    start();
    renderDetail();

    expect(
      await screen.findByRole('heading', { name: messages.users.roles.title }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Marketing')).toBeInTheDocument();
  });

  it.each([
    [2, messages.users.status.blocked],
    [3, messages.users.status.deleted],
  ])(
    'shows the status of a user in the status %i and tells that the roles are not shown',
    async (statusId, text) => {
      const mock = start([directoryUser({ id: 140, statusId })]);
      renderDetail(140);

      expect(await screen.findByText(text)).toBeInTheDocument();
      expect(await screen.findByText(messages.users.roles.unavailable)).toBeInTheDocument();
      expect(mock.requestsTo('GET', '/api/v1/users/140/roles')).toHaveLength(0);
    },
  );

  it('says that the user was not found, with a way back to the list (US1-7)', async () => {
    start();
    renderDetail(999);

    expect(await screen.findByText(messages.users.detail.notFound.title)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: messages.users.detail.notFound.backToList }),
    ).toHaveAttribute('href', '/users');
  });

  it('shows any other failure as an error, and retrying shows the user', async () => {
    const mock = start();
    mock.failNext({
      method: 'GET',
      path: '/api/v1/users/121',
      status: 500,
      code: 'internal_error',
    });
    const { user } = renderDetail();

    expect(await screen.findByText(messages.users.detail.loadError.title)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    expect(await screen.findByText('ana@clinica.com')).toBeInTheDocument();
  });

  describe('going back to the list (FR-003)', () => {
    it('returns to the page that the person came from', async () => {
      start();
      renderDetail(121, { listSearch: '?page=3&page_size=25' });

      expect(
        await screen.findByRole('link', { name: messages.users.detail.backToList }),
      ).toHaveAttribute('href', '/users?page=3&page_size=25');
    });

    it('returns to the search that the person came from', async () => {
      start();
      renderDetail(121, { listSearch: '?email=ana%40clinica.com' });

      expect(
        await screen.findByRole('link', { name: messages.users.detail.backToList }),
      ).toHaveAttribute('href', '/users?email=ana%40clinica.com');
    });

    it('returns to the list when the person arrived without coming from it', async () => {
      start();
      renderDetail();

      expect(
        await screen.findByRole('link', { name: messages.users.detail.backToList }),
      ).toHaveAttribute('href', '/users');
    });

    it('ignores a search that the list could not have written', async () => {
      start();
      renderDetail(121, { listSearch: '?next=https://evil.example' });

      expect(
        await screen.findByRole('link', { name: messages.users.detail.backToList }),
      ).toHaveAttribute('href', '/users');
    });
  });

  describe('the roles that could not be assigned when the user was created (FR-023)', () => {
    const PENDING = {
      listSearch: '?page=2',
      rolesNotAssigned: [
        { id: 6, name: 'Doctor' },
        { id: 9, name: 'Zeta' },
      ],
    };

    function startWithPending() {
      const mock = start();
      mock.addRole({ id: 9, name: 'Zeta' });
      return mock;
    }

    it('warns which roles are missing', async () => {
      startWithPending();
      renderDetail(121, PENDING);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        messages.users.pendingRoles.message('Doctor, Zeta'),
      );
    });

    it('retries them, says so, and the warning goes away while the roles appear', async () => {
      const mock = startWithPending();
      const { user, router } = renderDetail(121, PENDING);
      await user.click(
        await screen.findByRole('button', { name: messages.users.pendingRoles.retry }),
      );

      expect(await screen.findByText(messages.users.pendingRoles.done)).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByText(messages.users.pendingRoles.title)).not.toBeInTheDocument();
      });
      expect(mock.state.rolesOf(121).map((role) => role.name)).toEqual([
        'Marketing',
        'Doctor',
        'Zeta',
      ]);
      expect(await screen.findByText('Zeta', { selector: 'li span' })).toBeInTheDocument();
      expect(router.state.historyAction).toBe('REPLACE');
      expect(router.state.location.state).toEqual({ listSearch: '?page=2' });
    });

    it('keeps in the warning only the roles that still fail', async () => {
      const mock = startWithPending();
      mock.setRoleStatus(9, 2);
      const { user, router } = renderDetail(121, PENDING);
      await user.click(
        await screen.findByRole('button', { name: messages.users.pendingRoles.retry }),
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          messages.users.pendingRoles.message('Zeta'),
        );
      });
      expect(mock.state.rolesOf(121).map((role) => role.name)).toContain('Doctor');
      expect(router.state.location.state).toEqual({
        listSearch: '?page=2',
        rolesNotAssigned: [{ id: 9, name: 'Zeta' }],
      });
    });

    it('can be dismissed without asking anything', async () => {
      const mock = startWithPending();
      const { user } = renderDetail(121, PENDING);

      await user.click(
        await screen.findByRole('button', { name: messages.users.pendingRoles.dismiss }),
      );

      await waitFor(() => {
        expect(screen.queryByText(messages.users.pendingRoles.title)).not.toBeInTheDocument();
      });
      expect(mock.requestsTo('POST', /\/roles$/)).toHaveLength(0);
    });

    it.each([
      ['has no pending roles', undefined],
      ['is not valid', { rolesNotAssigned: [{ id: 0, name: '' }] }],
    ])('shows no warning when the state %s', async (_label, state) => {
      start();
      renderDetail(121, state);

      await screen.findByText('ana@clinica.com');
      expect(screen.queryByText(messages.users.pendingRoles.title)).not.toBeInTheDocument();
    });
  });

  it('has no accessibility violations for an active user and for a blocked one', async () => {
    start([directoryUser({ id: 140, statusId: 2 })]);
    const active = renderDetail();
    await screen.findByText('Marketing');
    expect(await axe(active.container)).toHaveNoViolations();
    active.unmount();

    const blocked = renderDetail(140);
    await screen.findByText(messages.users.roles.unavailable);
    expect(await axe(blocked.container)).toHaveNoViolations();
  });
});
