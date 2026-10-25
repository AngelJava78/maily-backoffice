import { Auth0Context } from '@auth0/auth0-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createContext,
  isValidElement,
  useContext,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  createMemoryRouter,
  type DataRouter,
  type InitialEntry,
  type RouteObject,
} from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import { AppSettingsProvider } from '@/app/providers/AppSettingsProvider';
import { ThemeModeProvider } from '@/app/providers/ThemeModeProvider';
import { accessKeys } from '@/features/auth/hooks/accessKeys';
import { SessionProvider } from '@/features/auth/hooks/sessionContext';
import type { AccessDecision, OperatorAccess } from '@/features/auth/policy/types';
import { createHttpClient, type GetAccessToken } from '@/shared/api/httpClient';
import { HttpClientsContext, type NamedHttpClient } from '@/shared/api/httpClientsContext';
import { NotificationsProvider } from '@/shared/ui/Notifications';

import { auth0User, createAuth0Double, type Auth0Double, type Auth0State } from './auth0Double';
import { SUBSCRIPTIONS_API_BASE_URL } from './handlers/subscriptionsCatalog/baseUrl';
import { USERS_API_BASE_URL } from './handlers/usersService';

export interface HarnessOptions {
  /** Initial state of the Auth0 double; signed out by default. */
  readonly auth0?: Partial<Auth0State>;
  /**
   * When given, the tree renders as if this person, signed in with the Auth0 user (`auth0|user1`
   * unless said otherwise), had already been granted access: the answer is put in the cache where
   * the route guard keeps it.
   */
  readonly access?: OperatorAccess;
  /** Defaults to a client without retries; pass `createQueryClient()` to test the real policy. */
  readonly queryClient?: QueryClient;
  /** Shorthand for `initialEntries: [route]`; `/` by default. */
  readonly route?: string;
  readonly initialEntries?: InitialEntry[];
  /** Called when the HTTP client gives up on the session (a mock that does nothing by default). */
  readonly onSessionExpired?: () => void;
  /** Defaults to `test-token:<sub of the Auth0 user>`, the token the users service mock expects. */
  readonly getAccessToken?: GetAccessToken;
  /** The services of the direct check of feature 016 besides the two fixed ones; none by default. */
  readonly healthServices?: readonly NamedHttpClient[];
}

/** A value that a test can change while the tree is mounted, read with `useSyncExternalStore`. */
function createStore<T>(initial: T) {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set: (next: T) => {
      current = next;
      listeners.forEach((listener) => {
        listener();
      });
    },
  };
}

function createHarness(options: HarnessOptions) {
  const auth0 = createAuth0Double(
    options.access === undefined
      ? options.auth0
      : { isAuthenticated: true, user: auth0User(), ...options.auth0 },
  );
  const store = createStore<Auth0Double>(auth0);
  const queryClient =
    options.queryClient ??
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  const onSessionExpired = vi.fn<() => void>(options.onSessionExpired);
  const getAccessToken: GetAccessToken =
    options.getAccessToken ?? (() => Promise.resolve(`test-token:${store.get().user?.sub ?? ''}`));
  const clients = {
    users: createHttpClient({ baseUrl: USERS_API_BASE_URL, getAccessToken, onSessionExpired }),
    subscriptions: createHttpClient({
      baseUrl: SUBSCRIPTIONS_API_BASE_URL,
      getAccessToken,
      onSessionExpired,
    }),
    healthServices: options.healthServices ?? [],
  };

  function grantAccess(access: OperatorAccess): void {
    const granted: AccessDecision = { kind: 'granted', access };
    queryClient.setQueryData(accessKeys.operator(auth0.user?.sub ?? null), granted);
  }
  if (options.access !== undefined) {
    grantAccess(options.access);
  }

  function Providers({ children }: { readonly children: ReactNode }) {
    const auth0Value = useSyncExternalStore(store.subscribe, store.get);
    return (
      // The settings the routes read: the Panel refreshes every 5 minutes, the health page every 30 s.
      <AppSettingsProvider
        env={{ VITE_DASHBOARD_REFRESH_MINUTES: 5, VITE_HEALTH_REFRESH_SECONDS: 30 }}
      >
        <Auth0Context.Provider value={auth0Value}>
          <QueryClientProvider client={queryClient}>
            <ThemeModeProvider>
              <NotificationsProvider>
                <SessionProvider>
                  <HttpClientsContext.Provider value={clients}>
                    {children}
                  </HttpClientsContext.Provider>
                </SessionProvider>
              </NotificationsProvider>
            </ThemeModeProvider>
          </QueryClientProvider>
        </Auth0Context.Provider>
      </AppSettingsProvider>
    );
  }

  return {
    Providers,
    auth0,
    queryClient,
    onSessionExpired,
    initialEntries: options.initialEntries ?? [options.route ?? '/'],
    /** Changes the Auth0 state (for example, signs the person in) and re-renders the tree. */
    updateAuth0: (state: Partial<Auth0State>): void => {
      act(() => {
        store.set({ ...store.get(), ...state });
      });
    },
    /** Changes the access of the person (for example, a permission is taken away). */
    updateAccess: async (access: OperatorAccess): Promise<void> => {
      // Async because TanStack Query tells its observers on a later tick (a zero-delay timer).
      await act(async () => {
        grantAccess(access);
        if (vi.isFakeTimers()) {
          await vi.advanceTimersByTimeAsync(0);
        } else {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      });
    },
  };
}

/** `userEvent` that moves the fake clock along when a test uses fake timers. */
function createUser() {
  return vi.isFakeTimers()
    ? userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) })
    : userEvent.setup();
}

/** A component becomes the only route, a route list becomes the tree, a router is used as is. */
function toRouter(
  ui: ReactElement | RouteObject[] | DataRouter,
  initialEntries: InitialEntry[],
): DataRouter {
  if (isValidElement(ui)) {
    return createMemoryRouter([{ path: '*', element: ui }], { initialEntries });
  }
  return Array.isArray(ui) ? createMemoryRouter(ui, { initialEntries }) : ui;
}

/**
 * Renders a component, a route tree or a router already created (for the cases in which the
 * routes need the router itself) inside every provider of the application: the Auth0 double,
 * TanStack Query, the theme, notifications, the HTTP clients and a memory router.
 */
export function renderWithProviders(
  ui: ReactElement | RouteObject[] | DataRouter,
  options: HarnessOptions = {},
) {
  const harness = createHarness(options);
  const router = toRouter(ui, harness.initialEntries);

  const result = render(
    <harness.Providers>
      <RouterProvider router={router} />
    </harness.Providers>,
  );

  return {
    ...result,
    user: createUser(),
    router,
    queryClient: harness.queryClient,
    auth0: harness.auth0.mocks,
    updateAuth0: harness.updateAuth0,
    updateAccess: harness.updateAccess,
    onSessionExpired: harness.onSessionExpired,
  };
}

const HookChildrenContext = createContext<ReactNode>(null);

function HookHost() {
  return <>{useContext(HookChildrenContext)}</>;
}

/**
 * Wrapper for `renderHook` with the same providers and a memory router, so hooks can use the
 * router, the query client and Auth0 as they do in the application.
 */
export function createWrapper(options: HarnessOptions = {}) {
  const harness = createHarness(options);
  const router = createMemoryRouter([{ path: '*', element: <HookHost /> }], {
    initialEntries: harness.initialEntries,
  });

  function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <harness.Providers>
        <HookChildrenContext.Provider value={children}>
          <RouterProvider router={router} />
        </HookChildrenContext.Provider>
      </harness.Providers>
    );
  }

  return {
    wrapper: Wrapper,
    router,
    queryClient: harness.queryClient,
    auth0: harness.auth0.mocks,
    updateAuth0: harness.updateAuth0,
    updateAccess: harness.updateAccess,
    onSessionExpired: harness.onSessionExpired,
  };
}
