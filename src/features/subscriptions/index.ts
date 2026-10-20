import { lazy } from 'react';

export type { SubscriptionCapabilities } from './policy/subscriptionActions';
export { parseSubscriptionId } from './schemas/subscriptionsLocation';

// The screens are lazy components, in this file and not in the application: `auth` imports this
// file to read `SubscriptionCapabilities`, and the layout reads `parseSubscriptionId` to title the
// routes, so a static export of a screen would take the Data Grid and the forms into the entry.
// Only what is light is exported statically (research D2).
export const SubscriptionsListPage = lazy(() =>
  import('./components/SubscriptionsListPage').then((module) => ({
    default: module.SubscriptionsListPage,
  })),
);
export const SubscriptionDetailPage = lazy(() =>
  import('./components/SubscriptionDetailPage').then((module) => ({
    default: module.SubscriptionDetailPage,
  })),
);
export const SubscriptionCreatePage = lazy(() =>
  import('./components/SubscriptionCreatePage').then((module) => ({
    default: module.SubscriptionCreatePage,
  })),
);
export const SubscriptionEditPage = lazy(() =>
  import('./components/SubscriptionEditPage').then((module) => ({
    default: module.SubscriptionEditPage,
  })),
);
