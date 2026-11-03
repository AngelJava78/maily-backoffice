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

/** The list that `/users` opens: Todos and Activos. */
const DEFAULT_FILTERS = { type: 'all', status: 'active' } as const;

function startWithUsers(count: number) {
  const base = defaultDirectory();
  return createUsersDirectoryMock({ ...base, users: [...base.users, ...makeUsers(count)] });
}

describe('useUsersPage', () => {
  it('gives the page asked for, with the total and the number of pages', async () => {
    startWithUsers(29);
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });

    const { result } = renderHook(
      () => useUsersPage({ page: 2, pageSize: 10, ...DEFAULT_FILTERS }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    expect(result.current.data).toMatchObject({ total: 30, page: 2, pageSize: 10, pages: 3 });
    expect(result.current.data?.items).toHaveLength(10);
  });

  it.each([
    [{ type: 'all', status: 'active' } as const, '?page=1&page_size=10&status_id=1'],
    [
      { type: 'system', status: 'active' } as const,
      '?page=1&page_size=10&status_id=1&role_type_id=1',
    ],
    [{ type: 'all', status: 'blocked' } as const, '?page=1&page_size=10&status_id=2'],
    [
      { type: 'clinic', status: 'blocked' } as const,
      '?page=1&page_size=10&status_id=2&role_type_id=2',
    ],
  ])('asks the service, for the filters %j, with %s (feature 026)', async (filters, search) => {
    const mock = startWithUsers(3);
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });

    const { result } = renderHook(() => useUsersPage({ page: 1, pageSize: 10, ...filters }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mock.requestsTo('GET', '/api/v1/users').map((request) => request.search)).toEqual([
      search,
    ]);
  });

  it('keeps the previous page on screen while the next one loads', async () => {
    const mock = startWithUsers(29);
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });
    const { result, rerender } = renderHook(
      ({ page }) => useUsersPage({ page, pageSize: 10, ...DEFAULT_FILTERS }),
      {
        wrapper,
        initialProps: { page: 1 },
      },
    );
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

  it('asks for the page again every time the list opens, showing the one kept meanwhile (research D5)', async () => {
    const mock = startWithUsers(3);
    // The client of the application, which keeps a page fresh for 30 s.
    const queryClient = createQueryClient();
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0, queryClient });
    const params = { page: 1, pageSize: 10, ...DEFAULT_FILTERS };
    const first = renderHook(() => useUsersPage(params), { wrapper });
    await waitFor(() => {
      expect(first.result.current.isSuccess).toBe(true);
    });
    first.unmount();
    const release = mock.defer();

    const again = renderHook(() => useUsersPage(params), { wrapper });

    // Within the time the cache keeps a page fresh, it is asked again anyway...
    await waitFor(() => {
      expect(mock.requestsTo('GET', '/api/v1/users')).toHaveLength(2);
    });
    // ...while the one kept stays on screen.
    expect(again.result.current.data?.total).toBe(4);
    release();
    await waitFor(() => {
      expect(again.result.current.isFetching).toBe(false);
    });
    queryClient.clear();
  });

  it('retries a failing service at most twice and then reports the error (constitution IV)', async () => {
    const mock = startWithUsers(5);
    mock.failAll(500);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: shouldRetryQuery, retryDelay: 0 } },
    });
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0, queryClient });

    const { result } = renderHook(
      () => useUsersPage({ page: 1, pageSize: 10, ...DEFAULT_FILTERS }),
      { wrapper },
    );

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

    const { result } = renderHook(
      () => useUsersPage({ page: 1, pageSize: 10, ...DEFAULT_FILTERS }),
      { wrapper },
    );

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
    const { unmount } = renderHook(
      () => useUsersPage({ page: 1, pageSize: 10, ...DEFAULT_FILTERS }),
      { wrapper },
    );
    await waitFor(() => {
      expect(mock.requestCount).toBe(1);
    });

    unmount();

    await waitFor(() => {
      expect(mock.abortedCount).toBe(1);
    });
  });
});
