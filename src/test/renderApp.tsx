import { Auth0Provider, ResponseType, type User } from '@auth0/auth0-react';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { ThemeProvider } from '@mui/material/styles';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createBrowserRouter } from 'react-router';
import { vi } from 'vitest';

import type { AppEnv } from '@/app/config/env';
import { redirectToReturnPath } from '@/app/providers/AppAuth0Provider';
import { AppRuntime } from '@/app/providers/AppRuntime';
import { appRoutes } from '@/app/router/routes';
import { theme } from '@/app/theme/theme';
import { NotificationsProvider } from '@/shared/ui/Notifications';

import { USERS_API_BASE_URL } from './handlers/usersService';

const env: AppEnv = {
  VITE_AUTH0_DOMAIN: 'tenant.us.auth0.com',
  VITE_AUTH0_CLIENT_ID: 'client-id',
  VITE_AUTH0_AUDIENCE: 'https://mailysoft-apis',
  VITE_USERS_API_URL: USERS_API_BASE_URL,
  VITE_CLINICS_API_URL: undefined,
  VITE_SUBSCRIPTIONS_API_URL: undefined,
  VITE_FEATURE_POSTMAN_TOKEN: false,
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
}

/**
 * Renders the whole application as production composes it (the real routes, guard and providers)
 * around an Auth0 client whose network-facing methods are replaced. Nothing else is simulated, so
 * the order in which Auth0, React and the router update (where most session bugs live) is the real
 * one. The users service is simulated at network level with `createUsersServiceMock`.
 */
export function renderApp(options: RenderAppOptions = {}) {
  window.history.replaceState(
    {},
    '',
    options.callback ? '/callback?code=abc&state=xyz' : (options.url ?? '/'),
  );
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
    .mockImplementation(() => Promise.resolve(`test-token:${sub}`));
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
    <ThemeProvider theme={theme}>
      <NotificationsProvider>
        <Auth0Provider client={client} onRedirectCallback={redirectToReturnPath(router)}>
          <AppRuntime env={env} router={router} />
        </Auth0Provider>
      </NotificationsProvider>
    </ThemeProvider>,
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
