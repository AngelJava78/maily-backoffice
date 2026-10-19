/**
 * System roles that give access to the backoffice (FR-004). This list is provisional: the future
 * role type (system role or user role) will replace it. It is the only module that names roles
 * (constitution V); everything else asks `isAuthorizedRoleName` or `can`.
 */
export const AUTHORIZED_ROLE_NAMES = [
  'Administrator',
  'Developer',
  'Marketing',
  'Billing',
] as const;

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

const normalizedNames: ReadonlySet<string> = new Set(AUTHORIZED_ROLE_NAMES.map(normalize));

/** Compares ignoring case and surrounding spaces. */
export function isAuthorizedRoleName(name: string): boolean {
  return normalizedNames.has(normalize(name));
}
