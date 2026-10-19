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

import { useUserSearch } from './useUserSearch';
import { uuidOf } from '@/test/ids';

function start() {
  const base = defaultDirectory();
  return createUsersDirectoryMock({
    ...base,
    users: [
      ...base.users,
      directoryUser({ id: uuidOf(2), email: 'ana@clinica.com' }),
      directoryUser({ id: uuidOf(3), email: 'beto@clinica.com', statusId: 2 }),
    ],
  });
}

describe('useUserSearch', () => {
  it('finds the user with its status, also when it is blocked', async () => {
    start();
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });

    const { result } = renderHook(() => useUserSearch('beto@clinica.com'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).not.toBeUndefined();
    });
    expect(result.current.data).toMatchObject({
      id: uuidOf(3),
      status: { id: 2, name: 'Bloqueado' },
    });
  });

  it('gives null, without an error and without retrying, when nobody has that email (FR-018)', async () => {
    const mock = start();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: shouldRetryQuery, retryDelay: 0 } },
    });
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0, queryClient });

    const { result } = renderHook(() => useUserSearch('nadie@clinica.com'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
    expect(mock.requestCount).toBe(1);
  });

  it('does not ask anything while there is no email to search for', async () => {
    const mock = start();
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });

    const { result } = renderHook(() => useUserSearch(null), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mock.requestCount).toBe(0);
  });

  it('shares the query between the spellings of the same email: one request', async () => {
    const mock = start();
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });

    const { result } = renderHook(
      () => [useUserSearch(' ANA@clinica.com '), useUserSearch('ana@clinica.com')] as const,
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current[0].data).not.toBeUndefined();
      expect(result.current[1].data).not.toBeUndefined();
    });
    expect(mock.requestCount).toBe(1);
    expect(result.current[1].data).toMatchObject({ id: uuidOf(2) });
  });
});
