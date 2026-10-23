import type { HttpHandler } from 'msw';

import { server } from '../../server';
import { createFailureControls } from '../shared/failures';
import { createRequestLog } from '../shared/requestLog';
import type { UsersDirectoryMock } from '../usersDirectory';
import { USERS_API_BASE_URL } from '../usersService';
import { createAuthorization } from './authorize';
import { blockHandlers } from './block';
import { createHandlers } from './create';
import { createHandle, type Handle } from './handle';
import {
  createModulesCatalogModel,
  type CatalogInitial,
  type CatalogModule,
  type CatalogPermission,
  type ModulesCatalogModel,
} from './model';
import { readHandlers } from './reads';
import { removeHandlers } from './remove';
import { defaultCatalog } from './seed';
import { updateHandlers } from './update';

export { USERS_API_BASE_URL } from '../usersService';
export { catalogModule, catalogPermission } from './model';
export type { CatalogInitial, CatalogModule, CatalogPermission } from './model';
export { defaultCatalog } from './seed';

const DEFAULT_CODES: ReadonlyMap<number, string> = new Map([
  [500, 'internal_error'],
  [503, 'authorization_unavailable'],
]);

const OPERATIONS: readonly ((model: ModulesCatalogModel, handle: Handle) => HttpHandler[])[] = [
  readHandlers,
  createHandlers,
  updateHandlers,
  blockHandlers,
  removeHandlers,
];

/**
 * Simulates the modules and permissions resources of the users service at network level (research
 * D2: same base URL as `users`/`roles`), and registers itself in the shared MSW server. Permissions
 * come from the users directory simulator's own data (research D2's authorize.ts), exactly like
 * `subscriptionsCatalog` already does for a genuinely separate backend.
 */
export function createModulesCatalogMock({
  directory,
  initial = defaultCatalog(),
}: {
  readonly directory?: UsersDirectoryMock;
  readonly initial?: CatalogInitial;
} = {}) {
  const model = createModulesCatalogModel(initial);
  const failures = createFailureControls({ defaultCodes: DEFAULT_CODES });
  const log = createRequestLog(USERS_API_BASE_URL);
  const authorization = createAuthorization(directory);
  const handle = createHandle({ log, failures, authorization });

  server.use(...OPERATIONS.flatMap((operation) => operation(model, handle)));

  return {
    /** The data and its queries: `state.listModules()`, `state.findModule(id)`... */
    state: model,

    /** Every request the API has received, in order. */
    requests: log.requests,
    get requestCount(): number {
      return log.requests.length;
    },
    /** The requests with this method to this path (a text for an exact one, or a pattern). */
    requestsTo(method: string, path: string | RegExp) {
      return log.requests.filter(
        (request) =>
          request.method === method.toUpperCase() &&
          (typeof path === 'string' ? request.path === path : path.test(request.path)),
      );
    },

    ...failures.controls,

    // Prepare the data of a test; they apply no rule of the API.
    addModule(module: CatalogModule): void {
      model.addModule(module);
    },
    addPermission(permission: CatalogPermission): void {
      model.addPermission(permission);
    },
  };
}

export type ModulesCatalogMock = ReturnType<typeof createModulesCatalogMock>;
