import { http, HttpResponse, type HttpHandler } from 'msw';

import { USERS_API_BASE_URL } from '../usersService';
import type { Handle } from './handle';
import type { ModulesCatalogModel } from './model';
import { moduleInputFromBody, permissionInputFromBody } from './validation';

/**
 * Creates a module (FR-005 to FR-013 of 013-modules-permissions-catalogs) or marks one of its
 * actions (research D5: a permission `key:accion`), gated by `modules:write`: this screen never
 * creates a permission outside the context of a module it can already edit.
 */
export function createHandlers(model: ModulesCatalogModel, handle: Handle): HttpHandler[] {
  return [
    http.post(
      `${USERS_API_BASE_URL}/api/v1/modules`,
      handle('modules:write', ({ body }) => {
        const created = model.createModule(moduleInputFromBody(body));
        return HttpResponse.json(model.toModuleDto(created), {
          status: 201,
          headers: { Location: `/api/v1/modules/${created.id}` },
        });
      }),
    ),

    http.post(
      `${USERS_API_BASE_URL}/api/v1/permissions`,
      handle('modules:write', ({ body }) => {
        const created = model.createPermission(permissionInputFromBody(body));
        return HttpResponse.json(model.toPermissionDto(created), {
          status: 201,
          headers: { Location: `/api/v1/permissions/${created.id}` },
        });
      }),
    ),
  ];
}
