import { describe, expect, it } from 'vitest';

import { callSubscriptions } from '@/test/subscriptionsClient';

import { createUsersDirectoryMock } from '../usersDirectory';
import { createSubscriptionsCatalogMock, defaultCatalog } from './index';

function setup() {
  const directory = createUsersDirectoryMock();
  const catalog = createSubscriptionsCatalogMock({ directory, initial: defaultCatalog() });
  return { directory, catalog };
}

const change = (id: number | string, body: unknown) =>
  callSubscriptions(`/api/v1/subscriptions/${id}/status`, { method: 'PATCH', body });

describe('PATCH /api/v1/subscriptions/{id}/status', () => {
  it.each([
    [2, 2, 'Inactiva'],
    [2, 3, 'Bloqueada'],
    [5, 1, 'Activa'],
    [5, 3, 'Bloqueada'],
    [7, 1, 'Activa'],
    [7, 2, 'Inactiva'],
  ])('takes the subscription %i to the status %i in any direction', async (id, statusId, name) => {
    setup();

    expect(await change(id, { status_id: statusId })).toMatchObject({
      status: 200,
      body: { id, status: { id: statusId, name } },
    });
  });

  it('changes the status of a subscription with clinics too (Básico has 2)', async () => {
    setup();

    expect(await change(1, { status_id: 2 })).toMatchObject({
      status: 200,
      body: { status: { id: 2 }, clinics_count: 2 },
    });
  });

  it('takes a subscription out of a status added by hand', async () => {
    const { catalog } = setup();
    catalog.addStatus(5, 'En revisión');
    catalog.setStatus(2, 5);

    expect(await change(2, { status_id: 1 })).toMatchObject({
      status: 200,
      body: { status: { id: 1 } },
    });
  });

  it('refuses the status the subscription already has', async () => {
    setup();

    expect(await change(2, { status_id: 1 })).toMatchObject({
      status: 409,
      body: { code: 'subscription_status_unchanged' },
    });
  });

  it.each([
    ['the deleted status', { status_id: 4 }],
    ['an unknown status', { status_id: 0 }],
    ['a status written as a text', { status_id: '2' }],
    ['no status', {}],
    ['another field', { status_id: 2, name: 'Otro' }],
  ])('refuses %s', async (_case, body) => {
    setup();

    expect(await change(2, body)).toMatchObject({
      status: 422,
      body: { code: 'validation_error' },
    });
  });

  it('answers 404 for a deleted subscription', async () => {
    const { catalog } = setup();
    catalog.remove(2);

    expect(await change(2, { status_id: 2 })).toMatchObject({
      status: 404,
      body: { code: 'subscription_not_found' },
    });
  });

  it('refuses someone without subscriptions:update before validating', async () => {
    const { directory } = setup();
    directory.revoke('Administrator', 'subscriptions:update');

    expect(await change(2, { status_id: 4 })).toMatchObject({
      status: 403,
      body: { code: 'permission_denied' },
    });
  });
});
