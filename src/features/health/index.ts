import { lazy } from 'react';

// The public face of «Salud de servicios» (feature 016, research D1): the lazy screens of the page and
// of the registry, the lazy section of the access-check failure screen with its light placeholders,
// `parseComponentId`, `useForgetHealthData` and the types `HealthCapabilities` and `BackofficeBuild`.
// Nothing here imports `features/auth`; the application hands the feature what it needs.

export type { BackofficeBuild } from './policy/backofficeBuild';
export type { HealthCapabilities } from './policy/healthCapabilities';
// Light: the failure screen shows them while the lazy section loads, or if it cannot (research D9).
export {
  FallbackFailedPlaceholder,
  FallbackLoadingPlaceholder,
} from './components/FallbackPlaceholders';
export { parseComponentId } from './schemas/componentId';
export { useForgetHealthData } from './hooks/useForgetHealthData';

// The screens are lazy components, in this file and not in the application (same pattern as
// `subscriptions`): `auth` imports this file to read `HealthCapabilities`, and the layout reads
// `parseComponentId` to title the routes, so a static export of a screen would take the pages,
// their schemas, their queries and the Data Grid into the entry (research D20).
export const HealthPage = lazy(() =>
  import('./pages/HealthPage').then((module) => ({ default: module.HealthPage })),
);
export const AccessCheckFallback = lazy(() =>
  import('./components/AccessCheckFallback').then((module) => ({
    default: module.AccessCheckFallback,
  })),
);
export const MonitoredComponentsListPage = lazy(() =>
  import('./pages/MonitoredComponentsListPage').then((module) => ({
    default: module.MonitoredComponentsListPage,
  })),
);
export const MonitoredComponentDetailPage = lazy(() =>
  import('./pages/MonitoredComponentDetailPage').then((module) => ({
    default: module.MonitoredComponentDetailPage,
  })),
);
export const MonitoredComponentCreatePage = lazy(() =>
  import('./pages/MonitoredComponentCreatePage').then((module) => ({
    default: module.MonitoredComponentCreatePage,
  })),
);
export const MonitoredComponentEditPage = lazy(() =>
  import('./pages/MonitoredComponentEditPage').then((module) => ({
    default: module.MonitoredComponentEditPage,
  })),
);
