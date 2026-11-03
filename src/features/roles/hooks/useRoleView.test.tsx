import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { roleKeys } from './roleKeys';
import { useRoleView } from './useRoleView';

const ADMIN_SUB = 'auth0|roles-admin';
const BLOCKED = 2;

function start() {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock(scenario.directory);
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

function wrapperFor() {
  return createWrapper({ auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) } });
}

/** Whether the blocked roles were asked for: `GET /roles?status_id=2`. */
const askedForTheBlocked = (users: ReturnType<typeof start>['users']) =>
  users.requests.some((request) => request.method === 'GET' && request.search === '?status_id=2');

describe('useRoleView (research D5)', () => {
  it('opens an active role without asking for the blocked ones', async () => {
    const { users } = start();
    const { wrapper } = wrapperFor();

    const { result } = renderHook(() => useRoleView(1), { wrapper });

    await waitFor(() => {
      expect(result.current.view.kind).toBe('active');
    });
    expect(result.current.view).toMatchObject({
      kind: 'active',
      role: { id: 1, name: 'Administrator' },
    });
    expect(askedForTheBlocked(users)).toBe(false);
  });

  it('opens a blocked role from the list of the blocked, and asks for none of its permissions (FR-012)', async () => {
    const { users, roles } = start();
    users.setRoleStatus(3, BLOCKED);
    const { wrapper } = wrapperFor();

    const { result } = renderHook(() => useRoleView(3), { wrapper });

    expect(result.current.view.kind).toBe('loading');
    await waitFor(() => {
      expect(result.current.view.kind).toBe('blocked');
    });
    expect(result.current.view).toMatchObject({
      kind: 'blocked',
      role: { id: 3, name: 'Support' },
    });
    expect(askedForTheBlocked(users)).toBe(true);
    expect(roles.requests.filter((request) => request.path.endsWith('/permissions'))).toEqual([]);
  });

  it('says «no longer exists» for a role that is in neither list (FR-014)', async () => {
    start();
    const { wrapper } = wrapperFor();

    const { result } = renderHook(() => useRoleView(999), { wrapper });

    await waitFor(() => {
      expect(result.current.view.kind).toBe('notFound');
    });
  });

  it('keeps saying «no longer exists», and does not turn into the blocked view, for a role that was open as active and is blocked from another session', async () => {
    const { users } = start();
    const { wrapper, queryClient } = wrapperFor();
    const { result } = renderHook(() => useRoleView(5), { wrapper });
    await waitFor(() => {
      expect(result.current.view.kind).toBe('active');
    });

    users.setRoleStatus(5, BLOCKED);
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
    });

    await waitFor(() => {
      expect(result.current.view.kind).toBe('notFound');
    });
    expect(askedForTheBlocked(users)).toBe(false);
  });

  it('is an error when the list fails, and retrying brings the role back', async () => {
    const { users } = start();
    users.failNext({ method: 'GET', path: '/api/v1/roles', status: 500, code: 'internal_error' });
    const { wrapper } = wrapperFor();

    const { result } = renderHook(() => useRoleView(1), { wrapper });

    await waitFor(() => {
      expect(result.current.view.kind).toBe('error');
    });
    act(() => {
      result.current.retry();
    });
    await waitFor(() => {
      expect(result.current.view.kind).toBe('active');
    });
  });

  it('does not carry «it was open as active» from one role to the next one (duplicating)', async () => {
    const { users } = start();
    const { wrapper } = wrapperFor();
    const { result, rerender } = renderHook(
      ({ roleId }: { readonly roleId: number }) => useRoleView(roleId),
      {
        wrapper,
        initialProps: { roleId: 5 },
      },
    );
    await waitFor(() => {
      expect(result.current.view.kind).toBe('active');
    });

    rerender({ roleId: 999 });

    // The blocked list is asked for: the flag of role 5 does not make role 999 «gone while open».
    await waitFor(() => {
      expect(result.current.view.kind).toBe('notFound');
    });
    expect(askedForTheBlocked(users)).toBe(true);
  });
});
