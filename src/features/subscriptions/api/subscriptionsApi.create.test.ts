import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { subscriptionDto } from '@/test/factories';
import { server } from '@/test/server';
import { createSubscriptionsClient, errorBody, subscriptionsUrl } from '@/test/subscriptionsClient';

import type { CreateSubscriptionBody } from '../schemas/subscriptionForm';
import { createSubscription } from './subscriptionsApi';

const LIST_URL = subscriptionsUrl('/api/v1/subscriptions');

const BODY: CreateSubscriptionBody = {
  name: 'Clínica Plus',
  description: 'Para clínicas medianas.',
  monthly_price: '3200.5',
  annual_price: '32000.5',
  trial_days: 14,
  self_service: true,
  module_keys: ['patients', 'scheduling'],
  other_features: ['Hasta 3 consultorios', 'Agenda'],
  consulting_rooms_limit: 3,
  doctors_limit: 4,
  assistants_limit: 2,
  new_patients_per_year_limit: 8000,
};

describe('createSubscription', () => {
  it('sends exactly the body it is given as JSON and gives the subscription created', async () => {
    const seen: { method: string; contentType: string | null; body: unknown }[] = [];
    server.use(
      http.post(LIST_URL, async ({ request }) => {
        seen.push({
          method: request.method,
          contentType: request.headers.get('content-type'),
          body: await request.json(),
        });
        return HttpResponse.json(
          subscriptionDto({
            id: 21,
            name: 'Clínica Plus',
            monthly_price: '3200.50',
            other_features: ['Hasta 3 consultorios', 'Agenda'],
            clinics_count: 0,
          }),
          { status: 201, headers: { Location: '/api/v1/subscriptions/21' } },
        );
      }),
    );
    const { client } = createSubscriptionsClient();

    const created = await createSubscription(client, BODY);

    expect(seen).toEqual([{ method: 'POST', contentType: 'application/json', body: BODY }]);
    for (const readOnly of ['id', 'status', 'status_id', 'clinics_count', 'created_at']) {
      expect(seen[0]?.body).not.toHaveProperty(readOnly);
    }
    expect(created).toMatchObject({
      id: 21,
      name: 'Clínica Plus',
      monthlyPrice: '3200.50',
      status: { id: 1 },
      clinicsCount: 0,
    });
  });

  it('passes a name in use on as an ApiError with its code', async () => {
    server.use(
      http.post(LIST_URL, () =>
        HttpResponse.json(errorBody('subscription_name_already_exists'), { status: 409 }),
      ),
    );
    const { client } = createSubscriptionsClient();

    const failure: unknown = await createSubscription(client, BODY).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 409, code: 'subscription_name_already_exists' });
  });

  it('passes a 422 validation_error on as an ApiError with its fields', async () => {
    server.use(
      http.post(LIST_URL, () =>
        HttpResponse.json(
          errorBody('validation_error', [{ field: 'other_features', message: 'Demasiados.' }]),
          { status: 422 },
        ),
      ),
    );
    const { client } = createSubscriptionsClient();

    const failure: unknown = await createSubscription(client, BODY).catch(
      (error: unknown) => error,
    );

    expect(failure).toMatchObject({
      status: 422,
      code: 'validation_error',
      fieldErrors: [{ field: 'other_features', message: 'Demasiados.' }],
    });
  });

  it('reports an answer that does not match the contract as a contract failure', async () => {
    server.use(http.post(LIST_URL, () => HttpResponse.json({ id: 21 }, { status: 201 })));
    const { client } = createSubscriptionsClient();

    const failure: unknown = await createSubscription(client, BODY).catch(
      (error: unknown) => error,
    );

    expect(failure).toMatchObject({ kind: 'contract' });
  });
});
