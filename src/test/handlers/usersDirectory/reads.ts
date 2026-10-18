import { http, HttpResponse, type HttpHandler } from 'msw';

import { USERS_API_BASE_URL } from '../usersService';
import type { Handle } from './handle';
import { toUserDto, type DirectoryModel } from './model';
import {
  isValidEmail,
  issue,
  readInteger,
  readUserId,
  validationError,
  type FieldIssue,
} from './validation';

/**
 * The reads of the users service (U1 to U3 and U10): the list of the active users, the search by
 * email, one user and the roles of a user. All of them ask for `users:read`.
 */
export function readHandlers(model: DirectoryModel, handle: Handle): HttpHandler[] {
  const users = `${USERS_API_BASE_URL}/api/v1/users`;

  return [
    http.get(
      users,
      handle('users:read', ({ request }) => {
        const query = new URL(request.url).searchParams;
        const issues: FieldIssue[] = [];
        const page = readInteger(query.get('page'), { field: 'page', fallback: 1, min: 1 }, issues);
        const pageSize = readInteger(
          query.get('page_size'),
          { field: 'page_size', fallback: 50, min: 1, max: 100 },
          issues,
        );
        if (issues.length > 0) {
          throw validationError(issues);
        }
        return HttpResponse.json(model.listActiveUsers(page, pageSize));
      }),
    ),

    // Before `/:userId`, which would take "by-email" for an id.
    http.get(
      `${users}/by-email`,
      handle('users:read', ({ request }) => {
        const email = new URL(request.url).searchParams.get('email')?.trim() ?? '';
        if (!isValidEmail(email)) {
          throw validationError([issue('email')]);
        }
        return HttpResponse.json(toUserDto(model.getUserByEmail(email)));
      }),
    ),

    http.get(
      `${users}/:userId`,
      handle('users:read', ({ params }) =>
        HttpResponse.json(toUserDto(model.getUser(readUserId(params)))),
      ),
    ),

    http.get(
      `${users}/:userId/roles`,
      handle('users:read', ({ params }) =>
        HttpResponse.json(model.listUserRoles(readUserId(params))),
      ),
    ),
  ];
}
