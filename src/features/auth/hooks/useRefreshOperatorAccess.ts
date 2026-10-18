import { useAuth0 } from '@auth0/auth0-react';
import { useQueryClient } from '@tanstack/react-query';

import { operatorClaimsSchema } from '../schemas/operatorClaims';
import { accessKeys } from './accessKeys';

/**
 * Asks the users service again for what the operator can do and who they are, without waiting for
 * the next check (every 5 minutes, or when the tab gets the focus). For the moment something that
 * is known about the operator was changed on purpose, such as their own name: the header and the
 * profile read it from there.
 */
export function useRefreshOperatorAccess(): () => void {
  const { user } = useAuth0();
  const queryClient = useQueryClient();
  const claims = operatorClaimsSchema.safeParse(user);
  const sub = claims.success ? claims.data.sub : null;

  return () => {
    void queryClient.invalidateQueries({ queryKey: accessKeys.operator(sub) });
  };
}
