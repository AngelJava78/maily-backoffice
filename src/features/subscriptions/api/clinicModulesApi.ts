import type { HttpClient } from '@/shared/api/httpClient';

import { clinicModulesSchema, type ClinicModule } from '../schemas/clinicModule';

export const CLINIC_MODULES_PATH = '/api/v1/modules';

const CLINIC_MODULE_TYPE_ID = 2;
const ACTIVE_STATUS_ID = 1;

/** The active clinic modules a subscription can include (021, FR-001, FR-002), in the order the API gives them (`sort_order`, then `name` — contract: ../014-roles-permisos/contracts/roles-service.md). */
export function listClinicModules(
  client: HttpClient,
  { signal }: { readonly signal?: AbortSignal } = {},
): Promise<ClinicModule[]> {
  return client.get(CLINIC_MODULES_PATH, {
    schema: clinicModulesSchema,
    query: { type_id: CLINIC_MODULE_TYPE_ID, status_id: ACTIVE_STATUS_ID },
    signal,
  });
}
