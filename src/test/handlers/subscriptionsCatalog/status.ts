import { http, HttpResponse, type HttpHandler } from 'msw';

import { SUBSCRIPTIONS_API_BASE_URL } from './baseUrl';
import type { Handle } from './handle';
import type { CatalogModel } from './model';
import { readSubscriptionId, validateStatusChange } from './validation';

/**
 * The change of status of a subscription (S5), with `subscriptions:update`: to Activa, Inactiva or
 * Bloqueada, in any direction and with clinics or without them.
 */
export function statusHandlers(model: CatalogModel, handle: Handle): HttpHandler[] {
  return [
    http.patch(
      `${SUBSCRIPTIONS_API_BASE_URL}/api/v1/subscriptions/:subscriptionId/status`,
      handle('subscriptions:update', ({ params, body }) => {
        const id = readSubscriptionId(params);
        const statusId = validateStatusChange(body);
        return HttpResponse.json(model.toDto(model.changeStatus(id, statusId)));
      }),
    ),
  ];
}
