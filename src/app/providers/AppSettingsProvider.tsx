import { createContext, useContext, useState, type ReactNode } from 'react';

import type { AppEnv } from '../config/env';

/** What the routes need of the configuration, worked out from the validated environment. */
export interface AppSettings {
  /** Milliseconds between two automatic refreshes of the Panel (feature 007, FR-016). */
  readonly dashboardRefreshMs: number;
}

const MS_PER_MINUTE = 60_000;

const AppSettingsContext = createContext<AppSettings | null>(null);

/**
 * The configuration that a route needs (constitution III). It is fixed when the application is
 * built and never changes, and the routes are created once in a module, so a context is the way
 * for a route to read it: today, only the interval of the Panel (research D11 of feature 007).
 */
export function AppSettingsProvider({
  env,
  children,
}: {
  readonly env: Pick<AppEnv, 'VITE_DASHBOARD_REFRESH_MINUTES'>;
  readonly children: ReactNode;
}) {
  // Worked out once: the configuration of a build does not change while it runs.
  const [settings] = useState<AppSettings>(() => ({
    dashboardRefreshMs: env.VITE_DASHBOARD_REFRESH_MINUTES * MS_PER_MINUTE,
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
