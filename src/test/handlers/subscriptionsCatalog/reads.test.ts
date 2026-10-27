import { describe, expect, it } from 'vitest';

import { callSubscriptions } from '@/test/subscriptionsClient';

import { createUsersDirectoryMock } from '../usersDirectory';
import { catalogSubscription, createSubscriptionsCatalogMock, defaultCatalog } from './index';

function idsOf(body: unknown): unknown {
  return Array.isArray(body)
    ? body.map((item: unknown) =>
        typeof item === 'object' && item !== null && 'id' in item ? item.id : undefined,
      )
    : undefined;
}

function setup(initial = defaultCatalog()) {
  const directory = createUsersDirectoryMock();
  const catalog = createSubscriptionsCatalogMock({ directory, initial });
  return { directory, catalog };
}

describe('GET /api/v1/subscriptions', () => {
  it('lists what is not deleted in the order of the API: by creation date and, on a tie, by id', async () => {
    setup({
      subscriptions: [
        catalogSubscription({ id: 3, createdAt: '2026-10-02T00:00:00Z' }),
        catalogSubscription({ id: 2, createdAt: '2026-10-01T00:00:00Z' }),
        catalogSubscription({ id: 1, createdAt: '2026-10-02T00:00:00Z' }),
        catalogSubscription({ id: 4, statusId: 4 }),
        catalogSubscription({ id: 5, statusId: 5, createdAt: '2026-10-03T00:00:00Z' }),
      ],
      statuses: [{ id: 5, name: 'En revisión' }],
    });

    const answer = await callSubscriptions('/api/v1/subscriptions');

    expect(answer.status).toBe(200);
    expect(idsOf(answer.body)).toEqual([2, 1, 3, 5]);
  });

  it('gives each subscription as the API does, with its clinics', async () => {
    setup();

    const answer = await callSubscriptions('/api/v1/subscriptions');

    expect(Array.isArray(answer.body) && answer.body[0]).toEqual({
      id: 1,
      name: 'Básico',
      description: null,
      subscription_type: { id: 1, name: 'Individual' },
      clinics_limit: 1,
      monthly_price: '1500.00',
      annual_price: '1000.00',
      trial_days: 0,
      self_service: false,
      module_keys: ['patients'],
      other_features: ['1 consultorio', 'Hasta 3 usuarios', 'Agenda y pacientes'],
      consulting_rooms_limit: 1,
      doctors_limit: 1,
      assistants_limit: 0,
      new_patients_per_year_limit: 0,
      status: { id: 1, name: 'Activa' },
      clinics_count: 2,
      created_at: '2026-10-17T15:01:00.000Z',
      updated_at: '2026-10-17T15:01:00.000Z',
    });
  });

  it('gives null clinics while the clinics API does not answer', async () => {
    const { catalog } = setup();
    catalog.clinics.unavailable();

    const answer = await callSubscriptions('/api/v1/subscriptions');

    expect(
      Array.isArray(answer.body) &&
        answer.body.every(
          (item: unknown) =>
            typeof item === 'object' &&
            item !== null &&
            'clinics_count' in item &&
            item.clinics_count === null,
        ),
    ).toBe(true);
  });

  it('gives an empty list when there are no subscriptions', async () => {
    setup({ subscriptions: [] });

    expect(await callSubscriptions('/api/v1/subscriptions')).toMatchObject({
      status: 200,
      body: [],
    });
  });

  it('refuses someone without subscriptions:read', async () => {
    const { directory } = setup();
    directory.revoke('Administrator', 'subscriptions:read');

    expect(await callSubscriptions('/api/v1/subscriptions')).toMatchObject({
      status: 403,
      body: { code: 'permission_denied' },
    });
  });
});

describe('GET /api/v1/subscriptions/{id}', () => {
  it('gives the subscription', async () => {
    setup();

    expect(await callSubscriptions('/api/v1/subscriptions/2')).toMatchObject({
      status: 200,
      body: { id: 2, name: 'Pro', monthly_price: '4500.00', clinics_count: 0 },
    });
  });

  it.each([
    ['a deleted one', '/api/v1/subscriptions/8'],
    ['one that does not exist', '/api/v1/subscriptions/99'],
    ['an id bigger than the largest', '/api/v1/subscriptions/2147483648'],
  ])('answers 404 for %s', async (_case, path) => {
    const { catalog } = setup();
    catalog.addSubscription(catalogSubscription({ id: 8, statusId: 4 }));

    expect(await callSubscriptions(path)).toMatchObject({
      status: 404,
      body: { code: 'subscription_not_found' },
    });
  });

  it.each(['abc', '0', '-1', '1.5'])(
    'answers 422 for the id %j, which is not a whole positive number',
    async (id) => {
      setup();

      expect(await callSubscriptions(`/api/v1/subscriptions/${id}`)).toMatchObject({
        status: 422,
        body: {
          code: 'validation_error',
          errors: [
            {
              field: 'subscription_id',
              message: 'El identificador de la suscripción debe ser un número entero positivo.',
            },
          ],
        },
      });
    },
  );

  it('refuses someone without subscriptions:read before validating or looking for it', async () => {
    const { directory } = setup();
    directory.revoke('Administrator', 'subscriptions:read');

    for (const path of [
      '/api/v1/subscriptions/2',
      '/api/v1/subscriptions/abc',
      '/api/v1/subscriptions/99',
    ]) {
      expect(await callSubscriptions(path)).toMatchObject({
        status: 403,
        body: { code: 'permission_denied' },
      });
    }
  });
});
