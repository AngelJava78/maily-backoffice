import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { auth0User } from '@/test/auth0Double';
import { createWrapper } from '@/test/renderWithProviders';

import { useRoleDetail } from './useRoleDetail';

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

describe('useRoleDetail', () => {
  it('gives the role (from the roles catalog) and its granted permission ids', async () => {
    start();
    const { wrapper } = wrapperFor();

    const { result } = renderHook(() => useRoleDetail(1), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    expect(result.current.data?.role).toMatchObject({ id: 1, name: 'Administrator' });
    expect(result.current.data?.grantedPermissionIds.size).toBe(16);
  });

  it('is idle (no data, not loading, not error) while roleId is null', () => {
    start();
    const { wrapper } = wrapperFor();

    const { result } = renderHook(() => useRoleDetail(null), { wrapper });

    expect(result.current).toMatchObject({ data: undefined, isLoading: false, isError: false });
  });

  it('gives no data, without an error, for a role that is not in the catalog', async () => {
    start();
    const { wrapper } = wrapperFor();

    const { result } = renderHook(() => useRoleDetail(999), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isError).toBe(false);
  });

  it('surfaces a failure to load the permissions of an existing role as an error', async () => {
    const { roles } = start();
    roles.failNext({ method: 'GET', path: '/api/v1/roles/1/permissions', status: 500, code: 'internal_error' });
    const { wrapper } = wrapperFor();

    const { result } = renderHook(() => useRoleDetail(1), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
