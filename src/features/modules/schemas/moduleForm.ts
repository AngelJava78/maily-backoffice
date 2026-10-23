import { z } from 'zod';

import { messages } from '@/shared/messages/es';

import {
  MODULE_ACTION_ORDER,
  MODULE_TYPE,
  REQUIRED_ACTION_KEY,
  type ModuleActionKey,
  type ModuleTypeId,
} from './moduleActionCatalog';
import type { SystemModule } from './systemModule';

const { validation } = messages.modules;
const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
const SORT_ORDER_PATTERN = /^\d*$/;

function hasRequiredAction(actions: ReadonlySet<ModuleActionKey>): boolean {
  return actions.has(REQUIRED_ACTION_KEY);
}

const actionsSchema = z
  .custom<ReadonlySet<ModuleActionKey>>((value) => value instanceof Set)
  .refine(hasRequiredAction, { error: validation.actionsReadRequired });

const nameSchema = z
  .string({ error: validation.nameRequired })
  .trim()
  .min(1, { error: validation.nameRequired })
  .max(100, { error: validation.nameTooLong });

const descriptionSchema = z
  .string({ error: validation.descriptionTooLong })
  .max(500, { error: validation.descriptionTooLong });

const sortOrderSchema = z
  .string({ error: validation.sortOrderInvalid })
  .regex(SORT_ORDER_PATTERN, { error: validation.sortOrderInvalid });

export const createModuleFormSchema = z.object({
  type: z.union([z.literal(MODULE_TYPE.SYSTEM), z.literal(MODULE_TYPE.CLINIC)]),
  key: z
    .string({ error: validation.keyRequired })
    .trim()
    .min(1, { error: validation.keyRequired })
    .max(50, { error: validation.keyInvalid })
    .regex(KEY_PATTERN, { error: validation.keyInvalid }),
  name: nameSchema,
  description: descriptionSchema,
  sortOrder: sortOrderSchema,
  actions: actionsSchema,
});

export const updateModuleFormSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  sortOrder: sortOrderSchema,
  actions: actionsSchema,
});

export type CreateModuleFormValues = z.infer<typeof createModuleFormSchema>;
export type UpdateModuleFormValues = z.infer<typeof updateModuleFormSchema>;

export const initialCreateModuleFormValues: CreateModuleFormValues = {
  type: MODULE_TYPE.CLINIC,
  key: '',
  name: '',
  description: '',
  sortOrder: '',
  actions: new Set(MODULE_ACTION_ORDER),
};

/** Body of `POST /api/v1/modules` (contracts/modules-service.md). */
export interface CreateModuleBody {
  readonly key: string;
  readonly name: string;
  readonly type_id: ModuleTypeId;
  readonly description?: string;
  readonly sort_order?: number;
}

/** Body of `PATCH /api/v1/modules/{id}`: never `key` nor `type_id` (FR-015). */
export interface UpdateModuleBody {
  readonly name?: string;
  readonly description?: string;
  readonly sort_order?: number;
}

export function toCreateModuleBody(values: CreateModuleFormValues): CreateModuleBody {
  const body: {
    key: string;
    name: string;
    type_id: ModuleTypeId;
    description?: string;
    sort_order?: number;
  } = { key: values.key, name: values.name, type_id: values.type };
  if (values.description !== '') {
    body.description = values.description;
  }
  if (values.sortOrder !== '') {
    body.sort_order = Number(values.sortOrder);
  }
  return body;
}

export function toFormValues(module: SystemModule): UpdateModuleFormValues {
  return {
    name: module.name,
    description: module.description ?? '',
    sortOrder: String(module.sortOrder),
    actions: new Set(module.actions),
  };
}

/**
 * Only what changed in `name`/`description`/`sortOrder`, or `null` if nothing did (research D11:
 * actions are not part of this body, they are separate `POST`/`DELETE` calls on `permissions`, see
 * `getChangedActions`). Clearing "Orden" means "leave it as it was", not "recalculate": that default
 * only applies when creating (FR-011).
 */
export function toUpdateModuleBody(
  initial: SystemModule,
  values: UpdateModuleFormValues,
): UpdateModuleBody | null {
  const body: { name?: string; description?: string; sort_order?: number } = {};
  if (values.name !== initial.name) {
    body.name = values.name;
  }
  if (values.description !== (initial.description ?? '')) {
    body.description = values.description;
  }
  if (values.sortOrder !== '' && Number(values.sortOrder) !== initial.sortOrder) {
    body.sort_order = Number(values.sortOrder);
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
