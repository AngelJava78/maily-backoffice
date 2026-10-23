import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import type { HttpClient } from '@/shared/api/httpClient';
import { useHttpClients } from '@/shared/api/httpClientsContext';

import { blockModule, unblockModule } from '../api/modulesApi';
import type { SystemModuleBase } from '../schemas/systemModule';
import { moduleKeys } from './moduleKeys';

export type ModuleStatusAction = 'block' | 'unblock';

export interface ChangeModuleStatusVariables {
  readonly moduleId: number;
  readonly action: ModuleStatusAction;
}

type StatusOperation = (client: HttpClient, moduleId: number) => Promise<SystemModuleBase>;

// The action is a union written by the code, never text from outside, so a plain object is safe.
const OPERATIONS = { block: blockModule, unblock: unblockModule } satisfies Record<
  ModuleStatusAction,
  StatusOperation
>;

/**
 * Blocks or unblocks a module (FR-019, FR-020). Without an optimistic update (constitution IV): the
 * screen shows the status the service confirmed. A race with someone else changing the same status
 * a moment earlier (`module_already_blocked`/`module_already_active`) still asks for the catalog
 * again (contracts/modules-service.md), so the screen shows what actually holds.
 */
export function useChangeModuleStatus(): UseMutationResult<
  SystemModuleBase,
  Error,
  ChangeModuleStatusVariables
> {
  const { users } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ moduleId, action }: ChangeModuleStatusVariables) => OPERATIONS[action](users, moduleId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: moduleKeys.all });
    },
  });
}
