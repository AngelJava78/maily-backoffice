import { USER_STATUS } from '../schemas/userStatus';

/** What an operator can do with a user that already exists. */
export type UserAction =
  'edit' | 'addRole' | 'removeRole' | 'block' | 'unblock' | 'delete' | 'reactivate';

/**
 * What the operator is allowed to do in the users section. `features/auth` decides it with `can()`
 * (the single place that knows the permissions, constitution V) and the application hands the
 * result to the screens; the users feature never reads permissions.
 */
export interface UserCapabilities {
  /** Create a user and give it its first roles. */
  readonly canCreate: boolean;
  readonly canEdit: boolean;
  readonly canAddRoles: boolean;
  readonly canRemoveRoles: boolean;
  /** Block, unblock and reactivate. */
  readonly canChangeStatus: boolean;
  readonly canDelete: boolean;
}

/** The actions each status admits (FR-019). A status that is not listed admits none. */
const ACTIONS_BY_STATUS = new Map<number, readonly UserAction[]>([
  [USER_STATUS.ACTIVE, ['edit', 'addRole', 'removeRole', 'block', 'delete']],
  [USER_STATUS.BLOCKED, ['unblock']],
  [USER_STATUS.DELETED, ['reactivate']],
]);

/** Actions an operator cannot do on their own user (FR-012): a lock-out and privilege escalation guard. */
const SELF_PROTECTED: ReadonlySet<UserAction> = new Set<UserAction>([
  'block',
  'delete',
  'addRole',
  'removeRole',
]);

function isAllowedBy(action: UserAction, capabilities: UserCapabilities): boolean {
  switch (action) {
    case 'edit':
      return capabilities.canEdit;
    case 'addRole':
      return capabilities.canAddRoles;
    case 'removeRole':
      return capabilities.canRemoveRoles;
    case 'block':
    case 'unblock':
    case 'reactivate':
      return capabilities.canChangeStatus;
    case 'delete':
      return capabilities.canDelete;
  }
}

/**
 * The actions to offer for a user: those its status admits, the operator is allowed to do and are
 * not forbidden on their own user. The protection of the own user is a rule of the interface only;
 * the service does not enforce it.
 */
export function getAvailableActions({
  statusId,
  capabilities,
  isSelf,
}: {
  readonly statusId: number;
  readonly capabilities: UserCapabilities;
  /** The user is the operator who is looking at it. */
  readonly isSelf: boolean;
}): ReadonlySet<UserAction> {
  const admitted = ACTIONS_BY_STATUS.get(statusId) ?? [];
  return new Set(
    admitted.filter(
      (action) => isAllowedBy(action, capabilities) && !(isSelf && SELF_PROTECTED.has(action)),
    ),
  );
}
