import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { listUsers } from '../api/usersApi';
import type { UserPage } from '../schemas/userPage';
import { ROLE_TYPE_ID_OF_USERS_FILTER, STATUS_ID_OF_USERS_FILTER } from '../schemas/usersLocation';
import { userKeys, type UserListParams } from './userKeys';

/**
 * A page of the users of one status and, unless the type filter is Todos, of one type (feature
 * 026). While the next page or the next filter loads, the previous one stays on screen, so the list
 * does not flash. The call is cancelled with the query.
 */
export function useUsersPage(params: UserListParams): UseQueryResult<UserPage> {
  const { users } = useHttpClients();
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: ({ signal }) =>
      listUsers(users, {
        page: params.page,
        pageSize: params.pageSize,
        statusId: STATUS_ID_OF_USERS_FILTER[params.status],
        roleTypeId: params.type === 'all' ? undefined : ROLE_TYPE_ID_OF_USERS_FILTER[params.type],
        signal,
      }),
    placeholderData: keepPreviousData,
    // The type of a user changes when the Roles section blocks, unblocks or deletes one of its
    // roles, and that section cannot invalidate the keys of this feature: the page is asked again
    // every time the list opens, showing the one kept meanwhile (research D5).
    refetchOnMount: 'always',
  });
}
