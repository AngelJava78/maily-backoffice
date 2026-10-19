import type { DataRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { SessionProvider } from '@/features/auth';

import type { AppEnv } from '../config/env';
import { AppQueryProvider } from './AppQueryProvider';
import { HttpClientsProvider } from './HttpClientsProvider';

/**
 * Everything that runs inside Auth0: server state, the state of the session, the HTTP clients and
 * the routes. It is apart from `AppProviders` so that the tests can put a fake Auth0 client around
 * the very same tree that production runs.
 */
export function AppRuntime({ env, router }: { readonly env: AppEnv; readonly router: DataRouter }) {
  return (
    <AppQueryProvider>
      <SessionProvider>
        <HttpClientsProvider env={env}>
          <RouterProvider router={router} />
        </HttpClientsProvider>
      </SessionProvider>
    </AppQueryProvider>
  );
}
