import { http, HttpResponse, type HttpHandler } from 'msw';

import { USERS_API_BASE_URL } from '../usersService';
import type { Handle } from './handle';
import type { DirectoryModel } from './model';
import { readRoleId, readUserId } from './validation';

/** U12: `DELETE /api/v1/users/{id}/roles/{roleId}`, which takes one role away (users:update). */
export function unassignRoleHandlers(model: DirectoryModel, handle: Handle): HttpHandler[] {
  return [
    http.delete(
      `${USERS_API_BASE_URL}/api/v1/users/:userId/roles/:roleId`,
      handle('users:update', ({ params }) => {
        model.disassociateRole(readUserId(params), readRoleId(params));
        return new HttpResponse(null, { status: 204 });
      }),
    ),
  ];
}
