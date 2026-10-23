import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { deleteModule } from '../api/modulesApi';
import { moduleKeys } from './moduleKeys';

/** Deletes a module and every one of its actions, in the same operation (FR-022, FR-023). */
export function useDeleteModule(): UseMutationResult<void, Error, number> {
  const { users } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (moduleId: number) => deleteModule(users, moduleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: moduleKeys.all });
    },
  });
}
