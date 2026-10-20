import { http, HttpResponse, type HttpHandler } from 'msw';

import { SUBSCRIPTIONS_API_BASE_URL } from './baseUrl';
import type { Handle } from './handle';
import { notFoundError, type CatalogModel } from './model';
import { readSubscriptionId } from './validation';

/**
 * The reads of the subscriptions API (S1 and S2): the whole catalog and one subscription. Both ask
 * for `subscriptions:read`, which is checked before the id of the address.
 */
export function readHandlers(model: CatalogModel, handle: Handle): HttpHandler[] {
  const subscriptions = `${SUBSCRIPTIONS_API_BASE_URL}/api/v1/subscriptions`;

  return [
    http.get(
      subscriptions,
      handle('subscriptions:read', () =>
        HttpResponse.json(model.list().map((subscription) => model.toDto(subscription))),
      ),
    ),

    http.get(
      `${subscriptions}/:subscriptionId`,
      handle('subscriptions:read', ({ params }) => {
        const id = readSubscriptionId(params);
        const subscription = model.find(id);
        if (subscription === undefined) {
          throw notFoundError(id);
        }
        return HttpResponse.json(model.toDto(subscription));
      }),
    ),
  ];
}
