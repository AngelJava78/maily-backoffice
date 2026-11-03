import type { Role } from './role';

/**
 * What a list of roles by status gives so far (the active ones, or the blocked ones): still on its
 * way, failed, or the roles it brought.
 */
export type RoleListState =
  | { readonly status: 'pending' }
  | { readonly status: 'error' }
  | { readonly status: 'success'; readonly roles: readonly Role[] };

/** What the screen of the detail of a role shows (feature 027, data-model §5). */
export type RoleView =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error' }
  | { readonly kind: 'active'; readonly role: Role }
  | { readonly kind: 'blocked'; readonly role: Role }
  | { readonly kind: 'notFound' };

/**
 * Decides the view of a role from the two lists by status (research D5). The service gives no
 * detail of a blocked role, so a role that is not among the active ones can only be found in the
 * list of the blocked ones, which is asked for only then (`blocked` is `undefined` until it is).
 * A role that was shown as active and is not among them any more was deleted or blocked from
 * another session while it was open: it says «no longer exists» (FR-014) instead of changing under
 * the feet of whoever is editing it.
 */
export function resolveRoleView({
  roleId,
  active,
  blocked,
  shownAsActive,
}: {
  readonly roleId: number;
  readonly active: RoleListState;
  readonly blocked: RoleListState | undefined;
  readonly shownAsActive: boolean;
}): RoleView {
  if (active.status === 'pending') {
    return { kind: 'loading' };
  }
  if (active.status === 'error') {
    return { kind: 'error' };
  }
  const activeRole = active.roles.find((candidate) => candidate.id === roleId);
  if (activeRole !== undefined) {
    return { kind: 'active', role: activeRole };
  }
  if (shownAsActive) {
    return { kind: 'notFound' };
  }
  if (blocked === undefined || blocked.status === 'pending') {
    return { kind: 'loading' };
  }
  if (blocked.status === 'error') {
    return { kind: 'error' };
  }
  const blockedRole = blocked.roles.find((candidate) => candidate.id === roleId);
  return blockedRole === undefined ? { kind: 'notFound' } : { kind: 'blocked', role: blockedRole };
}
