import { messages } from '@/shared/messages/es';
import { useNotify } from '@/shared/ui/Notifications';

import { describeRoleError } from '../api/roleErrors';
import { useChangeRoleStatus, type RoleStatusAction } from './useChangeRoleStatus';

const text = messages.roles.status;

export interface ChangeRoleStatusActionApi {
  /** The operation is running: its button shows it and takes no second press (FR-016). */
  readonly pending: boolean;
  /** Blocks or unblocks the role, and tells the outcome. */
  readonly run: () => void;
}

/**
 * "Bloquear role"/"Desbloquear role" as a self-contained action (FR-015, FR-016; data-model §5):
 * a success names the role and where it is now; a role that already had that status (someone
 * else was quicker) is told as information, not as a failure; both call `onChanged`, which closes
 * the detail. Any other failure is an error notice and `onFailed`, and leaves the role as it was,
 * to retry.
 */
export function useChangeRoleStatusAction(
  role: { readonly id: number; readonly name: string },
  action: RoleStatusAction,
  onChanged: () => void,
  onFailed?: () => void,
): ChangeRoleStatusActionApi {
  const changeStatus = useChangeRoleStatus();
  const notify = useNotify();

  return {
    pending: changeStatus.isPending,
    run: () => {
      changeStatus.mutate(
        { roleId: role.id, action },
        {
          onSuccess: () => {
            notify({
              severity: 'success',
              message: action === 'block' ? text.blocked(role.name) : text.unblocked(role.name),
            });
            onChanged();
          },
          onError: (error) => {
            const outcome = describeRoleError(error);
            if (outcome.kind === 'alreadyInStatus') {
              notify({
                severity: 'info',
                message:
                  action === 'block'
                    ? text.alreadyBlocked(role.name)
                    : text.alreadyActive(role.name),
              });
              onChanged();
              return;
            }
            notify({ severity: 'error', message: outcome.message });
            onFailed?.();
          },
        },
      );
    },
  };
}
