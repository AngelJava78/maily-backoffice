/** What the operator may do in Roles y permisos (feature 014), decided in `app` from `auth`. */
export interface RoleCapabilities {
  /** "Nuevo role" and "Duplicar" (research D7: duplicating is creating, under the hood). */
  readonly canCreate: boolean;
  /** Renaming/describing a role and changing its permission matrix (FR-010, FR-021). */
  readonly canEdit: boolean;
  readonly canDelete: boolean;
}
