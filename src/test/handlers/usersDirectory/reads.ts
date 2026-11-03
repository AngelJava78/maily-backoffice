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
 * The reads of the users service (U1 to U3 and U10): the list of the users of one status and type
 * (API 5.5.0), the search by email, one user and the roles of a user. All of them ask for
 * `users:read`.
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
        // API 5.5.0 (feature 026): 1 active by default or 2 blocked; deleted users are never listed.
        const statusId = readInteger(
          query.get('status_id'),
          { field: 'status_id', fallback: 1, min: 1, max: 2 },
          issues,
        );
        // Without it, users of every type, also those without active roles.
        const typeText = query.get('role_type_id');
        const roleTypeId =
          typeText === null
            ? undefined
            : readInteger(typeText, { field: 'role_type_id', fallback: 1, min: 1, max: 2 }, issues);
        if (issues.length > 0) {
          throw validationError(issues);
        }
        return HttpResponse.json(model.listUsers(page, pageSize, { statusId, roleTypeId }));
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
