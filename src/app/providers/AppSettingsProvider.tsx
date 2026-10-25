import { createContext, useContext, useState, type ReactNode } from 'react';

import type { BackofficeBuild } from '@/features/health';

import { parseBuildInfo } from '../config/buildInfo';
import type { AppEnv } from '../config/env';

/** What the routes need of the configuration, worked out from the validated environment. */
export interface AppSettings {
  /** Milliseconds between two automatic refreshes of the Panel (feature 007, FR-016). */
  readonly dashboardRefreshMs: number;
  /** FR-015 of feature 006: URL of MailySoft's clinic-facing app, or `undefined` unconfigured. */
  readonly mailySoftAppUrl: string | undefined;
  /** Milliseconds between two automatic refreshes of «Salud de servicios» (feature 016, FR-046). */
  readonly healthRefreshMs: number;
  /** The identification of this build of the Backoffice (feature 016, FR-044). */
  readonly backofficeBuild: BackofficeBuild;
}

const MS_PER_MINUTE = 60_000;
const MS_PER_SECOND = 1_000;

const AppSettingsContext = createContext<AppSettings | null>(null);

/**
 * The configuration that a route needs (constitution III). It is fixed when the application is
 * built and never changes, and the routes are created once in a module, so a context is the way
 * for a route to read it: the intervals of the Panel (research D11 of feature 007) and of
 * «Salud de servicios» (feature 016), and the link of "Sin acceso".
 */
export function AppSettingsProvider({
  env,
  children,
}: {
  readonly env: Pick<
    AppEnv,
    'VITE_DASHBOARD_REFRESH_MINUTES' | 'VITE_MAILYSOFT_APP_URL' | 'VITE_HEALTH_REFRESH_SECONDS'
  >;
  readonly children: ReactNode;
}) {
  // Worked out once: the configuration of a build does not change while it runs.
  const [settings] = useState<AppSettings>(() => ({
    dashboardRefreshMs: env.VITE_DASHBOARD_REFRESH_MINUTES * MS_PER_MINUTE,
    mailySoftAppUrl: env.VITE_MAILYSOFT_APP_URL,
    healthRefreshMs: env.VITE_HEALTH_REFRESH_SECONDS * MS_PER_SECOND,
    backofficeBuild: parseBuildInfo({
      version: __APP_VERSION__,
      commit: __APP_COMMIT_SHA__,
      buildDate: __APP_BUILD_DATE__,
    }),
  }));

  return <AppSettingsContext.Provider value={settings}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings(): AppSettings {
  const settings = useContext(AppSettingsContext);
  if (settings === null) {
    throw new Error('useAppSettings must be used inside an AppSettingsProvider');
  }
  return settings;
}
