import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import { shouldRetryQuery } from '@/shared/api/retry';
import {
  ADMIN_AUTH0,
  createUsersDirectoryMock,
  defaultDirectory,
  makeUsers,
} from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { useUsersPage } from './useUsersPage';

function startWithUsers(count: number) {
  const base = defaultDirectory();
  return createUsersDirectoryMock({ ...base, users: [...base.users, ...makeUsers(count)] });
}

describe('useUsersPage', () => {
  it('gives the page asked for, with the total and the number of pages', async () => {
    startWithUsers(29);
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });

    const { result } = renderHook(() => useUsersPage({ page: 2, pageSize: 10 }), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    expect(result.current.data).toMatchObject({ total: 30, page: 2, pageSize: 10, pages: 3 });
    expect(result.current.data?.items).toHaveLength(10);
  });

  it('keeps the previous page on screen while the next one loads', async () => {
    const mock = startWithUsers(29);
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });
    const { result, rerender } = renderHook(({ page }) => useUsersPage({ page, pageSize: 10 }), {
      wrapper,
      initialProps: { page: 1 },
    });
    await waitFor(() => {
      expect(result.current.data?.page).toBe(1);
    });
    const release = mock.defer();

    rerender({ page: 2 });

    await waitFor(() => {
      expect(result.current.isPlaceholderData).toBe(true);
    });
    expect(result.current.data?.page).toBe(1);
    release();
    await waitFor(() => {
      expect(result.current.data?.page).toBe(2);
    });
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it('retries a failing service at most twice and then reports the error (constitution IV)', async () => {
    const mock = startWithUsers(5);
    mock.failAll(500);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: shouldRetryQuery, retryDelay: 0 } },
    });
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0, queryClient });

    const { result } = renderHook(() => useUsersPage({ page: 1, pageSize: 10 }), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mock.requestCount).toBe(3);
  });

  it('reports a 403 without closing the session, so the global notice can tell (FR-014 of 001)', async () => {
    const mock = startWithUsers(5);
    mock.revoke('Administrator', 'users:read');
    const onForbidden = vi.fn<() => void>();
    const queryClient = createQueryClient({ onForbidden });
    const { wrapper, onSessionExpired } = createWrapper({ auth0: ADMIN_AUTH0, queryClient });

    const { result } = renderHook(() => useUsersPage({ page: 1, pageSize: 10 }), { wrapper });

    await waitFor(() => {
      expect(onForbidden).toHaveBeenCalledOnce();
    });
    expect(result.current.error).toMatchObject({ status: 403, code: 'permission_denied' });
    expect(onSessionExpired).not.toHaveBeenCalled();
    queryClient.clear();
  });

  it('cancels the request in flight when nobody is watching the query any more', async () => {
    const mock = startWithUsers(5);
    mock.hang();
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });
    const { unmount } = renderHook(() => useUsersPage({ page: 1, pageSize: 10 }), { wrapper });
    await waitFor(() => {
      expect(mock.requestCount).toBe(1);
    });

    unmount();

    await waitFor(() => {
      expect(mock.abortedCount).toBe(1);
    });
  });
});
