import { http, HttpResponse, type HttpHandler } from 'msw';

import { USERS_API_BASE_URL } from '../usersService';
import type { Handle } from './handle';
import type { ModulesCatalogModel } from './model';
import { readModuleId, readPermissionId } from './validation';

/**
 * Deletes a module, in cascade with its actions (FR-022 to FR-024), with `modules:delete`; and
 * deletes one action of a module (research D5), with `modules:update` — unmarking an action is part
 * of modifying a module (FR-014, FR-016, FR-017), not of deleting it.
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
      handle('modules:update', ({ params }) => {
        model.deletePermission(readPermissionId(params));
        return new HttpResponse(null, { status: 204 });
      }),
    ),
  ];
}
