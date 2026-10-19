import { http, HttpResponse, type HttpHandler } from 'msw';

import { USERS_API_BASE_URL } from '../usersService';
import type { Handle } from './handle';
import type { DirectoryModel } from './model';
import { issue, readUserId, validationError } from './validation';

/** The `role_id` of the body: a whole number from 1, or a 422 that names it. */
function readBodyRoleId(body: unknown): number {
  const roleId =
    typeof body === 'object' && body !== null && 'role_id' in body ? body.role_id : undefined;
  if (typeof roleId !== 'number' || !Number.isInteger(roleId) || roleId < 1) {
    throw validationError([issue('role_id')]);
  }
  return roleId;
}

/** U11: `POST /api/v1/users/{id}/roles`, which gives one role to an active user (users:update). */
export function assignRoleHandlers(model: DirectoryModel, handle: Handle): HttpHandler[] {
  return [
    http.post(
      `${USERS_API_BASE_URL}/api/v1/users/:userId/roles`,
      handle('users:update', ({ params, body }) => {
        const userId = readUserId(params);
        const roleId = readBodyRoleId(body);
        const role = model.associateRole(userId, roleId);
        return HttpResponse.json(
          { user_id: userId, role: { id: role.id, name: role.name } },
          { status: 201 },
        );
      }),
    ),
  ];
}
