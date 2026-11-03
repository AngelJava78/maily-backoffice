import { z } from 'zod';

import type { HttpClient } from '@/shared/api/httpClient';

import { roleSchema, rolesSchema, type Role, type RoleCreateInput } from '../schemas/role';

/** `/api/v1/roles` (feature 014; contracts/roles-service.md). */
export const ROLES_PATH = '/api/v1/roles';

interface Cancellable {
  readonly signal?: AbortSignal;
}

const detailPath = (roleId: number): string => `${ROLES_PATH}/${roleId}`;

/** Status id of a blocked role (contracts/roles-status-service.md); 1 is Activo, the default. */
const BLOCKED_STATUS_ID = 2;

/**
 * Every role of a status, of both types, sorted by name, without pagination (`roles:read`). The
 * active ones are asked for without `status_id`: the same request as before feature 025, which the
 * users section also makes.
 */
export function listRoles(
  client: HttpClient,
  { statusId, signal }: Cancellable & { readonly statusId?: 1 | 2 } = {},
): Promise<Role[]> {
  const query = statusId === BLOCKED_STATUS_ID ? { status_id: BLOCKED_STATUS_ID } : undefined;
  return client.get(ROLES_PATH, { schema: rolesSchema, query, signal });
}

/** Creates a role; its type is fixed from here on (`roles:write`). */
export function createRole(
  client: HttpClient,
  input: RoleCreateInput,
  { signal }: Cancellable = {},
): Promise<Role> {
  return client.request({
    path: ROLES_PATH,
    method: 'POST',
    body: { name: input.name, description: input.description, type_id: input.typeId },
    schema: roleSchema,
    signal,
  });
}

/** Changes the name and/or the description of a role; never its type (`roles:update`). */
export function updateRole(
  client: HttpClient,
  roleId: number,
  changes: { readonly name?: string; readonly description?: string | null },
  { signal }: Cancellable = {},
): Promise<Role> {
  const body: Record<string, unknown> = {};
  if (changes.name !== undefined) {
    body.name = changes.name;
  }
  if (changes.description !== undefined) {
    body.description = changes.description;
  }
  return client.request({
    path: detailPath(roleId),
    method: 'PATCH',
    body,
    schema: roleSchema,
    signal,
  });
}

/**
 * Blocks an active role (`roles:update`, feature 025): it keeps its data, its name and its
 * assignments, which stop having any effect. 409 `role_already_blocked` if it already was.
 */
export function blockRole(
  client: HttpClient,
  roleId: number,
  { signal }: Cancellable = {},
): Promise<Role> {
  return client.request({
    path: `${detailPath(roleId)}/block`,
    method: 'POST',
    schema: roleSchema,
    signal,
  });
}

/** Unblocks a blocked role, as it was (`roles:update`). 409 `role_already_active` if it already was. */
export function unblockRole(
  client: HttpClient,
  roleId: number,
  { signal }: Cancellable = {},
): Promise<Role> {
  return client.request({
    path: `${detailPath(roleId)}/unblock`,
    method: 'POST',
    schema: roleSchema,
    signal,
  });
}

/** Logical deletion; allowed even if the role is assigned to someone (`roles:delete`). */
export async function deleteRole(
  client: HttpClient,
  roleId: number,
  { signal }: Cancellable = {},
): Promise<void> {
  await client.request({
    path: detailPath(roleId),
    method: 'DELETE',
    schema: z.undefined(),
    signal,
  });
}
