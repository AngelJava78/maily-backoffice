import { http, HttpResponse, type HttpHandler } from 'msw';

import { USERS_API_BASE_URL } from '../usersService';
import type { Handle } from '../usersDirectory/handle';
import type { RolesCatalogModel } from './model';
import { toPermissionReadDto } from './permissions';

const ROLE_TYPES = [
  { id: 1, name: 'Sistema' },
  { id: 2, name: 'Clínica' },
];

function toModuleReadDto(module: ReturnType<RolesCatalogModel['modules']>[number]) {
  return {
    id: module.id,
    key: module.key,
    name: module.name,
    description: null,
    sort_order: module.sortOrder,
    created_at: '2026-10-15T05:57:30.521Z',
    status: { id: module.statusId, name: module.statusId === 1 ? 'Activo' : 'Bloqueado' },
    type: { id: module.typeId, name: module.typeId === 1 ? 'Sistema' : 'Clínica' },
    active_permissions_count: 0,
  };
}

/**
 * `GET /api/v1/permissions`, `GET /api/v1/modules` and `GET /api/v1/role-types` (feature 014;
 * contracts/roles-service.md): the read-only catalogs the permission matrix is built from.
 */
export function catalogHandlers(catalog: RolesCatalogModel, handle: Handle): HttpHandler[] {
  const base = `${USERS_API_BASE_URL}/api/v1`;

  return [
    http.get(
      `${base}/permissions`,
      handle('permissions:read', () => HttpResponse.json(catalog.listPermissions().map(toPermissionReadDto))),
    ),
    http.get(
      `${base}/modules`,
      handle('modules:read', ({ request }) => {
        const typeParam = new URL(request.url).searchParams.get('type_id');
        // `type_id` is optional in the real API (modules.py): omitted, it answers both types.
        const modules =
          typeParam === null
            ? [...catalog.modules()].filter((module) => module.statusId === 1)
            : catalog.listModules(Number(typeParam));
        return HttpResponse.json(
          [...modules]
            .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
            .map(toModuleReadDto),
        );
      }),
    ),
    http.get(
      `${base}/role-types`,
      handle('roles:read', () => HttpResponse.json(ROLE_TYPES)),
    ),
  ];
}
