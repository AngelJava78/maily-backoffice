import { http, HttpResponse, type HttpHandler } from 'msw';

import { USERS_API_BASE_URL } from '../usersService';
import type { IdentityFailures } from './behaviors';
import type { Handle } from './handle';
import { checkAccountToDisable, checkAccountToEnable } from './identity';
import { toUserDto, type DirectoryModel } from './model';
import { readUserId } from './validation';

/**
 * U6 and U9: `DELETE /api/v1/users/{id}` (users:delete) and `POST /api/v1/users/{id}/reactivate`
 * (users:update). The deletion is logical: the user keeps its data and its roles, and its email
 * stays reserved. As with blocking, the status is checked first, then the access account is
 * touched, and only if that works does the user change.
 */
export function removeHandlers(
  model: DirectoryModel,
  handle: Handle,
  identity: IdentityFailures,
): HttpHandler[] {
  return [
    http.delete(
      `${USERS_API_BASE_URL}/api/v1/users/:userId`,
      handle('users:delete', ({ params }) => {
        model.deleteUser(readUserId(params), () => {
          checkAccountToDisable(identity);
        });
        return new HttpResponse(null, { status: 204 });
      }),
    ),
    http.post(
      `${USERS_API_BASE_URL}/api/v1/users/:userId/reactivate`,
      handle('users:update', ({ params }) => {
        const user = model.reactivateUser(readUserId(params), (current) => {
          checkAccountToEnable(identity, current.id);
        });
        return HttpResponse.json(toUserDto(user));
      }),
    ),
  ];
}
