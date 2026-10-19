import { lazy } from 'react';
import type { RouteObject } from 'react-router';

import { AccessPage, CallbackPage } from '@/features/auth';

import { AppLayout } from '../layouts/AppLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RouteErrorBoundary } from './RouteErrorBoundary';

// Each page is a separate chunk, loaded when its route is first visited (constitution VIII).
const HomePage = lazy(() =>
  import('@/features/home').then((module) => ({ default: module.HomePage })),
);
const ProfilePage = lazy(() =>
  import('@/features/profile').then((module) => ({ default: module.ProfilePage })),
);
const NotFoundPage = lazy(() =>
  import('../pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);

/**
 * The routes of the application (contracts/app-routes.md). The root and every page define a route
 * error boundary: an error in a page shows inside the layout, with the header and the log out
 * button still in place, and one in a layout or provider is caught by the root.
 */
export const appRoutes: RouteObject[] = [
  {
    ErrorBoundary: RouteErrorBoundary,
    children: [
      {
        Component: PublicLayout,
        children: [
          {
            path: '/access',
            Component: AccessPage,
            handle: { titleKey: 'access' },
            ErrorBoundary: RouteErrorBoundary,
          },
          {
            path: '/access/idle',
            element: <AccessPage idle />,
            handle: { titleKey: 'access' },
            ErrorBoundary: RouteErrorBoundary,
          },
          {
            path: '/callback',
            Component: CallbackPage,
            handle: { titleKey: 'access' },
            ErrorBoundary: RouteErrorBoundary,
          },
        ],
      },
      {
        Component: ProtectedRoute,
        children: [
          {
            Component: AppLayout,
            children: [
              {
                index: true,
                Component: HomePage,
                handle: { titleKey: 'home' },
                ErrorBoundary: RouteErrorBoundary,
              },
              {
                path: '/profile',
                Component: ProfilePage,
                handle: { titleKey: 'profile' },
                ErrorBoundary: RouteErrorBoundary,
              },
              // Inside the protected layout: without a session the guard sends to the access screen
              // first (FR-001), and only someone with access sees that the address does not exist.
              {
                path: '*',
                Component: NotFoundPage,
                handle: { titleKey: 'notFound' },
                ErrorBoundary: RouteErrorBoundary,
              },
            ],
          },
        ],
      },
    ],
  },
];
