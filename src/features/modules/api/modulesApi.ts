import { z } from 'zod';

import type { HttpClient } from '@/shared/api/httpClient';

import type { ModuleActionKey } from '../schemas/moduleActionCatalog';
import type { CreateModuleBody } from '../schemas/moduleForm';
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
