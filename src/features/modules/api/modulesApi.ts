import { z } from 'zod';

import { ApiError } from '@/shared/api/ApiError';
import type { HttpClient } from '@/shared/api/httpClient';

import type { ModuleActionKey } from '../schemas/moduleActionCatalog';
import type { CreateModuleBody, UpdateModuleBody } from '../schemas/moduleForm';
import { attachModuleActions, type ModulePermissionRef } from '../schemas/attachModuleActions';
import { systemModuleSchema, type SystemModuleBase, type SystemModule } from '../schemas/systemModule';

/**
 * The operations on modules and permissions of the users service (contracts/modules-service.md).
 * Modules and permissions are separate resources of that same service (research D2): the paths stay
 * in this layer, so a change of contract does not reach the components.
 */
const MODULES_PATH = '/api/v1/modules';
const PERMISSIONS_PATH = '/api/v1/permissions';

interface Cancellable {
  readonly signal?: AbortSignal;
}

const moduleListSchema = z.array(systemModuleSchema);

const permissionRefSchema = z.object({
  id: z.number(),
  module: z.object({ key: z.string() }).nullable(),
  action: z.object({ key: z.string() }).nullable(),
}) satisfies z.ZodType<ModulePermissionRef>;

const permissionListSchema = z.array(permissionRefSchema);

/**
 * The modules, each already cross-referenced with its own actions (research D3): neither
 * `GET /modules` nor `GET /permissions` gives one from the other on its own.
 */
export function listModules(
  client: HttpClient,
  { statusId, signal }: Cancellable & { readonly statusId?: number } = {},
): Promise<SystemModule[]> {
  return Promise.all([
    client.get(MODULES_PATH, { schema: moduleListSchema, query: { status_id: statusId }, signal }),
    client.get(PERMISSIONS_PATH, { schema: permissionListSchema, signal }),
  ]).then(([modules, permissions]) => attachModuleActions(modules, permissions));
}

/** `POST /api/v1/modules` (FR-005 to FR-013): the module is born Active. */
export function createModule(
  client: HttpClient,
  body: CreateModuleBody,
  { signal }: Cancellable = {},
): Promise<SystemModuleBase> {
  return client.request({ path: MODULES_PATH, method: 'POST', body, schema: systemModuleSchema, signal });
}

/** `PATCH /api/v1/modules/{id}` with only the fields given (FR-014, FR-015: never `key` nor `type_id`). */
export function updateModule(
  client: HttpClient,
  moduleId: number,
  body: UpdateModuleBody,
  { signal }: Cancellable = {},
): Promise<SystemModuleBase> {
  return client.request({
    path: `${MODULES_PATH}/${moduleId}`,
    method: 'PATCH',
    body,
    schema: systemModuleSchema,
    signal,
  });
}

/** `DELETE /api/v1/modules/{id}` (FR-022, FR-023): the module and every one of its actions. */
export function deleteModule(
  client: HttpClient,
  moduleId: number,
  { signal }: Cancellable = {},
): Promise<void> {
  return client.request({
    path: `${MODULES_PATH}/${moduleId}`,
    method: 'DELETE',
    schema: z.undefined(),
    signal,
  });
}

const createdPermissionSchema = z.object({ id: z.number() });

/**
 * Marks one action of a module: creates the permission `<moduleKey>:<action>` (research D5) and
 * gives its id, to delete it later if the action is unchecked.
 */
export function createModuleAction(
  client: HttpClient,
  moduleKey: string,
  action: ModuleActionKey,
  { signal }: Cancellable = {},
): Promise<number> {
  return client
    .request({
      path: PERMISSIONS_PATH,
      method: 'POST',
      body: { name: `${moduleKey}:${action}` },
      schema: createdPermissionSchema,
      signal,
    })
    .then((created) => created.id);
}

/** `POST /api/v1/modules/{id}/block` (FR-019): the module stays, but stops being usable. */
export function blockModule(
  client: HttpClient,
  moduleId: number,
  { signal }: Cancellable = {},
): Promise<SystemModuleBase> {
  return client.request({
    path: `${MODULES_PATH}/${moduleId}/block`,
    method: 'POST',
    schema: systemModuleSchema,
    signal,
  });
}

/** `POST /api/v1/modules/{id}/unblock` (FR-020): the module goes back to Activo. */
export function unblockModule(
  client: HttpClient,
  moduleId: number,
  { signal }: Cancellable = {},
): Promise<SystemModuleBase> {
  return client.request({
    path: `${MODULES_PATH}/${moduleId}/unblock`,
    method: 'POST',
    schema: systemModuleSchema,
    signal,
  });
}

/**
 * Unmarks one action of a module: deletes the permission by its id (research D5). A `404
 * permission_not_found` is resolved as success (contracts/modules-service.md): the result it asked
 * for — that the permission not exist — already holds.
 */
export function deleteModuleAction(
  client: HttpClient,
  permissionId: number,
  { signal }: Cancellable = {},
): Promise<void> {
  // The client validates every answer, even an empty one: an empty body is read as `undefined`.
  return client
    .request({ path: `${PERMISSIONS_PATH}/${permissionId}`, method: 'DELETE', schema: z.undefined(), signal })
    .catch((error: unknown) => {
      if (error instanceof ApiError && error.code === 'permission_not_found') {
        return undefined;
      }
      throw error;
    });
}
