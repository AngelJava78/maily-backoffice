import { http, HttpResponse, type HttpHandler } from 'msw';

import { USERS_API_BASE_URL } from '../usersService';
import type { Handle } from './handle';
import type { ModulesCatalogModel } from './model';
import { readModuleId, readPermissionId } from './validation';

/**
 * Deletes a module, in cascade with its actions (FR-022 to FR-024), and deletes one action of a
 * module (research D5), both with `modules:delete`.
 */
export function removeHandlers(model: ModulesCatalogModel, handle: Handle): HttpHandler[] {
  return [
    http.delete(
      `${USERS_API_BASE_URL}/api/v1/modules/:moduleId`,
      handle('modules:delete', ({ params }) => {
        model.deleteModule(readModuleId(params));
        return new HttpResponse(null, { status: 204 });
      }),
    ),

    http.delete(
      `${USERS_API_BASE_URL}/api/v1/permissions/:permissionId`,
      handle('modules:delete', ({ params }) => {
        model.deletePermission(readPermissionId(params));
        return new HttpResponse(null, { status: 204 });
      }),
    ),
  ];
}
