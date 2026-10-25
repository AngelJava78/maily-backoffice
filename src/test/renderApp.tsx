import { Auth0Provider, ResponseType, type User } from '@auth0/auth0-react';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createBrowserRouter } from 'react-router';
import { vi } from 'vitest';

import type { AppEnv } from '@/app/config/env';
import { redirectToReturnPath } from '@/app/providers/AppAuth0Provider';
import { AppRuntime } from '@/app/providers/AppRuntime';
import { ThemeModeProvider } from '@/app/providers/ThemeModeProvider';
import { appRoutes } from '@/app/router/routes';
import { NotificationsProvider } from '@/shared/ui/Notifications';

import { SUBSCRIPTIONS_API_BASE_URL } from './handlers/subscriptionsCatalog/baseUrl';
import { USERS_API_BASE_URL } from './handlers/usersService';

const defaultEnv: AppEnv = {
  VITE_AUTH0_DOMAIN: 'tenant.us.auth0.com',
  VITE_AUTH0_CLIENT_ID: 'client-id',
  VITE_AUTH0_AUDIENCE: 'https://mailysoft-apis',
  VITE_USERS_API_URL: USERS_API_BASE_URL,
  VITE_CLINICS_API_URL: undefined,
  VITE_SUBSCRIPTIONS_API_URL: SUBSCRIPTIONS_API_BASE_URL,
  VITE_DASHBOARD_REFRESH_MINUTES: 5,
  VITE_MAILYSOFT_APP_URL: undefined,
  VITE_HEALTH_REFRESH_SECONDS: 30,
  VITE_HEALTH_DIRECT_SERVICES: [],
};

export interface RenderAppOptions {
  /** Where the browser is when the application loads, such as `/profile?page=2`. */
  readonly url?: string;
  /** The Auth0 account; its `sub` is what the users service mock recognizes. */
  readonly sub?: string;
  /** The person already has a session when the page loads. */
  readonly signedIn?: boolean;
  /** The page is the Auth0 callback: the sign in completes and gives back this `appState`. */
  readonly callback?: { readonly appState?: { readonly returnTo?: string } };
  /**
   * The token that Auth0 hands out when it is asked for a new one with `cacheMode: 'off'`, which is
   * what the Token tool does (feature 005). Any other request still gets `test-token:<sub>`, the
   * one the users service mock recognizes. The HTTP client also asks with `cacheMode: 'off'` after
   * a `401`, which these tests do not provoke.
   */
  readonly freshAccessToken?: string;
  /** Configuration that differs from the one of the tests, such as a refresh of the Panel each minute. */
  readonly env?: Partial<AppEnv>;
}

/**
 * Renders the whole application as production composes it (the real routes, guard and providers)
 * around an Auth0 client whose network-facing methods are replaced. Nothing else is simulated, so
 * the order in which Auth0, React and the router update (where most session bugs live) is the real
 * one. The users service is simulated at network level: with `createUsersDirectoryMock` (the data and the rules of the service) or, in the tests of the access of feature 001, with `createUsersServiceMock` (only `me`).
 */
export function renderApp(options: RenderAppOptions = {}) {
  window.history.replaceState(
    {},
    '',
    options.callback ? '/callback?code=abc&state=xyz' : (options.url ?? '/'),
  );
  const env: AppEnv = { ...defaultEnv, ...options.env };
  const sub = options.sub ?? 'auth0|user1';
  const account: User = { sub, email: 'cuenta@ejemplo.com' };
  let signedIn = options.signedIn ?? false;

  const client = new Auth0Client({
    domain: env.VITE_AUTH0_DOMAIN,
    clientId: env.VITE_AUTH0_CLIENT_ID,
    cacheLocation: 'memory',
  });
  vi.spyOn(client, 'getUser').mockImplementation(() =>
    Promise.resolve(signedIn ? account : undefined),
  );
  vi.spyOn(client, 'checkSession').mockResolvedValue(undefined);
  vi.spyOn(client, 'getIdTokenClaims').mockResolvedValue(undefined);
  vi.spyOn(client, 'handleRedirectCallback').mockImplementation(() => {
    signedIn = true;
    return Promise.resolve({
      appState: options.callback?.appState,
      response_type: ResponseType.Code,
    });
  });
  const getTokenSilently = vi
    .spyOn(client, 'getTokenSilently')
    .mockImplementation((tokenOptions) =>
      Promise.resolve(
        tokenOptions?.cacheMode === 'off' && options.freshAccessToken !== undefined
          ? options.freshAccessToken
          : `test-token:${sub}`,
      ),
    );
  const logout = vi.spyOn(client, 'logout').mockImplementation(() => {
    signedIn = false;
    return Promise.resolve();
  });

  const router = createBrowserRouter(appRoutes);
  /** Every address the router went through, in order. */
  const trail: string[] = [];
  router.subscribe((state) => {
    trail.push(`${state.location.pathname}${state.location.search}`);
  });

  const view = render(
    <ThemeModeProvider>
      <NotificationsProvider>
        <Auth0Provider client={client} onRedirectCallback={redirectToReturnPath(router)}>
          <AppRuntime env={env} router={router} />
        </Auth0Provider>
      </NotificationsProvider>
    </ThemeModeProvider>,
  );

  return {
    ...view,
    user: vi.isFakeTimers()
      ? userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) })
      : userEvent.setup(),
    router,
    trail,
    getTokenSilently,
    logout,
    /** What the SDK does by itself when it finds the session over: it forgets the person first. */
    forgetSession: (): void => {
      signedIn = false;
    },
  };
}
