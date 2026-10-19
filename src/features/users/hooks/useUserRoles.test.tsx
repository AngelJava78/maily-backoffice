import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { shouldRetryQuery } from '@/shared/api/retry';
import {
  ADMIN_AUTH0,
  createUsersDirectoryMock,
  defaultDirectory,
  directoryUser,
} from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { useUserRoles } from './useUserRoles';

function start(statusId = 1) {
  const base = defaultDirectory();
  const mock = createUsersDirectoryMock({
    ...base,
    users: [...base.users, directoryUser({ id: 121, statusId })],
  });
  mock.assign(121, 4);
  mock.assign(121, 6);
  return mock;
}

describe('useUserRoles', () => {
  it('gives the active roles of the user', async () => {
    start();
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });

    const { result } = renderHook(() => useUserRoles(121, { enabled: true }), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    expect(result.current.data?.map((role) => role.name)).toEqual(['Doctor', 'Marketing']);
  });

  it('asks nothing while it is not enabled', async () => {
    const mock = start();
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });

    const { result } = renderHook(() => useUserRoles(121, { enabled: false }), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mock.requestCount).toBe(0);
  });

  it('keeps the 409 of a user that is not active as the error and does not retry it', async () => {
    const mock = start(2);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: shouldRetryQuery, retryDelay: 0 } },
    });
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0, queryClient });

    const { result } = renderHook(() => useUserRoles(121, { enabled: true }), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toMatchObject({ status: 409, code: 'user_blocked' });
    expect(mock.requestCount).toBe(1);
  });
});
