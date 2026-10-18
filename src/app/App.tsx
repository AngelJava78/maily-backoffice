import type { DataRouter } from 'react-router';

import { useReloadOnBfcacheRestore } from '@/features/auth';

import type { AppEnv } from './config/env';
import { AppProviders } from './providers/AppProviders';

/** The application: every provider around the routes. */
export function App({ env, router }: { readonly env: AppEnv; readonly router: DataRouter }) {
  useReloadOnBfcacheRestore();

  return <AppProviders env={env} router={router} />;
}
