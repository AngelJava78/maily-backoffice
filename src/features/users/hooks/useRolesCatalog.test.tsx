import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  ADMIN_AUTH0,
  createUsersDirectoryMock,
  directoryRole,
} from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { useRolesCatalog } from './useRolesCatalog';

function start() {
  const mock = createUsersDirectoryMock();
  mock.addRole({ id: 9, name: 'Zeta', statusId: 2 });
  return mock;
}

describe('useRolesCatalog', () => {
  it('gives the active roles, sorted by name', async () => {
    start();
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });

    const { result } = renderHook(() => useRolesCatalog({ enabled: true }), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    expect(result.current.data?.map((role) => role.name)).toEqual([
      'Administrator',
      'Billing',
      'Developer',
      'Doctor',
      'Marketing',
      'Owner',
      'Support',
    ]);
  });

  it('asks nothing while it is not enabled', async () => {
    const mock = start();
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });

    const { result } = renderHook(() => useRolesCatalog({ enabled: false }), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mock.requestCount).toBe(0);
  });

  it('is fresh for five minutes: reading it again does not ask the service again', async () => {
    const mock = start();
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });
    const first = renderHook(() => useRolesCatalog({ enabled: true }), { wrapper });
    await waitFor(() => {
      expect(first.result.current.data).toBeDefined();
    });
    first.unmount();

    const second = renderHook(() => useRolesCatalog({ enabled: true }), { wrapper });

    expect(second.result.current.data).toBeDefined();
    expect(second.result.current.isStale).toBe(false);
    expect(mock.requestsTo('GET', '/api/v1/roles')).toHaveLength(1);
  });

  it('keeps a 403 as the error of the query', async () => {
    const mock = start();
    mock.revoke('Administrator', 'roles:read');
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });

    const { result } = renderHook(() => useRolesCatalog({ enabled: true }), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toMatchObject({ status: 403, code: 'permission_denied' });
  });

  it('follows the roles of the service: a role that is gone is not offered any more', async () => {
    const mock = createUsersDirectoryMock();
    mock.addRole(directoryRole({ id: 12, name: 'Auditor' }));
    mock.setRoleStatus(12, 2);
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });

    const { result } = renderHook(() => useRolesCatalog({ enabled: true }), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    expect(result.current.data?.some((role) => role.name === 'Auditor')).toBe(false);
  });
});
