import { useAuth0 } from '@auth0/auth0-react';
import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/ApiError';
import type { HttpClient } from '@/shared/api/httpClient';
import { useHttpClients } from '@/shared/api/httpClientsContext';
import { runWithTimeout } from '@/shared/api/timeout';

import { getMyAccess } from '../api/authorizationApi';
import { ACCESS_CHECK_ATTEMPT_TIMEOUT_MS, ACCESS_RECHECK_INTERVAL_MS } from '../config/session';
import { evaluateAccess } from '../policy/evaluateAccess';
import type { AccessDecision, OperatorAccess } from '../policy/types';
import { operatorClaimsSchema } from '../schemas/operatorClaims';
import { accessKeys } from './accessKeys';

/**
 * What the route guard needs to know about the access of the person who signed in:
 * `resolving` while it is not known yet, `failed` when it could not be checked (and nothing was
 * known before), `denied`, or `granted` with what the person can do.
 * `accountEmail` (FR-014 of feature 006) is, once the query answers, the e-mail of the MailySoft
 * user if there is one, or else the e-mail of the Auth0 account; before that, it is always the
 * Auth0 one, the only thing known yet.
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
      readonly accountEmail: string | null;
    }
  | {
      readonly status: 'granted';
      readonly access: OperatorAccess;
      readonly accountEmail: string | null;
    };

const doNothing = (): void => undefined;

/**
 * Calls the access query and decides it, except that a 403 or a 404 (FR-023 of feature 006 — the
 * real API never sends either today, this is a protection against a change of it or of an
 * intermediary) resolve as `denied` instead of rejecting: left to propagate, they would count
 * against the retries meant for network/5xx failures, and a 403 would also trigger the global
 * "sin permiso" notice (`createQueryClient.ts`), which FR-023 says must not happen here.
 */
async function resolveAccess(users: HttpClient, signal: AbortSignal): Promise<AccessDecision> {
  try {
    return evaluateAccess(await getMyAccess(users, { signal }));
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      return { kind: 'denied', userEmail: null };
    }
    throw error;
  }
}

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
  const auth0Email = claims.success ? (claims.data.email ?? null) : null;

  const query = useQuery({
    queryKey: accessKeys.operator(sub),
    // Each attempt has its own time budget, so the failure shows up within 30 s however the
    // service misbehaves (FR-005, SC-011), and the call is cancelled with the query.
    queryFn: ({ signal }) =>
      runWithTimeout(signal, ACCESS_CHECK_ATTEMPT_TIMEOUT_MS, (attemptSignal) =>
        resolveAccess(users, attemptSignal),
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
    return { status: 'resolving', accountEmail: auth0Email };
  }
  if (!claims.success) {
    // A session whose token has no usable subject cannot be checked: nothing to ask or retry.
    return { status: 'failed', refetch: doNothing, accountEmail: auth0Email };
  }

  const decision = query.data;
  if (decision !== undefined) {
    // Once known, a failing re-check does not take the last answer away.
    if (decision.kind === 'granted') {
      return { status: 'granted', access: decision.access, accountEmail: auth0Email };
    }
    // FR-014: the MailySoft user's e-mail, if the query found one; the Auth0 account's otherwise.
    return { status: 'denied', accountEmail: decision.userEmail ?? auth0Email };
  }
  if (query.isError) {
    return {
      status: 'failed',
      refetch: () => {
        void query.refetch();
      },
      accountEmail: auth0Email,
    };
  }
  return { status: 'resolving', accountEmail: auth0Email };
}
