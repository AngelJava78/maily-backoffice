import { ApiError } from '@/shared/api/ApiError';
import type { HttpClient } from '@/shared/api/httpClient';

import { MODULE_ACTION_ORDER, type ModuleActionKey } from '../schemas/moduleActionCatalog';
import { createModuleAction } from './modulesApi';

/** An action that could not be marked, with the reason the service gave. */
export interface ModuleActionFailure {
  readonly action: ModuleActionKey;
  readonly error: ApiError;
}

export interface CreateModuleActionsResult {
  readonly assigned: readonly ModuleActionKey[];
  readonly failed: readonly ModuleActionFailure[];
}

/**
 * Marks several actions of a module, one by one in the fixed order (research D11: there is no
 * operation for "the actions of a module" as a whole). A refusal of business (the permission already
 * exists, a race between two people) leaves that action pending and goes on with the rest. A failure
 * of the infrastructure (network, time out, 5xx) stops everything, since each try can take up to
 * 30 s and the rest would most likely fail too; the actions not tried are pending as well.
 */
export async function createModuleActions(
  client: HttpClient,
  moduleKey: string,
  actions: readonly ModuleActionKey[],
  signal?: AbortSignal,
): Promise<CreateModuleActionsResult> {
  const ordered = MODULE_ACTION_ORDER.filter((action) => actions.includes(action));
  const assigned: ModuleActionKey[] = [];
  const failed: ModuleActionFailure[] = [];

  for (const [index, action] of ordered.entries()) {
    try {
      await createModuleAction(client, moduleKey, action, { signal });
      assigned.push(action);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }
      failed.push({ action, error });
      if (error.isRetryable) {
        failed.push(...ordered.slice(index + 1).map((pending) => ({ action: pending, error })));
        break;
      }
    }
  }

  return { assigned, failed };
}
