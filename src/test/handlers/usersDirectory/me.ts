import { http, HttpResponse, type HttpHandler } from 'msw';

import { USERS_API_BASE_URL } from '../usersService';
import type { Handle } from './handle';
import type { DirectoryModel } from './model';

/**
 * `GET /api/v1/authorization/me`: who the person is and the active roles with their permissions.
 * It asks for no permission: it is how the operator finds out which ones they have.
 */
export function meHandlers(model: DirectoryModel, handle: Handle): HttpHandler[] {
  return [
    http.get(
      `${USERS_API_BASE_URL}/api/v1/authorization/me`,
      handle(null, ({ sub }) =>
        HttpResponse.json(model.accessOf(sub), { headers: { 'Cache-Control': 'no-store' } }),
      ),
    ),
  ];
}
