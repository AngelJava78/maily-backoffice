import { useAuth0 } from '@auth0/auth0-react';
import { useMemo, type ReactNode } from 'react';

import { mapAuth0TokenError, useSessionExpiry } from '@/features/auth';
import { SessionExpiredError } from '@/shared/api/ApiError';
import {
  createAnonymousHttpClient,
  createHttpClient,
  type GetAccessToken,
} from '@/shared/api/httpClient';
import { HttpClientsContext } from '@/shared/api/httpClientsContext';

import type { AppEnv } from '../config/env';

/** Builds the HTTP clients of the platform services, which get their tokens from Auth0. */
export function HttpClientsProvider({
  env,
  children,
}: {
  readonly env: AppEnv;
  readonly children: ReactNode;
}) {
  const { getAccessTokenSilently } = useAuth0();
  const expireSession = useSessionExpiry();

  const clients = useMemo(() => {
    const getAccessToken: GetAccessToken = async (options) => {
      try {
        const token = await getAccessTokenSilently({ cacheMode: options?.cacheMode });
        if (token === undefined) {
          throw new SessionExpiredError();
        }
        return token;
      } catch (error) {
        throw mapAuth0TokenError(error);
      }
    };

    const onSessionExpired = () => {
      void expireSession();
    };

    // The same token for every API: one session, with the audience of the MailySoft APIs.
    return {
      users: createHttpClient({
        baseUrl: env.VITE_USERS_API_URL,
        getAccessToken,
        onSessionExpired,
      }),
      subscriptions: createHttpClient({
        baseUrl: env.VITE_SUBSCRIPTIONS_API_URL,
        getAccessToken,
        onSessionExpired,
      }),
      // Without the token: only the direct check of feature 016 asks them (research D4).
      healthServices: env.VITE_HEALTH_DIRECT_SERVICES.map(({ code, name, url }) => ({
        code,
        name,
        client: createAnonymousHttpClient({ baseUrl: url }),
      })),
    };
  }, [
    env.VITE_USERS_API_URL,
    env.VITE_SUBSCRIPTIONS_API_URL,
    env.VITE_HEALTH_DIRECT_SERVICES,
    getAccessTokenSilently,
    expireSession,
  ]);

  return <HttpClientsContext.Provider value={clients}>{children}</HttpClientsContext.Provider>;
}
