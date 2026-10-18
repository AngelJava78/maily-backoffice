import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import type { DataRouter } from 'react-router';

import { messages } from '@/shared/messages/es';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { ErrorState } from '@/shared/ui/ErrorState';
import { NotificationsProvider } from '@/shared/ui/Notifications';

import type { AppEnv } from '../config/env';
import { theme } from '../theme/theme';
import { AppAuth0Provider } from './AppAuth0Provider';
import { AppRuntime } from './AppRuntime';

interface AppProvidersProps {
  readonly env: AppEnv;
  readonly router: DataRouter;
}

/**
 * Every provider of the application, outermost first. The theme wraps the global error boundary
 * so that even its fallback is styled, and the routes sit inside Auth0 (see `AppRuntime`).
 */
export function AppProviders({ env, router }: AppProvidersProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
    </ThemeProvider>
  );
}
