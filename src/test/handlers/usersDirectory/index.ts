import { auth0User } from '../../auth0Double';
import { server } from '../../server';
import { assignRoleHandlers } from './assignRole';
import { createBehaviors } from './behaviors';
import { blockHandlers } from './block';
import { catalogHandlers } from './catalog';
import { createHandlers } from './create';
import { createHandle } from './handle';
import { meHandlers } from './me';
import { createDirectoryModel, type DirectoryInitial } from './model';
import { readHandlers } from './reads';
import { removeHandlers } from './remove';
import { createRequestLog } from './requestLog';
import { ADMIN_SUB, defaultDirectory } from './seed';
import { unassignRoleHandlers } from './unassignRole';
import { updateHandlers } from './update';

export { ADMIN_SUB, defaultDirectory, makeUsers } from './seed';

/** The Auth0 state of the operator of the default directory: signed in as the administrator. */
export const ADMIN_AUTH0 = {
  isAuthenticated: true,
  user: auth0User({ sub: ADMIN_SUB, email: 'admin@mailysoft.test' }),
};

export { directoryRole, directoryUser } from './model';
export type { DirectoryInitial, DirectoryRole, DirectoryUser } from './model';

/**
 * Simulates the users service at network level with its data and its rules (research D14), and
 * registers itself in the shared MSW server. The token `Bearer test-token:<sub>` tells who is
 * asking, and the permissions come from the data: a role that loses a permission makes the
 * service answer 403 from then on, and the answer of `me` follows the same data.
 */
export function createUsersDirectoryMock(initial: DirectoryInitial = defaultDirectory()) {
  const model = createDirectoryModel(initial);
  const behaviors = createBehaviors();
  const log = createRequestLog();
  const handle = createHandle(model, behaviors, log);

  server.use(
    ...meHandlers(model, handle),
    ...readHandlers(model, handle),
    ...createHandlers(model, handle, behaviors.identityState),
    ...catalogHandlers(model, handle),
    ...assignRoleHandlers(model, handle),
    ...updateHandlers(model, handle),
    ...unassignRoleHandlers(model, handle),
    ...blockHandlers(model, handle, behaviors.identityState),
    ...removeHandlers(model, handle, behaviors.identityState),
  );

  return {
    /** The data and its queries: `state.findUser(id)`, `state.rolesOf(id)`, `state.users()`... */
    state: model,

    /** Every request the service has received, in order. */
    requests: log.requests,
    get requestCount(): number {
      return log.requests.length;
    },
    /** How many of the requests were cancelled by the client before being answered. */
    get abortedCount(): number {
      return log.requests.filter((request) => request.aborted).length;
    },
    /** The requests with this method to this path (a text for an exact one, or a pattern). */
    requestsTo(method: string, path: string | RegExp) {
      return log.requests.filter(
        (request) =>
          request.method === method.toUpperCase() &&
          (typeof path === 'string' ? request.path === path : path.test(request.path)),
      );
    },

    ...behaviors.controls,
    identityState: behaviors.identityState,

    // Prepare the data of a test; they apply no rule of the service.
    addUser: model.addUser,
    addRole: model.addRole,
    assign: model.assign,
    setUserStatus: model.setUserStatus,
    setRoleStatus: model.setRoleStatus,
    grant: model.grant,
    revoke: model.revoke,
  };
}

export type UsersDirectoryMock = ReturnType<typeof createUsersDirectoryMock>;
