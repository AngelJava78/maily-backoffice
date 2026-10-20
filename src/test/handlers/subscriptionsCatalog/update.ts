import { http, HttpResponse, type HttpHandler } from 'msw';

import { SUBSCRIPTIONS_API_BASE_URL } from './baseUrl';
import type { Handle } from './handle';
import type { CatalogModel } from './model';
import { readSubscriptionId, validateUpdate } from './validation';

/**
 * The edition of a subscription (S4), with `subscriptions:update`: it changes only the data it
 * receives, at least one, and a subscription may keep its own name in another case.
 */
export function updateHandlers(model: CatalogModel, handle: Handle): HttpHandler[] {
  return [
    http.patch(
      `${SUBSCRIPTIONS_API_BASE_URL}/api/v1/subscriptions/:subscriptionId`,
      handle('subscriptions:update', ({ params, body }) => {
        const id = readSubscriptionId(params);
        const changes = validateUpdate(body);
        return HttpResponse.json(model.toDto(model.update(id, changes)));
      }),
    ),
  ];
}
