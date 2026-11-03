import type { UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';

import type { Role } from '../schemas/role';
import { resolveRoleView, type RoleListState, type RoleView } from '../schemas/roleView';
import { useRolesCatalog } from './useRolesCatalog';

export interface RoleViewResult {
  readonly view: RoleView;
  /** Asks again for the list (or lists) that failed: the retry of the error view. */
  readonly retry: () => void;
}

/** What a query has given so far: the roles it has (even if a later refresh failed), or how it is. */
function listStateOf(query: UseQueryResult<Role[]>): RoleListState {
  if (query.data !== undefined) {
    return { status: 'success', roles: query.data };
  }
  return query.isError ? { status: 'error' } : { status: 'pending' };
}

/**
 * What the screen of the detail of a role shows (research D5): the role from the list of the
 * active roles, and from the list of the blocked ones only when it is not among the active ones
 * and was not shown as active before. «Was shown as active» is state adjusted while rendering, the
 * pattern of React for state that follows a change, so the screen does not need an effect to know it.
 */
export function useRoleView(roleId: number): RoleViewResult {
  const active = useRolesCatalog('active');
  const [lastActiveRoleId, setLastActiveRoleId] = useState<number | null>(null);
  const isActive = active.data?.some((role) => role.id === roleId) === true;
  if (isActive && lastActiveRoleId !== roleId) {
    setLastActiveRoleId(roleId);
  }
  const shownAsActive = lastActiveRoleId === roleId;
  const blockedWanted = active.data !== undefined && !isActive && !shownAsActive;
  const blocked = useRolesCatalog('blocked', { enabled: blockedWanted });

  const view = resolveRoleView({
    roleId,
    active: listStateOf(active),
    blocked: blockedWanted ? listStateOf(blocked) : undefined,
    shownAsActive,
  });

  return {
    view,
    retry: () => {
      if (active.isError) {
        void active.refetch();
      }
      if (blocked.isError) {
        void blocked.refetch();
      }
    },
  };
}
