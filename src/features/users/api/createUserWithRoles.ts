import type { HttpClient } from '@/shared/api/httpClient';

import type { Role } from '../schemas/role';
import type { PlatformUser } from '../schemas/user';
import { toCreateUserBody, type CreateUserFormValues } from '../schemas/userForm';
import { assignRoles, type RoleAssignmentFailure } from './assignRoles';
import { createUser } from './usersApi';

/**
 * The user exists. `created`: every role was assigned. `partial`: some were not, and the detail
 * of the user offers to retry them (FR-023). If the user could not be created there is no outcome:
 * the creation fails with its error and no role was asked for.
 */
export type CreateUserOutcome =
  | { readonly kind: 'created'; readonly user: PlatformUser; readonly assigned: readonly Role[] }
  | {
      readonly kind: 'partial';
      readonly user: PlatformUser;
      readonly assigned: readonly Role[];
      readonly failed: readonly RoleAssignmentFailure<Role>[];
    };

/**
 * Creates a user with its roles in the only way the service allows: first the user, then each role.
 * There is no compensation when a role fails: deleting the user would leave its email reserved and
 * its access account already created, so the user is kept and the rest is retried later (FR-023).
 */
export async function createUserWithRoles(
  client: HttpClient,
  values: CreateUserFormValues,
  roles: readonly Role[],
  signal?: AbortSignal,
): Promise<CreateUserOutcome> {
  // FR-005: nobody is created without a role. Checked before anything is sent, because afterwards
  // there is no way back (the access account would already exist).
  if (roles.length === 0) {
    throw new RangeError('A user is created with at least one role');
  }
  const user = await createUser(client, toCreateUserBody(values), { signal });
  const { assigned, failed } = await assignRoles(client, user.id, roles, signal);
  return failed.length === 0
    ? { kind: 'created', user, assigned }
    : { kind: 'partial', user, assigned, failed };
}
