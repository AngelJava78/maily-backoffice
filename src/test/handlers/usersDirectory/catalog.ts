import { http, HttpResponse, type HttpHandler } from 'msw';

import { USERS_API_BASE_URL } from '../usersService';
import type { Handle } from './handle';
import type { DirectoryModel } from './model';

/** R1: `GET /api/v1/roles`, the active roles that can be assigned, sorted by name (roles:read). */
export function catalogHandlers(model: DirectoryModel, handle: Handle): HttpHandler[] {
  return [
    http.get(
      `${USERS_API_BASE_URL}/api/v1/roles`,
      handle('roles:read', () => HttpResponse.json(model.listActiveRoles())),
    ),
  ];
}
