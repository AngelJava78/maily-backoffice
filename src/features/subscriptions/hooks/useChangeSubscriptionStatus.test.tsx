import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import { createSubscriptionsCatalogMock } from '@/test/handlers/subscriptionsCatalog';
import { ADMIN_AUTH0, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { subscriptionKeys } from './subscriptionKeys';
import { useChangeSubscriptionStatus } from './useChangeSubscriptionStatus';
import { useSubscription } from './useSubscription';

const PATH = '/api/v1/subscriptions/2/status';

function setup() {
  const catalog = createSubscriptionsCatalogMock({ directory: createUsersDirectoryMock() });
  const queryClient = createQueryClient();
  const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0, queryClient });
  const { result } = renderHook(
    () => ({ detail: useSubscription(2), change: useChangeSubscriptionStatus(2) }),
    { wrapper },
  );
  return { catalog, queryClient, result };
}

describe('useChangeSubscriptionStatus', () => {
  it('sends the new status and keeps the subscription it gets, marking the catalog as stale', async () => {
    const { catalog, queryClient, result } = setup();
    await waitFor(() => {
      expect(result.current.detail.data).toBeDefined();
    });
    queryClient.setQueryData(subscriptionKeys.catalog(), []);

    act(() => {
      result.current.change.mutate({ statusId: 2 });
    });

    await waitFor(() => {
      expect(result.current.change.isSuccess).toBe(true);
    });
    expect(catalog.requestsTo('PATCH', PATH)[0]?.body).toEqual({ status_id: 2 });
    expect(result.current.detail.data?.status).toEqual({ id: 2, name: 'Inactiva' });
    expect(queryClient.getQueryState(subscriptionKeys.catalog())?.isInvalidated).toBe(true);
  });

  it.each([
    [
      'another person already gave it that status',
      (catalog: ReturnType<typeof setup>['catalog']) => {
        catalog.setStatus(2, 2);
      },
      409,
    ],
    [
      'another person deleted it',
      (catalog: ReturnType<typeof setup>['catalog']) => {
        catalog.remove(2);
      },
      404,
    ],
  ])(
    'asks for the subscription again when %s, and stays pending until it was asked',
    async (_case, meanwhile, status) => {
      const { catalog, result } = setup();
      await waitFor(() => {
        expect(result.current.detail.data).toBeDefined();
      });
      meanwhile(catalog);

      act(() => {
        result.current.change.mutate({ statusId: 2 });
      });

      await waitFor(() => {
        expect(result.current.change.isError).toBe(true);
      });
      expect(result.current.change.error).toMatchObject({ status });
      // By the time the failure is told, the detail was asked for again.
      expect(catalog.requestsTo('GET', '/api/v1/subscriptions/2')).toHaveLength(2);
    },
  );

  it('is never retried on its own', async () => {
    const { catalog, result } = setup();
    catalog.failNext({ method: 'PATCH', path: PATH, status: 500, code: 'internal_error' });

    act(() => {
      result.current.change.mutate({ statusId: 3 });
    });

    await waitFor(() => {
      expect(result.current.change.isError).toBe(true);
    });
    expect(catalog.requestsTo('PATCH', PATH)).toHaveLength(1);
    expect(catalog.state.find(2)?.statusId).toBe(1);
  });
});
