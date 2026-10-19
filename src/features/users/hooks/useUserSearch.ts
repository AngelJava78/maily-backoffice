import { skipToken, useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { getUserByEmail } from '../api/usersApi';
import type { PlatformUser } from '../schemas/user';
import { userKeys } from './userKeys';

/**
 * The user with this email, whatever its status (FR-018). Nobody having it is a result, `null`,
 * and not an error. With no email there is nothing to ask. The key trims and lower-cases the email,
 * so the spellings of the same email share one request.
 */
export function useUserSearch(email: string | null): UseQueryResult<PlatformUser | null> {
  const { users } = useHttpClients();
  return useQuery({
    queryKey: userKeys.search(email ?? ''),
    queryFn: email === null ? skipToken : ({ signal }) => getUserByEmail(users, email, { signal }),
  });
}
