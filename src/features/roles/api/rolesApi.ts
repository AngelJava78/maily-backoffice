import { z } from 'zod';

import type { HttpClient } from '@/shared/api/httpClient';

import { roleSchema, rolesSchema, type Role, type RoleCreateInput } from '../schemas/role';

/** `/api/v1/roles` (feature 014; contracts/roles-service.md). */
export const ROLES_PATH = '/api/v1/roles';

interface Cancellable {
  readonly signal?: AbortSignal;
}

const detailPath = (roleId: number): string => `${ROLES_PATH}/${roleId}`;

/** Every active role, sorted by name, without pagination (`roles:read`). */
export function listRoles(client: HttpClient, { signal }: Cancellable = {}): Promise<Role[]> {
  return client.get(ROLES_PATH, { schema: rolesSchema, signal });
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
