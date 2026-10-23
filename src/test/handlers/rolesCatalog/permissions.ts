import { http, HttpResponse, type HttpHandler } from 'msw';

import { USERS_API_BASE_URL } from '../usersService';
import type { Handle } from '../usersDirectory/handle';
import { DirectoryError, type DirectoryModel } from '../usersDirectory/model';
import { issue, readPermissionId, readRoleId, validationError } from '../usersDirectory/validation';
import type { ResolvedPermission, RolesCatalogModel } from './model';

const roleNotFound = (): DirectoryError =>
  new DirectoryError(404, 'role_not_found', 'El role no existe o no está activo.');

/** A fixed, stable date for every permission of this simulator: nothing reads it. */
const SEEDED_AT = '2026-10-15T05:57:30.521Z';

export function toPermissionReadDto(permission: ResolvedPermission) {
  return {
    id: permission.id,
    name: permission.name,
    description: null,
    created_at: SEEDED_AT,
    status: { id: 1, name: 'Activo' },
    module: permission.module,
    action: permission.action,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPermissionIdOfBody(body: unknown): number {
  if (!isRecord(body)) {
    throw validationError([issue('permission_id')]);
  }
  const extraFields = Object.keys(body)
    .filter((key) => key !== 'permission_id')
    .map(issue);
  const value = body.permission_id;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw validationError([...extraFields, issue('permission_id')]);
  }
  if (extraFields.length > 0) {
    throw validationError(extraFields);
  }
  return value;
}

/**
 * `GET/POST /api/v1/roles/{id}/permissions` and `DELETE .../permissions/{permissionId}` (feature
 * 013; contracts/roles-service.md). Associating/disassociating only needs `roles:update`: there is
 * no separate "permissions" scope for changing a role's own permissions (only for reading or
 * managing the catalog itself, see catalogs.ts).
 */
export function rolePermissionsHandlers(
  directoryModel: DirectoryModel,
  catalog: RolesCatalogModel,
  handle: Handle,
): HttpHandler[] {
  const roles = `${USERS_API_BASE_URL}/api/v1/roles`;

  return [
    http.get(
      `${roles}/:roleId/permissions`,
      handle('roles:read', ({ params }) => {
        const roleId = readRoleId(params);
        const role = directoryModel.findRole(roleId);
        if (role?.statusId !== 1) {
          throw roleNotFound();
        }
        const resolved = catalog.permissionsOfRole(role, role.typeId);
        return HttpResponse.json(resolved.map(toPermissionReadDto));
      }),
    ),
    http.post(
      `${roles}/:roleId/permissions`,
      handle('roles:update', ({ params, body }) => {
        const roleId = readRoleId(params);
        const permissionId = readPermissionIdOfBody(body);
        const { role, permission } = catalog.associate(directoryModel, roleId, permissionId);
        return HttpResponse.json(
          {
            role: { id: role.id, name: role.name, type: { id: role.typeId } },
            permission: { id: permission.id, name: permission.name },
          },
          { status: 201 },
        );
      }),
    ),
    http.delete(
      `${roles}/:roleId/permissions/:permissionId`,
      handle('roles:update', ({ params }) => {
        catalog.disassociate(directoryModel, readRoleId(params), readPermissionId(params));
        return new HttpResponse(null, { status: 204 });
      }),
    ),
  ];
}
