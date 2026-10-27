import { describe, expect, it } from 'vitest';

import { callSubscriptions } from '@/test/subscriptionsClient';

import { createUsersDirectoryMock } from '../usersDirectory';
import { createSubscriptionsCatalogMock, defaultCatalog } from './index';

function setup() {
  const directory = createUsersDirectoryMock();
  const catalog = createSubscriptionsCatalogMock({ directory, initial: defaultCatalog() });
  return { directory, catalog };
}

const remove = (id: number | string) =>
  callSubscriptions(`/api/v1/subscriptions/${id}`, { method: 'DELETE' });

describe('DELETE /api/v1/subscriptions/{id}', () => {
  it('deletes a subscription without clinics: it is not listed any more and is not found', async () => {
    setup();

    expect(await remove(2)).toMatchObject({ status: 204, body: null });

    const listed = await callSubscriptions('/api/v1/subscriptions');
    expect(
      Array.isArray(listed.body) &&
        listed.body.some(
          (item: unknown) =>
            typeof item === 'object' && item !== null && 'id' in item && item.id === 2,
        ),
    ).toBe(false);
    expect((await callSubscriptions('/api/v1/subscriptions/2')).status).toBe(404);
  });

  it('frees its name for a new subscription', async () => {
    setup();
    await remove(2);

    expect(
      (
        await callSubscriptions('/api/v1/subscriptions', {
          method: 'POST',
          body: {
            name: 'Pro',
            monthly_price: '1',
            subscription_type_id: 1,
            annual_price: '10',
            consulting_rooms_limit: 1,
            doctors_limit: 1,
            assistants_limit: 0,
            new_patients_per_year_limit: 0,
          },
        })
      ).status,
    ).toBe(201);
  });

  it('refuses a subscription with clinics, and changes nothing', async () => {
    const { catalog } = setup();

    expect(await remove(1)).toMatchObject({
      status: 409,
      body: { code: 'subscription_has_clinics' },
    });
    expect(catalog.state.find(1)).toBeDefined();
  });

  it('refuses when the clinics cannot be checked, and changes nothing', async () => {
    const { catalog } = setup();
    catalog.clinics.unavailable();

    expect(await remove(2)).toMatchObject({
      status: 503,
      body: { code: 'clinics_check_unavailable' },
    });
    expect(catalog.state.find(2)).toBeDefined();
  });

  it('answers 404 for a deleted subscription and one that does not exist', async () => {
    setup();
    await remove(2);

    for (const id of [2, 99]) {
      expect(await remove(id)).toMatchObject({
        status: 404,
        body: { code: 'subscription_not_found' },
      });
    }
  });

  it('refuses someone without subscriptions:delete before looking for it', async () => {
    const { directory } = setup();
    directory.revoke('Administrator', 'subscriptions:delete');

    for (const id of [2, 99]) {
      expect(await remove(id)).toMatchObject({
        status: 403,
        body: { code: 'permission_denied' },
      });
    }
  });
});
