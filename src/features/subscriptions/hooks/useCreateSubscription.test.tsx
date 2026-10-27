import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import { createSubscriptionsCatalogMock } from '@/test/handlers/subscriptionsCatalog';
import { ADMIN_AUTH0, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { REQUIRED_MODULE_KEY } from '../schemas/clinicModuleCatalog';
import type { SubscriptionFormValues } from '../schemas/subscriptionForm';
import { subscriptionKeys } from './subscriptionKeys';
import { useCreateSubscription } from './useCreateSubscription';

const PATH = '/api/v1/subscriptions';

const VALUES: SubscriptionFormValues = {
  name: ' Clínica Plus ',
  description: '',
  subscriptionTypeId: 1,
  monthlyPrice: '3200.5',
  annualPrice: '32000.5',
  trialDays: '14',
  selfService: true,
  moduleKeys: new Set([REQUIRED_MODULE_KEY, 'scheduling']),
  consultingRoomsLimit: '3',
  doctorsLimit: '4',
  assistantsLimit: '2',
  newPatientsPerYearLimit: '8000',
  otherFeatures: [{ value: 'Hasta 3 consultorios ' }],
};

function setup() {
  const catalog = createSubscriptionsCatalogMock({ directory: createUsersDirectoryMock() });
  const queryClient = createQueryClient();
  const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0, queryClient });
  const hook = renderHook(() => useCreateSubscription(), { wrapper });
  return { catalog, queryClient, ...hook };
}

describe('useCreateSubscription', () => {
  it('sends the data of the form, trimmed and without what is only read, and gives the subscription', async () => {
    const { catalog, result } = setup();

    act(() => {
      result.current.mutate({ values: VALUES });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(catalog.requestsTo('POST', PATH)[0]?.body).toEqual({
      name: 'Clínica Plus',
      subscription_type_id: 1,
      monthly_price: '3200.5',
      annual_price: '32000.5',
      trial_days: 14,
      self_service: true,
      module_keys: ['patients', 'scheduling'],
      other_features: ['Hasta 3 consultorios'],
      consulting_rooms_limit: 3,
      doctors_limit: 4,
      assistants_limit: 2,
      new_patients_per_year_limit: 8000,
    });
    expect(result.current.data).toMatchObject({
      id: 8,
      name: 'Clínica Plus',
      monthlyPrice: '3200.50',
      status: { id: 1 },
      clinicsCount: 0,
    });
  });

  it('keeps the subscription it gets in the cache and marks the catalog as stale', async () => {
    const { queryClient, result } = setup();
    queryClient.setQueryData(subscriptionKeys.catalog(), []);

    act(() => {
      result.current.mutate({ values: VALUES });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(queryClient.getQueryData(subscriptionKeys.detail(8))).toMatchObject({
      id: 8,
      name: 'Clínica Plus',
    });
    expect(queryClient.getQueryState(subscriptionKeys.catalog())?.isInvalidated).toBe(true);
  });

  it('is never retried on its own, not even after a failure of the API', async () => {
    const { catalog, result } = setup();
    catalog.failNext({ method: 'POST', path: PATH, status: 500, code: 'internal_error' });

    act(() => {
      result.current.mutate({ values: VALUES });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toMatchObject({ status: 500 });
    expect(catalog.requestsTo('POST', PATH)).toHaveLength(1);
    expect(catalog.state.list()).toHaveLength(7);
  });

  it('keeps nothing in the cache when the API refuses the name', async () => {
    const { queryClient, result } = setup();

    act(() => {
      result.current.mutate({ values: { ...VALUES, name: 'pro' } });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toMatchObject({ code: 'subscription_name_already_exists' });
    expect(queryClient.getQueryData(subscriptionKeys.detail(8))).toBeUndefined();
  });
});
