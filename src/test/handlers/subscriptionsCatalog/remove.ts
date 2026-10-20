import { http, HttpResponse, type HttpHandler } from 'msw';

import { SUBSCRIPTIONS_API_BASE_URL } from './baseUrl';
import type { Handle } from './handle';
import type { CatalogModel } from './model';
import { readSubscriptionId } from './validation';

/**
 * The deletion of a subscription (S6), with `subscriptions:delete`: only without clinics and while
 * the clinics can be checked. The answer has no body.
 */
export function removeHandlers(model: CatalogModel, handle: Handle): HttpHandler[] {
  return [
    http.delete(
      `${SUBSCRIPTIONS_API_BASE_URL}/api/v1/subscriptions/:subscriptionId`,
      handle('subscriptions:delete', ({ params }) => {
        model.remove(readSubscriptionId(params));
        return new HttpResponse(null, { status: 204 });
      }),
    ),
  ];
}
