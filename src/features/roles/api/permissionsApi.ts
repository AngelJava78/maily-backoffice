import type { HttpClient } from '@/shared/api/httpClient';

import { permissionsSchema, type Permission } from '../schemas/permission';

export const PERMISSIONS_PATH = '/api/v1/permissions';

/** The whole catalog of permissions, resolved (`permissions:read`); feeds the permission matrix. */
export function listPermissions(
  client: HttpClient,
  { signal }: { readonly signal?: AbortSignal } = {},
): Promise<Permission[]> {
  return client.get(PERMISSIONS_PATH, { schema: permissionsSchema, signal });
}
