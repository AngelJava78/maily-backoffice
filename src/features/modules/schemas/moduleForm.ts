import { z } from 'zod';

import { messages } from '@/shared/messages/es';

import {
  MODULE_ACTION_ORDER,
  MODULE_TYPE,
  type ModuleActionKey,
  type ModuleTypeId,
} from './moduleActionCatalog';
import type { SystemModule } from './systemModule';

const { validation } = messages.modules;
const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
const SORT_ORDER_PATTERN = /^\d*$/;

/** Crear, Modificar y Eliminar need Ver (022, FR-015); a module can be saved with none marked. */
function createUpdateDeleteRequireRead(actions: ReadonlySet<ModuleActionKey>): boolean {
  const needsRead = actions.has('write') || actions.has('update') || actions.has('delete');
  return !needsRead || actions.has('read');
}

/**
 * One shape for both alta and edición (same pattern as `SubscriptionFormValues`): `type` and `key`
 * are only ever editable at alta — the edit panel shows them as fixed information (FR-015) and
 * `toUpdateModuleBody` never reads them — but keeping one type lets `ModuleFormFields` be shared
 * without generic `register`/`errors` typing across two different form shapes.
 */
export const moduleFormSchema = z.object({
  type: z.union([z.literal(MODULE_TYPE.SYSTEM), z.literal(MODULE_TYPE.CLINIC)]),
  key: z
    .string({ error: validation.keyRequired })
    .trim()
    .min(1, { error: validation.keyRequired })
    .max(50, { error: validation.keyInvalid })
    .regex(KEY_PATTERN, { error: validation.keyInvalid }),
  name: z
    .string({ error: validation.nameRequired })
    .trim()
    .min(1, { error: validation.nameRequired })
    .max(100, { error: validation.nameTooLong }),
  description: z
    .string({ error: validation.descriptionTooLong })
    .max(500, { error: validation.descriptionTooLong }),
  sortOrder: z
    .string({ error: validation.sortOrderInvalid })
    .regex(SORT_ORDER_PATTERN, { error: validation.sortOrderInvalid }),
  // The id of the parent module as text, `''` for none (spec 024). It is chosen among the options
  // the form offers, and the service validates the rest, so there is nothing to check here.
  parentModuleId: z.string(),
  actions: z
    .custom<ReadonlySet<ModuleActionKey>>((value) => value instanceof Set)
    .refine(createUpdateDeleteRequireRead, { error: validation.createUpdateDeleteRequireRead }),
});

export type ModuleFormValues = z.infer<typeof moduleFormSchema>;

export const initialModuleFormValues: ModuleFormValues = {
  type: MODULE_TYPE.CLINIC,
  key: '',
  name: '',
  description: '',
  sortOrder: '',
  parentModuleId: '',
  actions: new Set(MODULE_ACTION_ORDER),
};

/** Body of `POST /api/v1/modules` (contracts/modules-service.md). */
export interface CreateModuleBody {
  readonly key: string;
  readonly name: string;
  readonly type_id: ModuleTypeId;
  readonly description?: string;
  readonly sort_order?: number;
  readonly parent_module_id?: number;
}

/** Body of `PATCH /api/v1/modules/{id}`: never `key` nor `type_id` (FR-015). */
export interface UpdateModuleBody {
  readonly name?: string;
  readonly description?: string;
  readonly sort_order?: number;
  /** A number assigns or changes the parent; `null` removes it (spec 024). */
  readonly parent_module_id?: number | null;
}

export function toCreateModuleBody(values: ModuleFormValues): CreateModuleBody {
  const body: {
    key: string;
    name: string;
    type_id: ModuleTypeId;
    description?: string;
    sort_order?: number;
    parent_module_id?: number;
  } = { key: values.key, name: values.name, type_id: values.type };
  if (values.description !== '') {
    body.description = values.description;
  }
  if (values.sortOrder !== '') {
    body.sort_order = Number(values.sortOrder);
  }
  if (values.parentModuleId !== '') {
    body.parent_module_id = Number(values.parentModuleId);
  }
  return body;
}

export function toFormValues(module: SystemModule): ModuleFormValues {
  return {
    type: module.typeId === MODULE_TYPE.SYSTEM ? MODULE_TYPE.SYSTEM : MODULE_TYPE.CLINIC,
    key: module.key,
    name: module.name,
    description: module.description ?? '',
    sortOrder: String(module.sortOrder),
    parentModuleId: module.parentModule === null ? '' : String(module.parentModule.id),
    actions: new Set(module.actions),
  };
}

/**
 * Only what changed in `name`/`description`/`sortOrder`/`parentModuleId`, or `null` if nothing did (research D11:
 * actions are not part of this body, they are separate `POST`/`DELETE` calls on `permissions`, see
 * `getChangedActions`; `type`/`key` are never read, even though `values` carries them). Clearing
 * "Orden" means "leave it as it was", not "recalculate": that default only applies when creating
 * (FR-011).
 */
export function toUpdateModuleBody(
  initial: SystemModule,
  values: ModuleFormValues,
): UpdateModuleBody | null {
  const body: {
    name?: string;
    description?: string;
    sort_order?: number;
    parent_module_id?: number | null;
  } = {};
  if (values.name !== initial.name) {
    body.name = values.name;
  }
  if (values.description !== (initial.description ?? '')) {
    body.description = values.description;
  }
  if (values.sortOrder !== '' && Number(values.sortOrder) !== initial.sortOrder) {
    body.sort_order = Number(values.sortOrder);
  }
  // Only when it changed: a number assigns or changes the parent, `null` removes it (spec 024).
  if (
    values.parentModuleId !== (initial.parentModule === null ? '' : String(initial.parentModule.id))
  ) {
    body.parent_module_id = values.parentModuleId === '' ? null : Number(values.parentModuleId);
  }
  return Object.keys(body).length === 0 ? null : body;
}

export interface ChangedActions {
  readonly toAdd: readonly ModuleActionKey[];
  readonly toRemove: readonly ModuleActionKey[];
}

/** What to create and what to delete among `permissions` to go from `initial` to `next` (research D11). */
export function getChangedActions(
  initial: ReadonlySet<ModuleActionKey>,
  next: ReadonlySet<ModuleActionKey>,
): ChangedActions {
  const toAdd = MODULE_ACTION_ORDER.filter((action) => next.has(action) && !initial.has(action));
  const toRemove = MODULE_ACTION_ORDER.filter((action) => initial.has(action) && !next.has(action));
  return { toAdd, toRemove };
}
