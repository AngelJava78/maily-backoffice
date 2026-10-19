import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { getUser } from '../api/usersApi';
import type { PlatformUser } from '../schemas/user';
import { userKeys } from './userKeys';

/** One user, whatever its status. A user that does not exist is the error of the query (404). */
export function useUser(userId: string): UseQueryResult<PlatformUser> {
  const { users } = useHttpClients();
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: ({ signal }) => getUser(users, userId, { signal }),
  });
}
