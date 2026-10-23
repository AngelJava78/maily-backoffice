import { z } from 'zod';

import type { HttpClient } from '@/shared/api/httpClient';

import { attachModuleActions, type ModulePermissionRef } from '../schemas/attachModuleActions';
import { systemModuleSchema, type SystemModule } from '../schemas/systemModule';

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
