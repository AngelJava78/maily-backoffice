import { useAuth0 } from '@auth0/auth0-react';
import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';

import type { AccessDecision, OperatorAccess } from '../policy/types';
import { operatorClaimsSchema } from '../schemas/operatorClaims';
import { accessKeys } from './accessKeys';

/**
 * The access of the person who is inside the application, read from the TanStack Query cache
 * where the route guard keeps it (constitution III: server state is not copied anywhere else).
 * It only observes: the guard is the single place that asks the users service and polls it.
 *
 * It must be used below the guard, where the access has been granted. When the cache is emptied
 * while the screens are still mounted (logging out), the last access is kept for the moment that
 * takes the guard to remove them.
 */
export function useGrantedAccess(): OperatorAccess {
  const { user } = useAuth0();
  const claims = operatorClaimsSchema.safeParse(user);
  const { data } = useQuery<AccessDecision>({
    queryKey: accessKeys.operator(claims.success ? claims.data.sub : null),
    queryFn: skipToken,
    placeholderData: keepPreviousData,
  });

  if (data?.kind !== 'granted') {
    throw new Error('useGrantedAccess must be used where the access has been granted');
  }
  return data.access;
}
