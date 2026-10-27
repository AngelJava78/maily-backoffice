import { describe, expect, it } from 'vitest';

import { callSubscriptions } from '@/test/subscriptionsClient';

import { createUsersDirectoryMock } from '../usersDirectory';
import { createSubscriptionsCatalogMock, defaultCatalog } from './index';

function setup() {
  const directory = createUsersDirectoryMock();
  const catalog = createSubscriptionsCatalogMock({ directory, initial: defaultCatalog() });
  return { directory, catalog };
}

const update = (id: number | string, body: unknown) =>
  callSubscriptions(`/api/v1/subscriptions/${id}`, { method: 'PATCH', body });

describe('PATCH /api/v1/subscriptions/{id}', () => {
  it('changes only the data it receives and moves the modification date forward', async () => {
    const { catalog } = setup();
    const before = catalog.state.find(2);

    const answer = await update(2, { monthly_price: '5000' });

    expect(answer).toMatchObject({
      status: 200,
      body: {
        id: 2,
        name: 'Pro',
        description: 'Para clínicas en crecimiento.',
        monthly_price: '5000.00',
        other_features: before?.otherFeatures,
      },
    });
    expect(catalog.state.find(2)?.updatedAt).not.toBe(before?.updatedAt);
  });

  it('replaces the whole list of other features and takes the description away with null', async () => {
    setup();

    expect(await update(2, { other_features: ['Uno'], description: null })).toMatchObject({
      status: 200,
      body: { other_features: ['Uno'], description: null },
    });
  });

  it('replaces the whole set of module_keys, with the same catalog and dependency rules as create', async () => {
    setup();

    expect(await update(2, { module_keys: ['reminders'] })).toMatchObject({
      status: 409,
      body: { code: 'subscription_module_prerequisite_missing' },
    });
    expect(await update(2, { module_keys: ['scheduling', 'reminders'] })).toMatchObject({
      status: 200,
      body: { module_keys: ['patients', 'reminders', 'scheduling'] },
    });
  });

  it.each([1, 2, 99])(
    'refuses subscription_type_id %i, with its own immutability message, never the generic one',
    async (subscriptionTypeId) => {
      const { catalog } = setup();
      const before = catalog.state.find(2);

      const answer = await update(2, { subscription_type_id: subscriptionTypeId });

      expect(answer).toMatchObject({
        status: 422,
        body: {
          code: 'validation_error',
          errors: [
            {
              field: 'subscription_type_id',
              message: 'El tipo de suscripción no puede modificarse una vez creada.',
            },
          ],
        },
      });
      expect(catalog.state.find(2)).toEqual(before);
    },
  );

  it('refuses an empty body', async () => {
    setup();

    expect(await update(2, {})).toMatchObject({
      status: 422,
      body: {
        errors: [{ field: 'body', message: 'Hay que enviar al menos un dato para modificar.' }],
      },
    });
  });

  it.each(['status', 'id', 'clinics_count', 'status_id'])(
    'refuses %s, which is not changed here',
    async (field) => {
      setup();

      expect(await update(2, { [field]: 2 })).toMatchObject({
        status: 422,
        body: { errors: [{ field, message: `El campo «${field}» no está permitido.` }] },
      });
    },
  );

  it.each([
    ['a null name', { name: null }, 'name'],
    ['an empty name', { name: '  ' }, 'name'],
    ['a null price', { monthly_price: null }, 'monthly_price'],
    [
      '21 other features',
      { other_features: Array.from({ length: 21 }, (_, n) => `E${n}`) },
      'other_features',
    ],
  ])('refuses %s', async (_case, body, field) => {
    setup();

    expect(await update(2, body)).toMatchObject({
      status: 422,
      body: { errors: [{ field }] },
    });
  });

  it('refuses the name of another subscription that is not deleted, and accepts the own one in another case', async () => {
    setup();

    expect(await update(3, { name: 'PRO' })).toMatchObject({
      status: 409,
      body: { code: 'subscription_name_already_exists' },
    });
    expect(await update(2, { name: 'PRO' })).toMatchObject({ status: 200, body: { name: 'PRO' } });
  });

  it('answers 404 for a deleted subscription and one that does not exist', async () => {
    const { catalog } = setup();
    catalog.remove(2);

    for (const id of [2, 99, '2147483648']) {
      expect(await update(id, { name: 'Otro' })).toMatchObject({
        status: 404,
        body: { code: 'subscription_not_found' },
      });
    }
  });

  it('refuses someone without subscriptions:update before validating or looking for it', async () => {
    const { directory } = setup();
    directory.revoke('Administrator', 'subscriptions:update');

    for (const [id, body] of [
      [2, { name: 'Otro' }],
      [99, {}],
    ] as const) {
      expect(await update(id, body)).toMatchObject({
        status: 403,
        body: { code: 'permission_denied' },
      });
    }
  });

  it('lets another person change and delete the data without rules, through the helpers', () => {
    const { catalog } = setup();

    catalog.update(2, { name: 'Premium', monthly_price: '1' });
    expect(catalog.state.find(2)).toMatchObject({ name: 'Premium', monthlyPrice: '1.00' });

    catalog.remove(2);
    expect(catalog.state.find(2)).toBeUndefined();
  });
});
