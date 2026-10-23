import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { useDeleteRole } from './useDeleteRole';
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

describe('useDeleteRole', () => {
  it('deletes the role', async () => {
    const { users } = start();
    const { wrapper } = wrapperFor();
    const { result } = renderHook(() => useDeleteRole(), { wrapper });

    result.current.mutate(5);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(users.state.findRole(5)?.statusId).not.toBe(1);
  });

  it('invalidates the roles list, so it no longer appears in the catalog', async () => {
    start();
    const { wrapper } = wrapperFor();
    const { result: list } = renderHook(() => useRolesCatalog(), { wrapper });
    await waitFor(() => {
      expect(list.current.data?.some((role) => role.id === 5)).toBe(true);
    });
    const { result: deletion } = renderHook(() => useDeleteRole(), { wrapper });

    deletion.current.mutate(5);

    await waitFor(() => {
      expect(list.current.data?.some((role) => role.id === 5)).toBe(false);
    });
  });

  it('rejects when the role no longer exists', async () => {
    start();
    const { wrapper } = wrapperFor();
    const { result } = renderHook(() => useDeleteRole(), { wrapper });

    result.current.mutate(999);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
