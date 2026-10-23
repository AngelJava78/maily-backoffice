import { z } from 'zod';

import type { HttpClient } from '@/shared/api/httpClient';

const roleTypeSchema = z.object({ id: z.union([z.literal(1), z.literal(2)]), name: z.string() });
const roleTypesSchema = z.array(roleTypeSchema);

export type RoleType = z.output<typeof roleTypeSchema>;

export const ROLE_TYPES_PATH = '/api/v1/role-types';

/** The fixed catalog of role types, for the type selector of the alta form (`roles:read`). */
export function listRoleTypes(
  client: HttpClient,
  { signal }: { readonly signal?: AbortSignal } = {},
): Promise<RoleType[]> {
  return client.get(ROLE_TYPES_PATH, { schema: roleTypesSchema, signal });
}
