import { createBehaviors } from '../usersDirectory/behaviors';
import { createHandle } from '../usersDirectory/handle';
import type { DirectoryModel } from '../usersDirectory/model';
import { USERS_API_BASE_URL } from '../usersService';
import { createRequestLog } from '../shared/requestLog';
import { catalogHandlers } from './catalogs';
import { createRolesCatalogModel, type ModuleRecord, type PermissionRecord } from './model';
import { rolePermissionsHandlers } from './permissions';
import { roleHandlers } from './roles';
import { server } from '../../server';

export { ADMIN_ID, ADMIN_SUB, rolesCatalogScenario, richClinicModulesScenario } from './seed';
export type { ModuleRecord, PermissionRecord, ResolvedPermission } from './model';

/**
 * Simulates, at network level, the roles/permissions/modules endpoints of the users service
 * (research D8): it does not keep its own list of roles — `directoryModel` is the same
 * `DirectoryModel` a test's `createUsersDirectoryMock(...).state` already returned, so there is a
 * single source of truth for "which roles exist" and "what a role can do". Associating or
 * disassociating a permission calls that same model's `grant`/`revoke`, so logging in afterward as
 * someone with the changed role sees the effect with no extra step.
 */
export function createRolesCatalogMock(
  directoryModel: DirectoryModel,
  scenario: { readonly modules: readonly ModuleRecord[]; readonly permissions: readonly PermissionRecord[] },
) {
  const catalog = createRolesCatalogModel(scenario.modules, scenario.permissions);
  const behaviors = createBehaviors();
  const log = createRequestLog(USERS_API_BASE_URL);
  const handle = createHandle(directoryModel, behaviors, log);

  server.use(
    ...roleHandlers(directoryModel, handle),
    ...rolePermissionsHandlers(directoryModel, catalog, handle),
    ...catalogHandlers(catalog, handle),
  );

  return {
    /** The modules and permissions catalog: `state.listModules(1)`, `state.listPermissions()`... */
    state: catalog,

    /** Every request this simulator has received, in order. */
    requests: log.requests,

    ...behaviors.controls,

    // Prepare the data of a test; they apply no rule of the service.
    addModule: catalog.addModule,
    addPermission: catalog.addPermission,
  };
}

export type RolesCatalogMock = ReturnType<typeof createRolesCatalogMock>;
