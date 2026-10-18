import type { HttpClient } from '@/shared/api/httpClient';

import { rolesSchema, type Role } from '../schemas/role';

/** R1 (contracts/users-service.md): the catalog of roles that can be assigned to a user. */
const ROLES_PATH = '/api/v1/roles';

/** Every active role, sorted by name and without pagination: the catalog assumes up to 100. */
export function listRoles(
  client: HttpClient,
  { signal }: { readonly signal?: AbortSignal } = {},
): Promise<Role[]> {
  return client.get(ROLES_PATH, { schema: rolesSchema, signal });
}
