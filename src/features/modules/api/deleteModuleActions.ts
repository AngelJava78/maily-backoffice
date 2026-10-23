import { ApiError } from '@/shared/api/ApiError';
import type { HttpClient } from '@/shared/api/httpClient';

import { MODULE_ACTION_ORDER, type ModuleActionKey } from '../schemas/moduleActionCatalog';
import { deleteModuleAction } from './modulesApi';

/** An action that could not be unmarked, with the reason the service gave. */
export interface ModuleActionRemovalFailure {
  readonly action: ModuleActionKey;
  readonly error: ApiError;
}

export interface DeleteModuleActionsResult {
  readonly removed: readonly ModuleActionKey[];
  readonly failed: readonly ModuleActionRemovalFailure[];
}

/**
 * Unmarks several actions of a module, one by one in the fixed order (research D5, D11): each is a
 * separate `DELETE /permissions/{id}`. Same stop/continue rule as `createModuleActions`: a business
 * refusal leaves that action pending and goes on, an infrastructure failure stops everything.
 * `permissionIdByAction` is never missing an action this is asked to remove: the caller only lists
 * actions the module already had (`getChangedActions`), so it already has an id for each.
 */
export async function deleteModuleActions(
  client: HttpClient,
  actions: readonly ModuleActionKey[],
  permissionIdByAction: ReadonlyMap<ModuleActionKey, number>,
  signal?: AbortSignal,
): Promise<DeleteModuleActionsResult> {
  const ordered = MODULE_ACTION_ORDER.filter((action) => actions.includes(action));
  const removed: ModuleActionKey[] = [];
  const failed: ModuleActionRemovalFailure[] = [];

  for (const [index, action] of ordered.entries()) {
    const permissionId = permissionIdByAction.get(action);
    if (permissionId === undefined) {
      removed.push(action);
      continue;
    }
    try {
      await deleteModuleAction(client, permissionId, { signal });
      removed.push(action);
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

  return { removed, failed };
}
