import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import { createSubscriptionsCatalogMock } from '@/test/handlers/subscriptionsCatalog';
import { ADMIN_AUTH0, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { subscriptionKeys } from './subscriptionKeys';
import { useDeleteSubscription } from './useDeleteSubscription';
import { useSubscription } from './useSubscription';
import { useSubscriptionCatalog } from './useSubscriptionCatalog';

const PATH = '/api/v1/subscriptions/2';

function setup(id = 2) {
  const catalog = createSubscriptionsCatalogMock({ directory: createUsersDirectoryMock() });
  const queryClient = createQueryClient();
  const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0, queryClient });
  const { result } = renderHook(
    () => ({
      list: useSubscriptionCatalog(),
      detail: useSubscription(id),
      remove: useDeleteSubscription(id),
    }),
    { wrapper },
  );
  return { catalog, queryClient, result };
}

async function loaded(result: ReturnType<typeof setup>['result']) {
  await waitFor(() => {
    expect(result.current.list.data).toBeDefined();
    expect(result.current.detail.data).toBeDefined();
  });
}

describe('useDeleteSubscription', () => {
  it('deletes it and ends once the catalog was asked for again, without it (at most REFRESH_WAIT_MS)', async () => {
    const { catalog, result } = setup();
    await loaded(result);

    act(() => {
      result.current.remove.mutate();
    });

    await waitFor(() => {
      expect(result.current.remove.isSuccess).toBe(true);
    });
    expect(catalog.requestsTo('DELETE', PATH)).toHaveLength(1);
    expect(result.current.list.data?.some((subscription) => subscription.id === 2)).toBe(false);
  });

  it('forgets the detail only when it is asked to, once the person left it', async () => {
    const { queryClient, result } = setup();
    await loaded(result);

    act(() => {
      result.current.remove.mutate();
    });
    await waitFor(() => {
      expect(result.current.remove.isSuccess).toBe(true);
    });
    expect(queryClient.getQueryData(subscriptionKeys.detail(2))).toBeDefined();

    act(() => {
      result.current.remove.forget();
    });

    expect(queryClient.getQueryState(subscriptionKeys.detail(2))).toBeUndefined();
  });

  it.each([
    [
      'clinics were assigned to it meanwhile',
      (catalog: ReturnType<typeof setup>['catalog']) => {
        catalog.setClinics(2, 1);
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
  ])('asks for it again when %s, before the failure is told', async (_case, meanwhile, status) => {
    const { catalog, result } = setup();
    await loaded(result);
    meanwhile(catalog);

    act(() => {
      result.current.remove.mutate();
    });

    await waitFor(() => {
      expect(result.current.remove.isError).toBe(true);
    });
    expect(result.current.remove.error).toMatchObject({ status });
    expect(catalog.requestsTo('GET', PATH)).toHaveLength(2);
  });

  it('changes nothing in the cache when the clinics cannot be checked', async () => {
    const { catalog, queryClient, result } = setup();
    await loaded(result);
    catalog.clinics.unavailable();

    act(() => {
      result.current.remove.mutate();
    });

    await waitFor(() => {
      expect(result.current.remove.isError).toBe(true);
    });
    expect(result.current.remove.error).toMatchObject({
      status: 503,
      code: 'clinics_check_unavailable',
    });
    expect(queryClient.getQueryState(subscriptionKeys.detail(2))?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(subscriptionKeys.catalog())?.isInvalidated).toBe(false);
    expect(catalog.requestsTo('DELETE', PATH)).toHaveLength(1);
  });

  it('is never retried on its own', async () => {
    const { catalog, result } = setup();
    await loaded(result);
    catalog.failNext({ method: 'DELETE', path: PATH, status: 500, code: 'internal_error' });

    act(() => {
      result.current.remove.mutate();
    });

    await waitFor(() => {
      expect(result.current.remove.isError).toBe(true);
    });
    expect(catalog.requestsTo('DELETE', PATH)).toHaveLength(1);
  });
});
