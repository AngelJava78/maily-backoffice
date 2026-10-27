import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { subscriptionDto } from '@/test/factories';
import { server } from '@/test/server';
import { createSubscriptionsClient, errorBody, subscriptionsUrl } from '@/test/subscriptionsClient';

import { getSubscription, listSubscriptions } from './subscriptionsApi';

const LIST_URL = subscriptionsUrl('/api/v1/subscriptions');
const DETAIL_URL = subscriptionsUrl('/api/v1/subscriptions/7');

interface Seen {
  method: string;
  path: string;
  authorization: string | null;
}

/** Answers `url` with `respond` and keeps what the request looked like. */
function serve(url: string, respond: () => Response) {
  const seen: Seen[] = [];
  server.use(
    http.get(url, ({ request }) => {
      seen.push({
        method: request.method,
        path: new URL(request.url).pathname,
        authorization: request.headers.get('authorization'),
      });
      return respond();
    }),
  );
  return seen;
}

describe('listSubscriptions', () => {
  it('asks for the whole catalog with the token and gives it in camelCase', async () => {
    const seen = serve(LIST_URL, () =>
      HttpResponse.json([subscriptionDto(), subscriptionDto({ id: 3, name: 'Premium' })]),
    );
    const { client, authorization } = createSubscriptionsClient();

    const catalog = await listSubscriptions(client);

    expect(seen).toEqual([
      { method: 'GET', path: '/proxy/subscriptions/api/v1/subscriptions', authorization },
    ]);
    expect(catalog).toHaveLength(2);
    expect(catalog[0]).toEqual({
      id: 2,
      name: 'Pro',
      description: 'Para clínicas en crecimiento.',
      subscriptionType: { id: 1, name: 'Individual' },
      monthlyPrice: '4500.00',
      annualPrice: '45000.00',
      trialDays: 14,
      selfService: true,
      moduleKeys: [
        'clinical_record_templates',
        'clinical_records',
        'patients',
        'prescriptions',
        'reminders',
        'scheduling',
      ],
      otherFeatures: ['Soporte por correo y WhatsApp', 'Capacitación inicial en línea'],
      consultingRoomsLimit: 2,
      doctorsLimit: 3,
      assistantsLimit: 2,
      newPatientsPerYearLimit: 15000,
      status: { id: 1, name: 'Activa' },
      clinicsCount: 0,
      createdAt: '2026-10-17T15:00:00Z',
      updatedAt: '2026-10-17T15:00:00Z',
    });
  });

  it('drops a deleted subscription and takes clinics that are missing or null as not available', async () => {
    const withoutClinics = Object.fromEntries(
      Object.entries(subscriptionDto({ id: 4 })).filter(([key]) => key !== 'clinics_count'),
    );
    serve(LIST_URL, () =>
      HttpResponse.json([
        subscriptionDto({ id: 1, clinics_count: null }),
        withoutClinics,
        subscriptionDto({ id: 9, status: { id: 4, name: 'Eliminada' } }),
      ]),
    );
    const { client } = createSubscriptionsClient();

    const catalog = await listSubscriptions(client);

    expect(catalog.map(({ id, clinicsCount }) => ({ id, clinicsCount }))).toEqual([
      { id: 1, clinicsCount: null },
      { id: 4, clinicsCount: null },
    ]);
  });

  it('reports an answer that does not match the contract as a contract failure', async () => {
    serve(LIST_URL, () => HttpResponse.json([subscriptionDto({ monthly_price: '4500' })]));
    const { client } = createSubscriptionsClient();

    const failure: unknown = await listSubscriptions(client).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ kind: 'contract', isRetryable: false });
  });

  it('can be cancelled with the signal it receives', async () => {
    server.use(http.get(LIST_URL, () => new Promise<Response>(() => undefined)));
    const { client } = createSubscriptionsClient();
    const controller = new AbortController();
    const assertion = expect(
      listSubscriptions(client, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();

    await assertion;
  });
});

describe('getSubscription', () => {
  it('asks for the subscription by its id and gives it in camelCase', async () => {
    const seen = serve(DETAIL_URL, () => HttpResponse.json(subscriptionDto({ id: 7 })));
    const { client, authorization } = createSubscriptionsClient();

    const subscription = await getSubscription(client, 7);

    expect(seen).toEqual([
      { method: 'GET', path: '/proxy/subscriptions/api/v1/subscriptions/7', authorization },
    ]);
    expect(subscription).toMatchObject({ id: 7, name: 'Pro', monthlyPrice: '4500.00' });
  });

  it('passes a 404 on as an ApiError with its code', async () => {
    serve(DETAIL_URL, () =>
      HttpResponse.json(errorBody('subscription_not_found'), { status: 404 }),
    );
    const { client } = createSubscriptionsClient();

    const failure: unknown = await getSubscription(client, 7).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 404, code: 'subscription_not_found' });
  });

  it('takes a deleted subscription, which the API never returns, as one that was not found', async () => {
    serve(DETAIL_URL, () =>
      HttpResponse.json(subscriptionDto({ id: 7, status: { id: 4, name: 'Eliminada' } })),
    );
    const { client } = createSubscriptionsClient();

    const failure: unknown = await getSubscription(client, 7).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 404, code: 'subscription_not_found' });
  });

  it('can be cancelled with the signal it receives', async () => {
    server.use(http.get(DETAIL_URL, () => new Promise<Response>(() => undefined)));
    const { client } = createSubscriptionsClient();
    const controller = new AbortController();
    const assertion = expect(
      getSubscription(client, 7, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();

    await assertion;
  });
});
