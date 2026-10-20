import { lazy } from 'react';
import { Outlet, type RouteObject } from 'react-router';

import { AccessPage, CallbackPage, RequirePermission } from '@/features/auth';
import { messages } from '@/shared/messages/es';

import { AppLayout } from '../layouts/AppLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { NotFoundPage } from '../pages/LazyNotFoundPage';
import { HomeRoute } from './HomeRoute';
import { ProtectedRoute } from './ProtectedRoute';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { SubscriptionCreateRoute } from './subscriptions/SubscriptionCreateRoute';
import { SubscriptionDetailRoute } from './subscriptions/SubscriptionDetailRoute';
import { SubscriptionEditRoute } from './subscriptions/SubscriptionEditRoute';
import { SubscriptionsListRoute } from './subscriptions/SubscriptionsListRoute';
import { UserCreateRoute } from './users/UserCreateRoute';
import { UserDetailRoute } from './users/UserDetailRoute';
import { UserEditRoute } from './users/UserEditRoute';
import { UsersListRoute } from './users/UsersListRoute';

// Each page is a separate chunk, loaded when its route is first visited (constitution: Rendimiento
// y observabilidad); the one of the Panel is defined by `HomeRoute`.
const ProfilePage = lazy(() =>
  import('@/features/profile').then((module) => ({ default: module.ProfilePage })),
);
// Nothing else imports the Token tool, and this chunk is only asked for once the permission guard
// lets the person in (constitution V, "Herramienta temporal").
const TokenPage = lazy(() =>
  import('@/features/postman-token').then((module) => ({ default: module.TokenPage })),
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
              // The Panel (feature 007): no permission of its own, `dashboard:read` only decides
              // what it shows (contracts/app-routes.md).
              {
                index: true,
                Component: HomeRoute,
                handle: { titleKey: 'home' },
                ErrorBoundary: RouteErrorBoundary,
              },
              {
                path: '/profile',
                Component: ProfilePage,
                handle: { titleKey: 'profile' },
                ErrorBoundary: RouteErrorBoundary,
              },
              // The users section: seeing it needs `users:read`, and each screen asks for more when
              // it does more (feature 002, contracts/app-routes.md).
              {
                path: '/users',
                element: (
                  <RequirePermission resource="users">
                    <Outlet />
                  </RequirePermission>
                ),
                ErrorBoundary: RouteErrorBoundary,
                children: [
                  {
                    index: true,
                    Component: UsersListRoute,
                    handle: { titleKey: 'users' },
                    ErrorBoundary: RouteErrorBoundary,
                  },
                  {
                    path: 'new',
                    Component: UserCreateRoute,
                    handle: { titleKey: 'userCreate' },
                    ErrorBoundary: RouteErrorBoundary,
                  },
                  {
                    path: ':userId',
                    Component: UserDetailRoute,
                    handle: { titleKey: 'userDetail', userIdParam: 'userId' },
                    ErrorBoundary: RouteErrorBoundary,
                  },
                  {
                    path: ':userId/edit',
                    Component: UserEditRoute,
                    handle: { titleKey: 'userEdit', userIdParam: 'userId' },
                    ErrorBoundary: RouteErrorBoundary,
                  },
                ],
              },
              // The subscriptions section: seeing it needs `subscriptions:read`, and each screen asks
              // for more when it does more (feature 003, contracts/app-routes.md).
              {
                path: '/subscriptions',
                element: (
                  <RequirePermission resource="subscriptions">
                    <Outlet />
                  </RequirePermission>
                ),
                ErrorBoundary: RouteErrorBoundary,
                children: [
                  {
                    index: true,
                    Component: SubscriptionsListRoute,
                    handle: { titleKey: 'subscriptions' },
                    ErrorBoundary: RouteErrorBoundary,
                  },
                  // Before `:subscriptionId`, which would take "new" for an id.
                  {
                    path: 'new',
                    Component: SubscriptionCreateRoute,
                    handle: { titleKey: 'subscriptionCreate' },
                    ErrorBoundary: RouteErrorBoundary,
                  },
                  {
                    path: ':subscriptionId',
                    Component: SubscriptionDetailRoute,
                    handle: {
                      titleKey: 'subscriptionDetail',
                      subscriptionIdParam: 'subscriptionId',
                    },
                    ErrorBoundary: RouteErrorBoundary,
                  },
                  {
                    path: ':subscriptionId/edit',
                    Component: SubscriptionEditRoute,
                    handle: { titleKey: 'subscriptionEdit', subscriptionIdParam: 'subscriptionId' },
                    ErrorBoundary: RouteErrorBoundary,
                  },
                ],
              },
              // The Token tool (feature 005, contracts/app-routes.md): seeing it needs `token:read`,
              // and whoever lacks it is told so on the home page, in the words of the tool.
              {
                path: '/tools/postman-token',
                element: (
                  <RequirePermission resource="token" deniedNotice={messages.token.noPermission}>
                    <Outlet />
                  </RequirePermission>
                ),
                ErrorBoundary: RouteErrorBoundary,
                children: [
                  {
                    index: true,
                    Component: TokenPage,
                    handle: { titleKey: 'token' },
                    ErrorBoundary: RouteErrorBoundary,
                  },
                ],
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
