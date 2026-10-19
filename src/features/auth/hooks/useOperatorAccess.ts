import { useAuth0 } from '@auth0/auth0-react';
import { useQuery } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';
import { runWithTimeout } from '@/shared/api/timeout';

import { getMyAccess } from '../api/authorizationApi';
import { ACCESS_CHECK_ATTEMPT_TIMEOUT_MS, ACCESS_RECHECK_INTERVAL_MS } from '../config/session';
import { evaluateAccess } from '../policy/evaluateAccess';
import type { AccessDeniedReason, OperatorAccess } from '../policy/types';
import { operatorClaimsSchema } from '../schemas/operatorClaims';
import { accessKeys } from './accessKeys';

/**
 * What the route guard needs to know about the access of the person who signed in:
 * `resolving` while it is not known yet, `failed` when it could not be checked (and nothing was
 * known before), `denied` with the reason, or `granted` with what the person can do.
 * `accountEmail` is the e-mail of the Auth0 account, only for the denied and failed screens.
 */
export type OperatorAccessState =
  | { readonly status: 'resolving'; readonly accountEmail: string | null }
  | {
      readonly status: 'failed';
      readonly refetch: () => void;
      readonly accountEmail: string | null;
    }
  | {
      readonly status: 'denied';
      readonly reason: AccessDeniedReason;
      readonly accountEmail: string | null;
    }
  | {
      readonly status: 'granted';
      readonly access: OperatorAccess;
      readonly accountEmail: string | null;
    };

const doNothing = (): void => undefined;

/**
 * Resolves the access of the person with a single call to the users service (FR-003, FR-004) and
 * checks it again every 5 minutes and whenever the tab gets the focus (FR-019). It is meant for
 * the route guard only: what is below it reads the result with `useGrantedAccess`, so that the
 * checks are not multiplied.
 */
export function useOperatorAccess(): OperatorAccessState {
  const { isAuthenticated, user } = useAuth0();
  const { users } = useHttpClients();
  const claims = operatorClaimsSchema.safeParse(user);
  const sub = claims.success ? claims.data.sub : null;
  const accountEmail = claims.success ? (claims.data.email ?? null) : null;

  const query = useQuery({
    queryKey: accessKeys.operator(sub),
    // Each attempt has its own time budget, so the failure shows up within 30 s however the
    // service misbehaves (FR-005, SC-011), and the call is cancelled with the query.
    queryFn: ({ signal }) =>
      runWithTimeout(signal, ACCESS_CHECK_ATTEMPT_TIMEOUT_MS, async (attemptSignal) =>
        evaluateAccess(await getMyAccess(users, { signal: attemptSignal })),
      ),
    enabled: isAuthenticated && sub !== null,
    // `navigator.onLine` is unreliable: always try, so an offline browser fails instead of waiting.
    networkMode: 'always',
    refetchInterval: ACCESS_RECHECK_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
    staleTime: ACCESS_RECHECK_INTERVAL_MS,
  });

  if (!isAuthenticated) {
    return { status: 'resolving', accountEmail };
  }
  if (!claims.success) {
    // A session whose token has no usable subject cannot be checked: nothing to ask or retry.
    return { status: 'failed', refetch: doNothing, accountEmail };
  }

  const decision = query.data;
  if (decision !== undefined) {
    // Once known, a failing re-check does not take the last answer away.
    return decision.kind === 'granted'
      ? { status: 'granted', access: decision.access, accountEmail }
      : { status: 'denied', reason: decision.reason, accountEmail };
  }
  if (query.isError) {
    return {
      status: 'failed',
      refetch: () => {
        void query.refetch();
      },
      accountEmail,
    };
  }
  return { status: 'resolving', accountEmail };
}
