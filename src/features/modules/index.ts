import { lazy } from 'react';

/**
 * What the operator may do in the Módulos section (spec 013, FR-008 to FR-024). `features/auth`
 * decides it with `can()` (the single place that knows the permissions, constitution V) and the
 * application hands the result to the screen; this feature never reads permissions.
 */
export interface ModuleCapabilities {
  readonly canCreate: boolean;
  /** Name, description, order and the actions a module has (FR-014, FR-016, FR-017). */
  readonly canEdit: boolean;
  readonly canBlock: boolean;
  readonly canUnblock: boolean;
  readonly canDelete: boolean;
}

// Lazy, in this file and not in the application (same pattern as `users`/`subscriptions`): the
// screen, its form panels and its Zod schemas only load once someone actually opens `/modules`.
export const ModulesPage = lazy(() =>
  import('./components/ModulesPage').then((module) => ({ default: module.ModulesPage })),
);
