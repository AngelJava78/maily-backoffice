import type { HttpClient } from '@/shared/api/httpClient';

import type { ModuleActionKey } from '../schemas/moduleActionCatalog';
import type { ChangedActions, UpdateModuleBody } from '../schemas/moduleForm';
import type { SystemModule } from '../schemas/systemModule';
import { createModuleActions } from './createModuleActions';
import { deleteModuleActions } from './deleteModuleActions';
import { updateModule } from './modulesApi';

/**
 * `saved`: the field changes (if any) and every action change were applied. `partial`: those went
 * through but some action could not be marked or unmarked, which stays as it was (research D11); the
 * caller already has what it needs to reconcile its own copy of the module (`addedOk`/`removedOk`).
 */
export type UpdateModuleOutcome =
  | { readonly kind: 'saved' }
  | {
      readonly kind: 'partial';
      readonly addedOk: readonly ModuleActionKey[];
      readonly removedOk: readonly ModuleActionKey[];
      readonly failed: readonly ModuleActionKey[];
    };

/**
 * Modifies a module the only way the service allows: first the `PATCH` of name/description/order, if
 * anything there changed, then each action that changed, in sequence (FR-014, FR-016, FR-017,
 * research D5, D11). If the `PATCH` itself fails, no action is touched: the operator sees the
 * refusal (e.g. a name conflict) before anything else moves.
 */
export async function updateModuleWithChanges(
  client: HttpClient,
  module: SystemModule,
  changes: UpdateModuleBody | null,
  changedActions: ChangedActions,
  signal?: AbortSignal,
): Promise<UpdateModuleOutcome> {
  if (changes !== null) {
    await updateModule(client, module.id, changes, { signal });
  }
  const added = await createModuleActions(client, module.key, changedActions.toAdd, signal);
  const removed = await deleteModuleActions(client, changedActions.toRemove, module.permissionIdByAction, signal);
  const failed = [...added.failed.map((failure) => failure.action), ...removed.failed.map((failure) => failure.action)];
  return failed.length === 0
    ? { kind: 'saved' }
    : { kind: 'partial', addedOk: added.assigned, removedOk: removed.removed, failed };
}
