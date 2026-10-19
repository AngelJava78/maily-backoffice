import type { HttpClient } from '@/shared/api/httpClient';

import { myAccessSchema, type MyAccess } from '../schemas/myAccess';

/** The `me` operation of the users service (contracts/users-service.md, M1). */
const MY_ACCESS_PATH = '/api/v1/authorization/me';

/** Who the token belongs to, in the platform: the user and the roles with their permissions. */
export function getMyAccess(
  client: HttpClient,
  options: { readonly signal?: AbortSignal } = {},
): Promise<MyAccess> {
  return client.get(MY_ACCESS_PATH, { schema: myAccessSchema, signal: options.signal });
}
