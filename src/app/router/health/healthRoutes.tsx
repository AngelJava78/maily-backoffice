import { Outlet, type RouteObject } from 'react-router';

import { RequirePermission } from '@/features/auth';

import { RouteErrorBoundary } from '../RouteErrorBoundary';
import { HealthRoute } from './HealthRoute';
import {
  MonitoredComponentCreateRoute,
  MonitoredComponentDetailRoute,
  MonitoredComponentEditRoute,
  MonitoredComponentsListRoute,
} from './MonitoredComponentRoutes';

/**
 * «Salud de servicios» (feature 016, contracts/app-routes.md): seeing it, and its registry of
 * components, needs `health:read`, and each screen of the registry asks for more when it does more.
 * In a module of its own because `routes.tsx` is close to the limit of 250 lines (constitution I).
 */
export const healthRoute: RouteObject = {
  path: '/health',
  element: (
    <RequirePermission resource="health">
      <Outlet />
    </RequirePermission>
  ),
  ErrorBoundary: RouteErrorBoundary,
  children: [
    {
      index: true,
      Component: HealthRoute,
      handle: { titleKey: 'health' },
      ErrorBoundary: RouteErrorBoundary,
    },
    {
      path: 'components',
      Component: MonitoredComponentsListRoute,
      handle: { titleKey: 'healthComponents' },
      ErrorBoundary: RouteErrorBoundary,
    },
    // Before `:componentId`, which would take "new" for an id.
    {
      path: 'components/new',
      Component: MonitoredComponentCreateRoute,
      handle: { titleKey: 'healthComponentCreate' },
      ErrorBoundary: RouteErrorBoundary,
    },
    {
      path: 'components/:componentId',
      Component: MonitoredComponentDetailRoute,
      handle: { titleKey: 'healthComponentDetail', componentIdParam: 'componentId' },
      ErrorBoundary: RouteErrorBoundary,
    },
    {
      path: 'components/:componentId/edit',
      Component: MonitoredComponentEditRoute,
      handle: { titleKey: 'healthComponentEdit', componentIdParam: 'componentId' },
      ErrorBoundary: RouteErrorBoundary,
    },
  ],
};
