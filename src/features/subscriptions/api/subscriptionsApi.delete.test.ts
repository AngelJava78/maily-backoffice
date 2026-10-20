import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { server } from '@/test/server';
import { createSubscriptionsClient, errorBody, subscriptionsUrl } from '@/test/subscriptionsClient';

import { deleteSubscription } from './subscriptionsApi';

const DETAIL_URL = subscriptionsUrl('/api/v1/subscriptions/7');

describe('deleteSubscription', () => {
  it('asks to delete it with a DELETE without body, and gives nothing back for the 204', async () => {
    const seen: { method: string; hasBody: boolean; authorization: string | null }[] = [];
    server.use(
      http.delete(DETAIL_URL, async ({ request }) => {
        seen.push({
          method: request.method,
          hasBody: (await request.text()) !== '',
          authorization: request.headers.get('authorization'),
        });
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { client, authorization } = createSubscriptionsClient();

    await expect(deleteSubscription(client, 7)).resolves.toBeUndefined();

    expect(seen).toEqual([{ method: 'DELETE', hasBody: false, authorization }]);
  });

  it.each([
    [409, 'subscription_has_clinics'],
    [503, 'clinics_check_unavailable'],
    [404, 'subscription_not_found'],
  ])('passes a %i %s on as an ApiError', async (status, code) => {
    server.use(http.delete(DETAIL_URL, () => HttpResponse.json(errorBody(code), { status })));
    const { client } = createSubscriptionsClient();

    const failure: unknown = await deleteSubscription(client, 7).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status, code });
  });
});
