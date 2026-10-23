import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { useSaveRoleDetail } from './useSaveRoleDetail';

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

describe('useSaveRoleDetail', () => {
  it('associates and disassociates only the permissions that changed', async () => {
    const { roles } = start();
    const { wrapper } = wrapperFor();
    const { result } = renderHook(() => useSaveRoleDetail(), { wrapper });

    // Developer (role 2) starts with no permissions.
    result.current.mutate({
      roleId: 2,
      nameChanges: {},
      toAssociate: [1, 2],
      toDisassociate: [],
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.failedPermissionIds).toEqual([]);
    expect(roles.state.listPermissions().filter((p) => [1, 2].includes(p.id))).toHaveLength(2);
  });

  it('updates the name and/or description before touching permissions', async () => {
    start();
    const { wrapper } = wrapperFor();
    const { result } = renderHook(() => useSaveRoleDetail(), { wrapper });

    result.current.mutate({
      roleId: 2,
      nameChanges: { name: 'Developer General' },
      toAssociate: [],
      toDisassociate: [],
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('rejects, applying nothing to permissions, when the name update fails', async () => {
    start();
    const { wrapper } = wrapperFor();
    const { result } = renderHook(() => useSaveRoleDetail(), { wrapper });

    result.current.mutate({
      // "Owner" already exists (role 6): renaming Developer to it conflicts.
      roleId: 2,
      nameChanges: { name: 'Owner' },
      toAssociate: [1],
      toDisassociate: [],
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toMatchObject({ code: 'role_name_already_exists' });
  });

  it('lists the permissions that failed, without rejecting, when some associations fail', async () => {
    const { roles } = start();
    roles.failNext({
      method: 'POST',
      path: /\/roles\/2\/permissions$/,
      status: 500,
      code: 'internal_error',
    });
    const { wrapper } = wrapperFor();
    const { result } = renderHook(() => useSaveRoleDetail(), { wrapper });

    result.current.mutate({ roleId: 2, nameChanges: {}, toAssociate: [1], toDisassociate: [] });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.failedPermissionIds).toEqual([1]);
  });

  it('treats "already associated"/"not associated" as success, not a failure to report', async () => {
    start();
    const { wrapper } = wrapperFor();
    const { result } = renderHook(() => useSaveRoleDetail(), { wrapper });

    // Administrator (role 1) already has permission 1 (users:read): associating it again
    // conflicts with 409 role_permission_already_associated. Developer (role 2) never had
    // permission 1: disassociating it conflicts with 409 role_permission_not_associated.
    result.current.mutate({ roleId: 1, nameChanges: {}, toAssociate: [1], toDisassociate: [] });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.failedPermissionIds).toEqual([]);

    const { result: result2 } = renderHook(() => useSaveRoleDetail(), { wrapper });
    result2.current.mutate({ roleId: 2, nameChanges: {}, toAssociate: [], toDisassociate: [1] });

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });
    expect(result2.current.data?.failedPermissionIds).toEqual([]);
  });
});
