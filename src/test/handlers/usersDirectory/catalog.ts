import { http, HttpResponse, type HttpHandler } from 'msw';

import { USERS_API_BASE_URL } from '../usersService';
import type { Handle } from './handle';
import type { DirectoryModel } from './model';
import { readInteger, validationError, type FieldIssue } from './validation';

/**
 * R1: `GET /api/v1/roles`, the active roles that can be assigned, sorted by name (roles:read). With
 * `status_id=2` (feature 025), the blocked ones instead; any value other than 1 or 2 is a 422.
 */
export function catalogHandlers(model: DirectoryModel, handle: Handle): HttpHandler[] {
  return [
    http.get(
      `${USERS_API_BASE_URL}/api/v1/roles`,
      handle('roles:read', ({ request }) => {
        const issues: FieldIssue[] = [];
        const statusId = readInteger(
          new URL(request.url).searchParams.get('status_id'),
          { field: 'status_id', fallback: 1, min: 1, max: 2 },
          issues,
        );
        if (issues.length > 0) {
          throw validationError(issues);
        }
        return HttpResponse.json(model.listRolesWithStatus(statusId));
      }),
    ),
  ];
}
