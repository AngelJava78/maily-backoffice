import type { PlatformUser } from '@/features/users';

import type { AccessRole } from '../schemas/myAccess';

/** What an operator who may enter the backoffice can do (cached by TanStack Query only). */
export interface OperatorAccess {
  readonly user: PlatformUser;
  /** Active roles of the user, of any type. */
  readonly roles: readonly AccessRole[];
  /** The roles of type Sistema: only their permissions count inside the Backoffice (feature 006). */
  readonly authorizedRoles: readonly AccessRole[];
  /** Union of the permissions of the authorized roles; it may be empty (FR-018). */
  readonly permissions: ReadonlySet<string>;
}

/**
 * `denied` carries no reason (feature 006, FR-003): not registered, not Active and no role of
 * type Sistema all show the same single "Sin acceso" message, so there is nothing to tell apart.
 * It still carries `userEmail` — not a reason, just data for FR-014's "Iniciaste sesión como"
 * line: the e-mail of the MailySoft user, when the query found one, or `null` when it did not
 * (not registered, or a 403/404 treated as denied, FR-023).
 */
export type AccessDecision =
  | { readonly kind: 'granted'; readonly access: OperatorAccess }
  | { readonly kind: 'denied'; readonly userEmail: string | null };
