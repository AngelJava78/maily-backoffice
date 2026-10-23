import { http, HttpResponse, type HttpHandler } from 'msw';

import { USERS_API_BASE_URL } from '../usersService';
import type { Handle } from './handle';
import { moduleNotFoundError, type ModulesCatalogModel } from './model';
import { readModuleId } from './validation';

/**
 * The reads of modules and permissions (contracts/modules-service.md): the catalog, one module by
 * id or by key, and the full permissions catalog used to cross-reference actions (research D3).
 */
export function readHandlers(model: ModulesCatalogModel, handle: Handle): HttpHandler[] {
  const modules = `${USERS_API_BASE_URL}/api/v1/modules`;
  const permissions = `${USERS_API_BASE_URL}/api/v1/permissions`;

  return [
    http.get(
      modules,
      handle('modules:read', ({ request }) => {
        const url = new URL(request.url);
        const statusParam = url.searchParams.get('status_id');
        const typeParam = url.searchParams.get('type_id');
        return HttpResponse.json(
          model
            .listModules({
              statusId: statusParam === null ? undefined : Number(statusParam),
              typeId: typeParam === null ? undefined : Number(typeParam),
            })
            .map((module) => model.toModuleDto(module)),
        );
      }),
    ),

    http.get(
      `${modules}/by-key`,
      handle('modules:read', ({ request }) => {
        const key = new URL(request.url).searchParams.get('key') ?? '';
        const module = model.findActiveModuleByKey(key);
        if (module === undefined) {
          throw moduleNotFoundError(`«${key}»`);
        }
        return HttpResponse.json(model.toModuleDto(module));
      }),
    ),

    http.get(
      `${modules}/:moduleId`,
      handle('modules:read', ({ params }) => {
        const id = readModuleId(params);
        const module = model.findModule(id);
        if (module === undefined || module.statusId === 3) {
          throw moduleNotFoundError(id);
        }
        return HttpResponse.json(model.toModuleDto(module));
      }),
    ),

    http.get(
      permissions,
      handle('permissions:read', () =>
        HttpResponse.json(model.listPermissions().map((permission) => model.toPermissionDto(permission))),
      ),
    ),
  ];
}
