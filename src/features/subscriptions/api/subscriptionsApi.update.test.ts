import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { subscriptionDto } from '@/test/factories';
import { server } from '@/test/server';
import { createSubscriptionsClient, errorBody, subscriptionsUrl } from '@/test/subscriptionsClient';

import { updateSubscription } from './subscriptionsApi';

const DETAIL_URL = subscriptionsUrl('/api/v1/subscriptions/7');

describe('updateSubscription', () => {
  it('sends only the data it is given, as a PATCH, and gives the subscription as it is now', async () => {
    const seen: { method: string; body: unknown }[] = [];
    server.use(
      http.patch(DETAIL_URL, async ({ request }) => {
        seen.push({ method: request.method, body: await request.json() });
        return HttpResponse.json(subscriptionDto({ id: 7, monthly_price: '5000.00' }));
      }),
    );
    const { client } = createSubscriptionsClient();

    const updated = await updateSubscription(client, 7, { monthly_price: '5000' });

    expect(seen).toEqual([{ method: 'PATCH', body: { monthly_price: '5000' } }]);
    expect(updated).toMatchObject({ id: 7, monthlyPrice: '5000.00' });
  });

  it('sends null to take the description away', async () => {
    let received: unknown;
    server.use(
      http.patch(DETAIL_URL, async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(subscriptionDto({ id: 7, description: null }));
      }),
    );
    const { client } = createSubscriptionsClient();

    await updateSubscription(client, 7, { description: null });

    expect(received).toEqual({ description: null });
  });

  it.each([
    [404, 'subscription_not_found'],
    [409, 'subscription_name_already_exists'],
    [422, 'validation_error'],
  ])('passes a %i %s on as an ApiError', async (status, code) => {
    server.use(http.patch(DETAIL_URL, () => HttpResponse.json(errorBody(code), { status })));
    const { client } = createSubscriptionsClient();

    const failure: unknown = await updateSubscription(client, 7, { name: 'Otro' }).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status, code });
  });
});
