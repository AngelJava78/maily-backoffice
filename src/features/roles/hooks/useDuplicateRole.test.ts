import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { useDuplicateRole } from './useDuplicateRole';
import { useRolesCatalog } from './useRolesCatalog';

const ADMIN_SUB = 'auth0|roles-admin';

function start() {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock(scenario.directory);
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

function wrapperFor() {
  return createWrapper({ auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) } });
}

describe('useDuplicateRole', () => {
  it('creates a role of the same type, named "<original> (copia)", with the same permissions', async () => {
    const { users } = start();
    const { wrapper } = wrapperFor();
    const { result: list } = renderHook(() => useRolesCatalog(), { wrapper });
    await waitFor(() => {
      expect(list.current.data).toBeDefined();
    });
    const { result } = renderHook(() => useDuplicateRole(), { wrapper });

    result.current.mutate(1); // Administrator, 16/16 Sistema permissions.

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    const created = result.current.data?.role;
    expect(created).toMatchObject({ name: 'Administrator (copia)', type: { id: 1 } });
    expect(result.current.data?.failedPermissionIds).toEqual([]);
    const createdDirectoryRole =
      created === undefined ? undefined : users.state.findRole(created.id);
    expect(createdDirectoryRole?.permissions).toHaveLength(16);
  });

  it('avoids a name already taken by trying "(copia 2)", "(copia 3)"...', async () => {
    start();
    const { wrapper } = wrapperFor();
    const { result: list } = renderHook(() => useRolesCatalog(), { wrapper });
    await waitFor(() => {
      expect(list.current.data).toBeDefined();
    });
    const { result: first } = renderHook(() => useDuplicateRole(), { wrapper });
    first.current.mutate(1);
    await waitFor(() => {
      expect(first.current.isSuccess).toBe(true);
    });
    await waitFor(() => {
      expect(list.current.data?.some((role) => role.name === 'Administrator (copia)')).toBe(true);
    });

    const { result: second } = renderHook(() => useDuplicateRole(), { wrapper });
    second.current.mutate(1);

    await waitFor(() => {
      expect(second.current.isSuccess).toBe(true);
    });
    expect(second.current.data?.role.name).toBe('Administrator (copia 2)');
  });

  it('the duplicate is independent: changing its permissions does not touch the original', async () => {
    const { users } = start();
    const { wrapper } = wrapperFor();
    const { result: list } = renderHook(() => useRolesCatalog(), { wrapper });
    await waitFor(() => {
      expect(list.current.data).toBeDefined();
    });
    const { result } = renderHook(() => useDuplicateRole(), { wrapper });

    result.current.mutate(1);
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    const createdId = result.current.data?.role.id;
    expect(createdId).toBeDefined();

    users.revoke('Administrator (copia)', 'users:read');

    expect(users.state.findRole(1)?.permissions).toContain('users:read');
    expect(users.state.findRole(createdId ?? -1)?.permissions).not.toContain('users:read');
  });
});
