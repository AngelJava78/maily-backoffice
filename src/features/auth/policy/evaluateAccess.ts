import { isActiveStatus } from '@/features/users';

import type { MyAccess } from '../schemas/myAccess';
import { isSystemRoleType } from './roleTypes';
import type { AccessDecision } from './types';

/**
 * Turns what the users service knows about the person into the access decision (feature 006,
 * FR-001 to FR-006): registered, Active, and with at least one role of type Sistema. Only the
 * permissions of the roles of type Sistema count; roles of any other type grant nothing. The
 * single reusable rule of FR-004: entry, redirects and every recheck call this same function.
 */
export function evaluateAccess(me: MyAccess): AccessDecision {
  // FR-014: the e-mail of "Sin acceso" is the MailySoft user's when there is one, never a reason.
  const userEmail = me.user?.email ?? null;

  if (me.user === null) {
    return { kind: 'denied', userEmail };
  }
  if (!isActiveStatus(me.user.status.id)) {
    return { kind: 'denied', userEmail };
  }

  const authorizedRoles = me.roles.filter((role) => isSystemRoleType(role.type.id));
  if (authorizedRoles.length === 0) {
    return { kind: 'denied', userEmail };
  }

  return {
    kind: 'granted',
    access: {
      user: me.user,
      roles: me.roles,
      authorizedRoles,
      permissions: new Set(authorizedRoles.flatMap((role) => role.permissions)),
    },
  };
}
