import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { listUsers } from '../api/usersApi';
import type { UserPage } from '../schemas/userPage';
import { userKeys, type UserListParams } from './userKeys';

/**
 * A page of the active users. While the next page loads the previous one stays on screen, so the
 * list does not flash between pages. The call is cancelled with the query.
 */
export function useUsersPage(params: UserListParams): UseQueryResult<UserPage> {
  const { users } = useHttpClients();
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: ({ signal }) =>
      listUsers(users, { page: params.page, pageSize: params.pageSize, signal }),
    placeholderData: keepPreviousData,
  });
}
