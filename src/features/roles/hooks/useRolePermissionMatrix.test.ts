import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { auth0User } from '@/test/auth0Double';
import {
  createRolesCatalogMock,
  richClinicModulesScenario,
  rolesCatalogScenario,
} from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { useRolePermissionMatrix } from './useRolePermissionMatrix';

const ADMIN_SUB = 'auth0|roles-admin';

function start(scenario: ReturnType<typeof rolesCatalogScenario> = rolesCatalogScenario()) {
  const users = createUsersDirectoryMock(scenario.directory);
  return createRolesCatalogMock(users.state, scenario);
}

function wrapperFor() {
  return createWrapper({ auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) } });
}

describe('useRolePermissionMatrix', () => {
  it('builds the matrix once the modules and permissions catalogs load', async () => {
    start();
    const { wrapper } = wrapperFor();

    const { result } = renderHook(() => useRolePermissionMatrix(1, new Set([1, 5])), { wrapper });

    await waitFor(() => {
      expect(result.current.matrix).toBeDefined();
    });
    expect(result.current.matrix).toHaveLength(4);
    const usersRow = result.current.matrix?.find((row) => row.module.key === 'users');
    expect(usersRow?.cells.read).toEqual({ permissionId: 1, granted: true });
  });

  it('includes the Sistema modules too, even with no Clínica modules yet (asymmetric rule, FR-001)', async () => {
    start();
    const { wrapper } = wrapperFor();

    const { result } = renderHook(() => useRolePermissionMatrix(2, new Set()), { wrapper });

    await waitFor(() => {
      expect(result.current.matrix).toHaveLength(4);
    });
    const usersRow = result.current.matrix?.find((row) => row.module.key === 'users');
    expect(usersRow).toBeDefined();
  });

  it('builds a rich Clínica matrix combined with the Sistema modules when both exist', async () => {
    start(richClinicModulesScenario());
    const { wrapper } = wrapperFor();

    const { result } = renderHook(() => useRolePermissionMatrix(2, new Set()), { wrapper });

    await waitFor(() => {
      expect(result.current.matrix?.length).toBe(7);
    });
    const reminders = result.current.matrix?.find((row) => row.module.key === 'reminders');
    expect(Object.keys(reminders?.cells ?? {}).sort()).toEqual(['read', 'update']);
    const usersRow = result.current.matrix?.find((row) => row.module.key === 'users');
    expect(usersRow).toBeDefined();
  });

  it('never includes a Clínica module for a Sistema role, even when Clínica modules exist (FR-002)', async () => {
    start(richClinicModulesScenario());
    const { wrapper } = wrapperFor();

    const { result } = renderHook(() => useRolePermissionMatrix(1, new Set()), { wrapper });

    await waitFor(() => {
      expect(result.current.matrix).toHaveLength(4);
    });
    expect(result.current.matrix?.some((row) => row.module.type.id === 2)).toBe(false);
  });

  it('gives no matrix, without loading or erroring, while there is no granted set yet', () => {
    start();
    const { wrapper } = wrapperFor();

    const { result } = renderHook(() => useRolePermissionMatrix(1, undefined), { wrapper });

    expect(result.current).toMatchObject({ matrix: undefined, isLoading: false, isError: false });
  });

  it('surfaces a catalog failure as its own error, independent of the role', async () => {
    const mock = start();
    mock.failAll(500, 'internal_error');
    const { wrapper } = wrapperFor();

    const { result } = renderHook(() => useRolePermissionMatrix(1, new Set()), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.matrix).toBeUndefined();
  });
});
