import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import { ApiError } from '@/shared/api/ApiError';
import { shouldRetryQuery } from '@/shared/api/retry';
import { createSubscriptionsCatalogMock } from '@/test/handlers/subscriptionsCatalog';
import { ADMIN_AUTH0, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { subscriptionKeys } from './subscriptionKeys';
import { useSubscriptionCatalog } from './useSubscriptionCatalog';

const CATALOG_PATH = '/api/v1/subscriptions';

function start() {
  const directory = createUsersDirectoryMock();
  const catalog = createSubscriptionsCatalogMock({ directory });
  return { directory, catalog };
}

describe('useSubscriptionCatalog', () => {
  it('gives the whole catalog in the fixed order of the list', async () => {
    start();
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });

    const { result } = renderHook(() => useSubscriptionCatalog(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    expect(result.current.data?.map(({ name }) => name)).toEqual([
      'Enterprise',
      'Básico',
      'Pro',
      'Premium',
      'Legacy full',
      'Solo',
      'Suspendido',
    ]);
  });

  it('asks the API once per mount, whatever page is shown', async () => {
    const { catalog } = start();
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });

    const { result, rerender } = renderHook(() => useSubscriptionCatalog(), { wrapper });
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    rerender();

    expect(catalog.requestsTo('GET', CATALOG_PATH)).toHaveLength(1);
  });

  it('retries a failure of the API at most twice, then ends in error', async () => {
    const { catalog } = start();
    catalog.failAll(500);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: shouldRetryQuery, retryDelay: 0 } },
    });
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0, queryClient });

    const { result } = renderHook(() => useSubscriptionCatalog(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toMatchObject({ status: 500, code: 'internal_error' });
    expect(catalog.requestsTo('GET', CATALOG_PATH)).toHaveLength(3);
  });

  it('tells a lack of permission to the application without closing the session', async () => {
    const { directory, catalog } = start();
    directory.revoke('Administrator', 'subscriptions:read');
    const onForbidden = vi.fn<(error: ApiError) => void>();
    const { wrapper, auth0, onSessionExpired } = createWrapper({
      auth0: ADMIN_AUTH0,
      queryClient: createQueryClient({ onForbidden }),
    });

    const { result } = renderHook(() => useSubscriptionCatalog(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(onForbidden).toHaveBeenCalledOnce();
    expect(onForbidden.mock.calls[0]?.[0]).toMatchObject({
      status: 403,
      code: 'permission_denied',
    });
    expect(auth0.logout).not.toHaveBeenCalled();
    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(catalog.requestsTo('GET', CATALOG_PATH)).toHaveLength(1);
  });

  it('cancels the request when the query is cancelled', async () => {
    const { catalog } = start();
    catalog.hang();
    const { wrapper, queryClient } = createWrapper({ auth0: ADMIN_AUTH0 });

    renderHook(() => useSubscriptionCatalog(), { wrapper });
    await waitFor(() => {
      expect(catalog.requestCount).toBe(1);
    });
    await queryClient.cancelQueries({ queryKey: subscriptionKeys.catalog() });

    await waitFor(() => {
      expect(catalog.requests[0]?.aborted).toBe(true);
    });
  });
});
