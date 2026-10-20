import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import { createSubscriptionsCatalogMock } from '@/test/handlers/subscriptionsCatalog';
import { ADMIN_AUTH0, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { subscriptionKeys } from './subscriptionKeys';
import { useSubscription } from './useSubscription';
import { useUpdateSubscription } from './useUpdateSubscription';

const PATH = '/api/v1/subscriptions/2';

function setup() {
  const catalog = createSubscriptionsCatalogMock({ directory: createUsersDirectoryMock() });
  const queryClient = createQueryClient();
  const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0, queryClient });
  const hook = renderHook(() => useUpdateSubscription(2), { wrapper });
  return { catalog, queryClient, ...hook };
}

describe('useUpdateSubscription', () => {
  it('sends the body it is given and keeps the subscription it gets, marking the catalog as stale', async () => {
    const { catalog, queryClient, result } = setup();
    queryClient.setQueryData(subscriptionKeys.catalog(), []);

    act(() => {
      result.current.mutate({ body: { monthly_price: '5000' } });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(catalog.requestsTo('PATCH', PATH)[0]?.body).toEqual({ monthly_price: '5000' });
    expect(queryClient.getQueryData(subscriptionKeys.detail(2))).toMatchObject({
      id: 2,
      monthlyPrice: '5000.00',
    });
    expect(queryClient.getQueryState(subscriptionKeys.catalog())?.isInvalidated).toBe(true);
  });

  it('asks for the subscription again when it is gone, and stays pending until it was asked', async () => {
    const catalog = createSubscriptionsCatalogMock({ directory: createUsersDirectoryMock() });
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0, queryClient: createQueryClient() });
    // The detail is on screen while the form is open, so its new query is waited for.
    const { result } = renderHook(
      () => ({ detail: useSubscription(2), update: useUpdateSubscription(2) }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.detail.data).toBeDefined();
    });
    catalog.remove(2);

    act(() => {
      result.current.update.mutate({ body: { name: 'Otro' } });
    });

    await waitFor(() => {
      expect(result.current.update.isError).toBe(true);
    });
    expect(result.current.update.error).toMatchObject({
      status: 404,
      code: 'subscription_not_found',
    });
    // By the time the failure is told, the detail was asked for again and says it is gone.
    expect(catalog.requestsTo('GET', PATH)).toHaveLength(2);
    expect(result.current.detail.error).toMatchObject({ status: 404 });
  });

  it('is never retried on its own', async () => {
    const { catalog, result } = setup();
    catalog.failNext({ method: 'PATCH', path: PATH, status: 500, code: 'internal_error' });

    act(() => {
      result.current.mutate({ body: { name: 'Otro' } });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(catalog.requestsTo('PATCH', PATH)).toHaveLength(1);
    expect(catalog.state.find(2)?.name).toBe('Pro');
  });
});
