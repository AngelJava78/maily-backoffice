import { lazy } from 'react';

import { useAppSettings } from '../providers/AppSettingsProvider';

// A separate chunk, loaded when the route is first visited (constitution: Rendimiento y
// observabilidad): the summary of the Panel travels inside it.
const HomePage = lazy(() =>
  import('@/features/home').then((module) => ({ default: module.HomePage })),
);

/**
 * The Panel (feature 007): the home page with the refresh interval of the configuration, which the
 * features cannot read by themselves (research D11).
 */
export function HomeRoute() {
  const { dashboardRefreshMs } = useAppSettings();
  return <HomePage dashboardRefreshMs={dashboardRefreshMs} />;
}
