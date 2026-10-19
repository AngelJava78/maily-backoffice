import { z } from 'zod';

import type { HttpClient } from '@/shared/api/httpClient';

import {
  rolesSchema,
  userRoleAssignmentSchema,
  type Role,
  type UserRoleAssignment,
} from '../schemas/role';

/** The operations on the roles of a user (contracts/users-service.md, U10 to U12). */
const USERS_PATH = '/api/v1/users';

interface Cancellable {
  readonly signal?: AbortSignal;
}

/** U11: gives one role to an active user. */
export function assignRole(
  client: HttpClient,
  userId: string,
  roleId: number,
  { signal }: Cancellable = {},
): Promise<UserRoleAssignment> {
  return client.request({
    path: `${USERS_PATH}/${userId}/roles`,
    method: 'POST',
    body: { role_id: roleId },
    schema: userRoleAssignmentSchema,
    signal,
  });
}

/** U12: takes one role away from an active user. The answer is a 204 without a body. */
export async function unassignRole(
  client: HttpClient,
  userId: string,
  roleId: number,
  { signal }: Cancellable = {},
): Promise<void> {
  // The client validates every answer, even an empty one: an empty body is read as `undefined`.
  await client.request({
    path: `${USERS_PATH}/${userId}/roles/${roleId}`,
    method: 'DELETE',
    schema: z.undefined(),
    signal,
  });
}

/** U10: the active roles of an active user, sorted by name. The roles of other users are refused. */
export function listUserRoles(
  client: HttpClient,
  userId: string,
  { signal }: Cancellable = {},
): Promise<Role[]> {
  return client.get(`${USERS_PATH}/${userId}/roles`, { schema: rolesSchema, signal });
}
