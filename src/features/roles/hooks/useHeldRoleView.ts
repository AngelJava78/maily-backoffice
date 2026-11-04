import { useIsMutating } from '@tanstack/react-query';
import { useState } from 'react';

import type { RoleView } from '../schemas/roleView';

/** Whether two views show the same: the same kind of screen, of the same role as it is known. */
function sameView(a: RoleView, b: RoleView): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  return 'role' in a && 'role' in b ? a.role === b.role : true;
}

/**
 * The view of the screen of a role, held as it was while anything is being changed (found by the
 * walkthrough of feature 027 against the real API). Blocking, unblocking or deleting a role makes the
 * service refresh both lists, and they do not arrive together: the view followed the first one (a
 * role that «ya no existe», or the panel of an active role), the component that had started the
 * action was unmounted, and a mutation that finishes after that cannot call back a component that
 * is no longer there: no notice and no way back to the table. Held, the screen keeps that component
 * until the action has finished and the person has left for the table, and it never says that a
 * role that is still there no longer exists.
 */
export function useHeldRoleView(roleId: number, view: RoleView): RoleView {
  const changing = useIsMutating() > 0;
  const [held, setHeld] = useState({ roleId, view });
  // State adjusted while rendering, as `useRoleView` does: no effect is needed to follow the view.
  if (!changing && (held.roleId !== roleId || !sameView(held.view, view))) {
    setHeld({ roleId, view });
  }
  return changing && held.roleId === roleId ? held.view : view;
}
