import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { shouldRetryQuery } from '@/shared/api/retry';
import {
  ADMIN_AUTH0,
  createUsersDirectoryMock,
  defaultDirectory,
  directoryUser,
} from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { useUser } from './useUser';

function start() {
  const base = defaultDirectory();
  return createUsersDirectoryMock({
    ...base,
    users: [
      ...base.users,
      directoryUser({ id: 121, firstName: 'Ana', paternalLastName: 'Pérez' }),
      directoryUser({ id: 122, statusId: 3 }),
    ],
  });
}

describe('useUser', () => {
  it('gives the user, whatever its status', async () => {
    start();
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });

    const active = renderHook(() => useUser(121), { wrapper });
    const deleted = renderHook(() => useUser(122), { wrapper });

    await waitFor(() => {
      expect(active.result.current.data).toMatchObject({ id: 121, firstName: 'Ana' });
      expect(deleted.result.current.data).toMatchObject({ id: 122, status: { id: 3 } });
    });
  });

  it('keeps the 404 as the error of the query and does not retry it', async () => {
    const mock = start();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: shouldRetryQuery, retryDelay: 0 } },
    });
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0, queryClient });

    const { result } = renderHook(() => useUser(999), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error).toMatchObject({ status: 404, code: 'user_not_found' });
    expect(mock.requestCount).toBe(1);
  });
});
