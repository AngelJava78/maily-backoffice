import { Auth0Provider, type AppState } from '@auth0/auth0-react';
import type { ReactNode } from 'react';
import type { DataRouter } from 'react-router';

import { toSafeInternalPath } from '@/shared/lib/safeReturnPath';

import type { AppEnv } from '../config/env';

/** What to do when the sign in completes: go to where the person was heading, if it is safe. */
export function redirectToReturnPath(router: DataRouter): (appState?: AppState) => void {
  return (appState) => {
    void router.navigate(toSafeInternalPath(appState?.returnTo), { replace: true });
  };
}

interface AppAuth0ProviderProps {
  readonly env: AppEnv;
  /** The router that takes the person to where they were going once the sign-in completes. */
  readonly router: DataRouter;
  readonly children: ReactNode;
}

/**
 * Auth0 as a public Single Page Application (contracts/auth0-configuration.md): authorization
 * code with PKCE, tokens in memory only and refresh token rotation (constitution V). The scope
 * has `email` only to show the account on the access denied and check failed screens; the name
 * and every other datum of the person come from the users service, not from Auth0.
 */
export function AppAuth0Provider({ env, router, children }: AppAuth0ProviderProps) {
  return (
    <Auth0Provider
      domain={env.VITE_AUTH0_DOMAIN}
      clientId={env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        audience: env.VITE_AUTH0_AUDIENCE,
        redirect_uri: `${window.location.origin}/callback`,
        scope: 'openid email offline_access',
      }}
      cacheLocation="memory"
      useRefreshTokens
      useRefreshTokensFallback
      legacySameSiteCookie={false}
      onRedirectCallback={redirectToReturnPath(router)}
    >
      {children}
    </Auth0Provider>
  );
}
