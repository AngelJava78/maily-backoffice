import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { useChangeRoleStatus } from './useChangeRoleStatus';
import { useRolesCatalog } from './useRolesCatalog';

const ADMIN_SUB = 'auth0|roles-admin';

function start() {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock(scenario.directory);
  createRolesCatalogMock(users.state, scenario);
  return { users };
}

function wrapperFor() {
  return createWrapper({ auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) } });
}

describe('useChangeRoleStatus (feature 025)', () => {
  it('blocks a role and gives it with its new status', async () => {
    const { users } = start();
    const { wrapper } = wrapperFor();
    const { result } = renderHook(() => useChangeRoleStatus(), { wrapper });

    result.current.mutate({ roleId: 5, action: 'block' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.status.id).toBe(2);
    expect(users.state.findRole(5)?.statusId).toBe(2);
  });

  it('refreshes both lists: the role leaves the active one and enters the blocked one (SC-005)', async () => {
    start();
    const { wrapper } = wrapperFor();
    const { result: active } = renderHook(() => useRolesCatalog('active'), { wrapper });
    const { result: blocked } = renderHook(() => useRolesCatalog('blocked'), { wrapper });
    await waitFor(() => {
      expect(active.current.data?.some((role) => role.id === 5)).toBe(true);
    });
    await waitFor(() => {
      expect(blocked.current.data).toEqual([]);
    });
    const { result: change } = renderHook(() => useChangeRoleStatus(), { wrapper });

    change.current.mutate({ roleId: 5, action: 'block' });

    await waitFor(() => {
      expect(active.current.data?.some((role) => role.id === 5)).toBe(false);
    });
    expect(blocked.current.data?.map((role) => role.id)).toEqual([5]);
  });

  it('unblocks a blocked role', async () => {
    const { users } = start();
    users.setRoleStatus(5, 2);
    const { wrapper } = wrapperFor();
    const { result } = renderHook(() => useChangeRoleStatus(), { wrapper });

    result.current.mutate({ roleId: 5, action: 'unblock' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(users.state.findRole(5)?.statusId).toBe(1);
  });

  it('rejects with the code of the service when the role already had that status', async () => {
    start();
    const { wrapper } = wrapperFor();
    const { result } = renderHook(() => useChangeRoleStatus(), { wrapper });

    result.current.mutate({ roleId: 5, action: 'unblock' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error).toMatchObject({ code: 'role_already_active' });
  });
});
