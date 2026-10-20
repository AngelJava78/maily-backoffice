import { http, HttpResponse, type HttpHandler } from 'msw';

import { SUBSCRIPTIONS_API_BASE_URL } from './baseUrl';
import type { Handle } from './handle';
import type { CatalogModel } from './model';
import { validateCreate } from './validation';

/**
 * The creation of a subscription (S3), with `subscriptions:write`: it is born active and without
 * clinics, and the answer carries its address.
 */
export function createHandlers(model: CatalogModel, handle: Handle): HttpHandler[] {
  return [
    http.post(
      `${SUBSCRIPTIONS_API_BASE_URL}/api/v1/subscriptions`,
      handle('subscriptions:write', ({ body }) => {
        const created = model.create(validateCreate(body));
        return HttpResponse.json(model.toDto(created), {
          status: 201,
          headers: { Location: `/api/v1/subscriptions/${created.id}` },
        });
      }),
    ),
  ];
}
