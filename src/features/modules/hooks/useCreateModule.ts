import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { createModuleWithActions, type CreateModuleOutcome } from '../api/createModuleWithActions';
import type { ModuleActionKey } from '../schemas/moduleActionCatalog';
import type { CreateModuleBody } from '../schemas/moduleForm';
import { moduleKeys } from './moduleKeys';

export interface CreateModuleVariables {
  readonly body: CreateModuleBody;
  readonly actions: readonly ModuleActionKey[];
}

/**
 * Creates a module and gives it its actions. If the module could not be created it fails with the
 * error; if it was created, even when some action was not, it succeeds and the outcome says which
 * ones are pending (research D11). It is never retried on its own (constitution IV).
 */
export function useCreateModule(): UseMutationResult<
  CreateModuleOutcome,
  Error,
  CreateModuleVariables
> {
  const { users } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body, actions }: CreateModuleVariables) =>
      createModuleWithActions(users, body, actions),
    onSuccess: () => {
      // The new module belongs in the catalog; every status is marked stale.
      void queryClient.invalidateQueries({ queryKey: moduleKeys.all });
    },
  });
}
