import { lazy } from 'react';

export type { RoleCapabilities } from './policy/roleCapabilities';

// Lazy, in this file and not in the application (same pattern as `modules`, `users` and
// `subscriptions`): the router imports `RolesRoute` statically, so a static export took the whole
// screen (the matrix, its dialogs and Zod schemas) into the entry route. It only loads once someone
// actually opens `/roles`.
export const RolesPage = lazy(() =>
  import('./components/RolesPage').then((module) => ({ default: module.RolesPage })),
);
