import type { PlatformUser } from '@/features/users';

import type { AccessRole } from '../schemas/myAccess';

/** What an operator who may enter the backoffice can do (cached by TanStack Query only). */
export interface OperatorAccess {
  readonly user: PlatformUser;
  /** Active roles of the user with their active permissions. */
  readonly roles: readonly AccessRole[];
  /** The roles that give access to the backoffice. */
  readonly authorizedRoles: readonly AccessRole[];
  /** Union of the permissions of the authorized roles; it may be empty (FR-018). */
  readonly permissions: ReadonlySet<string>;
}

export type AccessDeniedReason = 'not_registered' | 'inactive_account' | 'no_authorized_role';

export type AccessDecision =
  | { readonly kind: 'granted'; readonly access: OperatorAccess }
  | { readonly kind: 'denied'; readonly reason: AccessDeniedReason };
