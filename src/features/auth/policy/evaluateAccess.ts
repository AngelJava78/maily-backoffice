import { isActiveStatus } from '@/features/users';

import type { MyAccess } from '../schemas/myAccess';
import { isAuthorizedRoleName } from './authorizedRoles';
import type { AccessDecision } from './types';

/**
 * Turns what the users service knows about the person into the access decision (FR-003, FR-004):
 * registered, active, and with at least one authorized role. Only the permissions of the
 * authorized roles count.
 */
export function evaluateAccess(me: MyAccess): AccessDecision {
  if (me.user === null) {
    return { kind: 'denied', reason: 'not_registered' };
  }
  if (!isActiveStatus(me.user.status.id)) {
    return { kind: 'denied', reason: 'inactive_account' };
  }

  const authorizedRoles = me.roles.filter((role) => isAuthorizedRoleName(role.name));
  if (authorizedRoles.length === 0) {
    return { kind: 'denied', reason: 'no_authorized_role' };
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
