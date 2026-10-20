import type { DataRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { SessionProvider } from '@/features/auth';

import type { AppEnv } from '../config/env';
import { AppQueryProvider } from './AppQueryProvider';
import { AppSettingsProvider } from './AppSettingsProvider';
import { HttpClientsProvider } from './HttpClientsProvider';

/**
 * Everything that runs inside Auth0: the settings the routes read, server state, the state of the
 * session, the HTTP clients and the routes. It is apart from `AppProviders` so that the tests can
 * put a fake Auth0 client around the very same tree that production runs.
 */
export function AppRuntime({ env, router }: { readonly env: AppEnv; readonly router: DataRouter }) {
  return (
    <AppSettingsProvider env={env}>
      <AppQueryProvider>
        <SessionProvider>
          <HttpClientsProvider env={env}>
            <RouterProvider router={router} />
          </HttpClientsProvider>
        </SessionProvider>
      </AppQueryProvider>
    </AppSettingsProvider>
  );
}
