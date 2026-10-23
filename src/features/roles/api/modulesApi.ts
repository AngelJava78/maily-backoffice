import type { HttpClient } from '@/shared/api/httpClient';

import { modulesSchema, type Module } from '../schemas/module';

export const MODULES_PATH = '/api/v1/modules';

/** The active modules of `typeId` (1 Sistema, 2 Clínica), ordered by `sortOrder` then name. */
export function listModules(
  client: HttpClient,
  typeId: 1 | 2,
  { signal }: { readonly signal?: AbortSignal } = {},
): Promise<Module[]> {
  return client.get(MODULES_PATH, {
    schema: modulesSchema,
    query: { type_id: typeId, status_id: 1 },
    signal,
  });
}
