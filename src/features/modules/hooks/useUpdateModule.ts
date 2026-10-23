import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import type { ChangedActions, UpdateModuleBody } from '../schemas/moduleForm';
import type { SystemModule } from '../schemas/systemModule';
import { updateModuleWithChanges, type UpdateModuleOutcome } from '../api/updateModuleWithChanges';
import { moduleKeys } from './moduleKeys';

export interface UpdateModuleVariables {
  readonly module: SystemModule;
  readonly changes: UpdateModuleBody | null;
  readonly changedActions: ChangedActions;
}

/**
 * Saves the field changes and the action changes of a module. If the `PATCH` itself fails the whole
 * thing fails with that error; once it goes through (or there was none to make), the outcome says
 * whether every action change also went through or which one did not (research D11). Never retried
 * on its own (constitution IV).
 */
export function useUpdateModule(): UseMutationResult<
  UpdateModuleOutcome,
  Error,
  UpdateModuleVariables
> {
  const { users } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ module, changes, changedActions }: UpdateModuleVariables) =>
      updateModuleWithChanges(users, module, changes, changedActions),
    onSuccess: () => {
      // The edited module's row (name, order, actions) can change what the list shows.
      void queryClient.invalidateQueries({ queryKey: moduleKeys.all });
    },
  });
}
