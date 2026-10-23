import { z } from 'zod';

import type { HttpClient } from '@/shared/api/httpClient';

import { permissionsSchema, type Permission } from '../schemas/permission';

interface Cancellable {
  readonly signal?: AbortSignal;
}

const path = (roleId: number): string => `/api/v1/roles/${roleId}/permissions`;

const associationSchema = z.object({
  role: z.object({ id: z.number().int() }),
  permission: z.object({ id: z.number().int() }),
});

/** The permissions a role currently has, resolved against the modules/actions catalog (`roles:read`). */
export function listRolePermissions(
  client: HttpClient,
  roleId: number,
  { signal }: Cancellable = {},
): Promise<Permission[]> {
  return client.get(path(roleId), { schema: permissionsSchema, signal });
}

/** Grants a permission to a role (`roles:update`); research D6/D8 handle the diff/orchestration. */
export async function associateRolePermission(
  client: HttpClient,
  roleId: number,
  permissionId: number,
  { signal }: Cancellable = {},
): Promise<void> {
  await client.request({
    path: path(roleId),
    method: 'POST',
    body: { permission_id: permissionId },
    schema: associationSchema,
    signal,
  });
}

/** Revokes a permission from a role (`roles:update`). */
export async function disassociateRolePermission(
  client: HttpClient,
  roleId: number,
  permissionId: number,
  { signal }: Cancellable = {},
): Promise<void> {
  await client.request({
    path: `${path(roleId)}/${permissionId}`,
    method: 'DELETE',
    schema: z.undefined(),
    signal,
  });
}
