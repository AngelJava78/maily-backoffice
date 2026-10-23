import type { HttpClient } from '@/shared/api/httpClient';

import type { ModuleActionKey } from '../schemas/moduleActionCatalog';
import type { CreateModuleBody } from '../schemas/moduleForm';
import type { SystemModuleBase } from '../schemas/systemModule';
import { createModuleActions, type ModuleActionFailure } from './createModuleActions';
import { createModule } from './modulesApi';

/**
 * `created`: the module and every action were marked. `partial`: the module exists but some action
 * was not, and the panel moves to editing it so the operator can retry (research D11). If the
 * module itself could not be created there is no outcome: it fails with its error and no action is
 * attempted.
 */
export type CreateModuleOutcome =
  | { readonly kind: 'created'; readonly module: SystemModuleBase; readonly assigned: readonly ModuleActionKey[] }
  | {
      readonly kind: 'partial';
      readonly module: SystemModuleBase;
      readonly assigned: readonly ModuleActionKey[];
      readonly failed: readonly ModuleActionFailure[];
    };

/**
 * Creates a module with its actions in the only way the service allows: first the module, then each
 * action (research D11). There is no compensation when an action fails: deleting the module right
 * after creating it risks colliding with someone who already saw it, so it is kept and the rest is
 * retried from its edit panel.
 */
export async function createModuleWithActions(
  client: HttpClient,
  body: CreateModuleBody,
  actions: readonly ModuleActionKey[],
  signal?: AbortSignal,
): Promise<CreateModuleOutcome> {
  const module = await createModule(client, body, { signal });
  const { assigned, failed } = await createModuleActions(client, module.key, actions, signal);
  return failed.length === 0 ? { kind: 'created', module, assigned } : { kind: 'partial', module, assigned, failed };
}
