import type { DataRouter } from 'react-router';

import { messages } from '@/shared/messages/es';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { ErrorState } from '@/shared/ui/ErrorState';
import { NotificationsProvider } from '@/shared/ui/Notifications';

import type { AppEnv } from '../config/env';
import { AppAuth0Provider } from './AppAuth0Provider';
import { AppRuntime } from './AppRuntime';
import { ThemeModeProvider } from './ThemeModeProvider';

interface AppProvidersProps {
  readonly env: AppEnv;
  readonly router: DataRouter;
}

/**
 * Every provider of the application, outermost first. The theme (009-dark-mode-toggle: light/dark,
 * owned by `ThemeModeProvider`) wraps the global error boundary so that even its fallback is
 * styled, and the routes sit inside Auth0 (see `AppRuntime`).
 */
export function AppProviders({ env, router }: AppProvidersProps) {
  return (
    <ThemeModeProvider>
      <ErrorBoundary
        fallback={
          <ErrorState title={messages.errors.routeTitle} message={messages.errors.unexpected} />
        }
      >
        <NotificationsProvider>
          <AppAuth0Provider env={env} router={router}>
            <AppRuntime env={env} router={router} />
          </AppAuth0Provider>
        </NotificationsProvider>
      </ErrorBoundary>
    </ThemeModeProvider>
  );
}
