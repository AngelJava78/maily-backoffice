import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { subscriptionDto } from '@/test/factories';
import { server } from '@/test/server';
import { createSubscriptionsClient, errorBody, subscriptionsUrl } from '@/test/subscriptionsClient';

import { changeSubscriptionStatus } from './subscriptionsApi';

const STATUS_URL = subscriptionsUrl('/api/v1/subscriptions/7/status');

describe('changeSubscriptionStatus', () => {
  it('sends only the new status as a PATCH, and gives the subscription with it', async () => {
    const seen: { method: string; body: unknown }[] = [];
    server.use(
      http.patch(STATUS_URL, async ({ request }) => {
        seen.push({ method: request.method, body: await request.json() });
        return HttpResponse.json(subscriptionDto({ id: 7, status: { id: 2, name: 'Inactiva' } }));
      }),
    );
    const { client } = createSubscriptionsClient();

    const changed = await changeSubscriptionStatus(client, 7, 2);

    expect(seen).toEqual([{ method: 'PATCH', body: { status_id: 2 } }]);
    expect(changed).toMatchObject({ id: 7, status: { id: 2, name: 'Inactiva' } });
  });

  it.each([
    [409, 'subscription_status_unchanged'],
    [404, 'subscription_not_found'],
  ])('passes a %i %s on as an ApiError', async (status, code) => {
    server.use(http.patch(STATUS_URL, () => HttpResponse.json(errorBody(code), { status })));
    const { client } = createSubscriptionsClient();

    const failure: unknown = await changeSubscriptionStatus(client, 7, 2).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status, code });
  });
});
