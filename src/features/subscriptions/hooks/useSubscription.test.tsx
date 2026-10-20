import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { shouldRetryQuery } from '@/shared/api/retry';
import { createSubscriptionsCatalogMock } from '@/test/handlers/subscriptionsCatalog';
import { ADMIN_AUTH0, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { useSubscription } from './useSubscription';

function start() {
  return createSubscriptionsCatalogMock({ directory: createUsersDirectoryMock() });
}

describe('useSubscription', () => {
  it('gives the subscription, whatever its status', async () => {
    start();
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });

    const blocked = renderHook(() => useSubscription(7), { wrapper });
    const active = renderHook(() => useSubscription(2), { wrapper });

    await waitFor(() => {
      expect(blocked.result.current.data).toMatchObject({
        id: 7,
        name: 'Suspendido',
        status: { id: 3, name: 'Bloqueada' },
      });
      expect(active.result.current.data).toMatchObject({ id: 2, name: 'Pro' });
    });
  });

  it('keeps the 404 as the error of the query and does not retry it', async () => {
    const catalog = start();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: shouldRetryQuery, retryDelay: 0 } },
    });
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0, queryClient });

    const { result } = renderHook(() => useSubscription(99), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error).toMatchObject({ status: 404, code: 'subscription_not_found' });
    expect(catalog.requestCount).toBe(1);
  });

  it('takes a subscription deleted by another person as one that is not found', async () => {
    const catalog = start();
    catalog.remove(2);
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });

    const { result } = renderHook(() => useSubscription(2), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toMatchObject({ status: 404, code: 'subscription_not_found' });
  });
});
