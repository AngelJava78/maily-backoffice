import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { useCreateRole } from './useCreateRole';

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

describe('useCreateRole', () => {
  it('creates a role with no permissions when nothing is copied (US2-1, FR-011)', async () => {
    start();
    const { wrapper } = wrapperFor();
    const { result } = renderHook(() => useCreateRole(), { wrapper });

    result.current.mutate({ name: 'Soporte Nivel 2', description: null, typeId: 1 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.role).toMatchObject({ name: 'Soporte Nivel 2', type: { id: 1 } });
    expect(result.current.data?.failedPermissionIds).toEqual([]);
  });

  it('copies every permission of the source role (US2-2, FR-012, research D7)', async () => {
    const { users, roles } = start();
    const { wrapper } = wrapperFor();
    const { result } = renderHook(() => useCreateRole(), { wrapper });

    // Administrator (role 1) has all 16 Sistema permissions.
    result.current.mutate({
      name: 'Soporte Nivel 2',
      description: null,
      typeId: 1,
      copyPermissionsFromRoleId: 1,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    const created = result.current.data?.role;
    expect(created).toBeDefined();
    expect(result.current.data?.failedPermissionIds).toEqual([]);
    const createdDirectoryRole =
      created === undefined ? undefined : users.state.findRole(created.id);
    expect(createdDirectoryRole).toBeDefined();
    expect(
      createdDirectoryRole === undefined
        ? []
        : roles.state.permissionsOfRole(createdDirectoryRole, 1),
    ).toHaveLength(16);
  });

  it('does not create anything when the name is already taken', async () => {
    start();
    const { wrapper } = wrapperFor();
    const { result } = renderHook(() => useCreateRole(), { wrapper });

    result.current.mutate({ name: 'Administrator', description: null, typeId: 1 });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toMatchObject({ code: 'role_name_already_exists' });
  });

  it('keeps the created role, with what did copy, when copying some permissions fails (FR-019)', async () => {
    const { roles } = start();
    roles.failNext({
      method: 'POST',
      path: /\/roles\/\d+\/permissions$/,
      status: 500,
      code: 'internal_error',
    });
    const { wrapper } = wrapperFor();
    const { result } = renderHook(() => useCreateRole(), { wrapper });

    result.current.mutate({
      name: 'Soporte Nivel 2',
      description: null,
      typeId: 1,
      copyPermissionsFromRoleId: 1,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.role.name).toBe('Soporte Nivel 2');
    expect(result.current.data?.failedPermissionIds).toHaveLength(1);
  });
});
