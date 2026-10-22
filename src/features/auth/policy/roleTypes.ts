/**
 * Types of role of the platform catalog (feature 006, FR-002). This is the only module that
 * compares a role's type — everyone else asks `isSystemRoleType`, never the type's `name`, which
 * is catalog data and can be renamed or translated without changing anyone's access.
 */
export const ROLE_TYPE = { SYSTEM: 1, CLINIC: 2 } as const;

/** Only a role of type Sistema gives access to the Backoffice; Clínica and any other do not. */
export function isSystemRoleType(typeId: number): boolean {
  return typeId === ROLE_TYPE.SYSTEM;
}
