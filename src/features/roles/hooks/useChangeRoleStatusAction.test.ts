import { act, renderHook, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';
import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import type { RoleStatusAction } from './useChangeRoleStatus';
import { useChangeRoleStatusAction } from './useChangeRoleStatusAction';

const ADMIN_SUB = 'auth0|roles-admin';
const text = messages.roles.status;
const BILLING = { id: 5, name: 'Billing' };

function start() {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock(scenario.directory);
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

function renderAction(action: RoleStatusAction) {
  const onChanged = vi.fn<() => void>();
  const onFailed = vi.fn<() => void>();
  const { wrapper } = createWrapper({
    auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) },
  });
  const { result } = renderHook(
    () => useChangeRoleStatusAction(BILLING, action, onChanged, onFailed),
    { wrapper },
  );
  return { result, onChanged, onFailed };
}

describe('useChangeRoleStatusAction (feature 025, FR-015, FR-016)', () => {
  it('blocking: success notice that names the role and where it is now, then onChanged', async () => {
    start();
    const { result, onChanged, onFailed } = renderAction('block');

    act(() => {
      result.current.run();
    });

    await waitFor(() => {
      expect(onChanged).toHaveBeenCalledOnce();
    });
    expect(await screen.findByText(text.blocked('Billing'))).toBeInTheDocument();
    expect(onFailed).not.toHaveBeenCalled();
  });

  it('unblocking: success notice, then onChanged', async () => {
    const { users } = start();
    users.setRoleStatus(5, 2);
    const { result, onChanged } = renderAction('unblock');

    act(() => {
      result.current.run();
    });

    await waitFor(() => {
      expect(onChanged).toHaveBeenCalledOnce();
    });
    expect(await screen.findByText(text.unblocked('Billing'))).toBeInTheDocument();
  });

  it('is pending while the operation runs', async () => {
    const { roles } = start();
    const release = roles.defer();
    const { result, onChanged } = renderAction('block');

    act(() => {
      result.current.run();
    });

    await waitFor(() => {
      expect(result.current.pending).toBe(true);
    });
    release();
    await waitFor(() => {
      expect(onChanged).toHaveBeenCalledOnce();
    });
    expect(result.current.pending).toBe(false);
  });

  it.each([
    ['block', 2, text.alreadyBlocked('Billing')],
    ['unblock', 1, text.alreadyActive('Billing')],
  ] as const)(
    '%s on a role that already had that status: an informative notice, then onChanged',
    async (action, statusId, notice) => {
      const { users } = start();
      users.setRoleStatus(5, statusId);
      const { result, onChanged, onFailed } = renderAction(action);

      act(() => {
        result.current.run();
      });

      expect(await screen.findByText(notice)).toBeInTheDocument();
      expect(onChanged).toHaveBeenCalledOnce();
      expect(onFailed).not.toHaveBeenCalled();
    },
  );

  it('a role that no longer exists is an error notice and onFailed, not onChanged', async () => {
    const { users } = start();
    users.setRoleStatus(5, 3);
    const { result, onChanged, onFailed } = renderAction('block');

    act(() => {
      result.current.run();
    });

    expect(await screen.findByText(messages.roles.errors.notFound)).toBeInTheDocument();
    expect(onFailed).toHaveBeenCalledOnce();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('a failure of the service is an error notice and leaves the role as it was', async () => {
    const { users, roles } = start();
    roles.failNext({
      method: 'POST',
      path: '/api/v1/roles/5/block',
      status: 503,
      code: 'internal_error',
    });
    const { result, onChanged, onFailed } = renderAction('block');

    act(() => {
      result.current.run();
    });

    expect(await screen.findByText(messages.roles.errors.retryable)).toBeInTheDocument();
    expect(onFailed).toHaveBeenCalledOnce();
    expect(onChanged).not.toHaveBeenCalled();
    expect(users.state.findRole(5)?.statusId).toBe(1);
  });
});
