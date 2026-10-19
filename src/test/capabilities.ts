import type { UserCapabilities } from '@/features/users';

/** Everything an operator with all the permissions of the users section can do. */
export const ALL_CAPABILITIES: UserCapabilities = {
  canCreate: true,
  canEdit: true,
  canAddRoles: true,
  canRemoveRoles: true,
  canChangeStatus: true,
  canDelete: true,
};

/** What an operator who can only read the users can do. */
export const NO_CAPABILITIES: UserCapabilities = {
  canCreate: false,
  canEdit: false,
  canAddRoles: false,
  canRemoveRoles: false,
  canChangeStatus: false,
  canDelete: false,
};

/** All the capabilities, except what is said otherwise. */
export function capabilities(overrides: Partial<UserCapabilities> = {}): UserCapabilities {
  return { ...ALL_CAPABILITIES, ...overrides };
}
