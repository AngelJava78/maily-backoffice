/**
 * What the operator may do in the registry of components (spec 016, FR-034 to FR-040).
 * `features/auth` decides it with `can()` (the single place that knows the permissions,
 * constitution V) and the application hands the result to the screens; this feature never reads
 * permissions.
 */
export interface HealthCapabilities {
  readonly canCreate: boolean;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
}
