import { lazy } from 'react';

export type { RoleCapabilities } from './policy/roleCapabilities';
export { parseRoleId } from './schemas/rolePermissionsLocation';

// Lazy, in this file and not in the application (same pattern as `modules`, `users` and
// `subscriptions`): the router imports `RolesRoute` statically, so a static export took the whole
// screen (the table, the matrix, its dialogs and Zod schemas) into the entry route. They only load
// once someone actually opens `/roles` or the detail of a role.
export const RolesPage = lazy(() =>
  import('./components/RolesPage').then((module) => ({ default: module.RolesPage })),
);
export const RoleDetailPage = lazy(() =>
  import('./components/RoleDetailPage').then((module) => ({ default: module.RoleDetailPage })),
);
