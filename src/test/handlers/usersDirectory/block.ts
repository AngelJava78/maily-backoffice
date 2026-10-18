import { http, HttpResponse, type HttpHandler } from 'msw';

import { USERS_API_BASE_URL } from '../usersService';
import type { IdentityFailures } from './behaviors';
import type { Handle } from './handle';
import { checkAccountToDisable, checkAccountToEnable } from './identity';
import { toUserDto, type DirectoryModel } from './model';
import { readUserId } from './validation';

/**
 * U7 and U8: `POST /api/v1/users/{id}/block` and `/unblock` (users:update). The status is checked
 * first, then the access account is touched, and only if that works does the user change: a user
 * whose account cannot be updated keeps its status.
 */
export function blockHandlers(
  model: DirectoryModel,
  handle: Handle,
  identity: IdentityFailures,
): HttpHandler[] {
  return [
    http.post(
      `${USERS_API_BASE_URL}/api/v1/users/:userId/block`,
      handle('users:update', ({ params }) => {
        const user = model.blockUser(readUserId(params), () => {
          checkAccountToDisable(identity);
        });
        return HttpResponse.json(toUserDto(user));
      }),
    ),
    http.post(
      `${USERS_API_BASE_URL}/api/v1/users/:userId/unblock`,
      handle('users:update', ({ params }) => {
        const user = model.unblockUser(readUserId(params), (current) => {
          checkAccountToEnable(identity, current.id);
        });
        return HttpResponse.json(toUserDto(user));
      }),
    ),
  ];
}
