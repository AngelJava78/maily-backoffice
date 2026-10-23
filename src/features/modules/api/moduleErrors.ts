import { ApiError, type FieldError } from '@/shared/api/ApiError';
import { messages } from '@/shared/messages/es';

const text = messages.modules.errors;

/** What was being done when it failed. */
export type ModuleOperation =
  | 'list'
  | 'create'
  | 'update'
  | 'block'
  | 'unblock'
  | 'delete'
  | 'createAction'
  | 'deleteAction';

/** The inputs of the form that the API can complain about. */
export type ModuleFormField = 'type' | 'key' | 'name' | 'description' | 'sortOrder';

/** How a failure is told to the person (contracts/modules-service.md, research D8). */
export type ModuleErrorOutcome =
  | {
      readonly kind: 'field';
      readonly message: string;
      readonly fields: Readonly<Partial<Record<ModuleFormField, string>>>;
    }
  | {
      readonly kind:
        | 'form'
        | 'notFound'
        | 'protected'
        | 'statusUnchanged'
        | 'retryable'
        | 'forbidden'
        | 'unexpected';
      readonly message: string;
    };

// A `Map` and not an object: a field called `constructor` must not find a function.
const FORM_FIELDS = new Map<string, ModuleFormField>([
  ['key', 'key'],
  ['name', 'name'],
  ['description', 'description'],
  ['sort_order', 'sortOrder'],
  ['type_id', 'type'],
]);

const FORM_OPERATIONS: ReadonlySet<ModuleOperation> = new Set(['create', 'update']);

/** The rejected data go to the inputs they name, with our texts; the rest is a general error. */
function fromValidation(fieldErrors: readonly FieldError[]): ModuleErrorOutcome {
  const fields: Partial<Record<ModuleFormField, string>> = {};
  for (const { field } of fieldErrors) {
    const input = FORM_FIELDS.get(field);
    if (input !== undefined) {
      fields[input] = text.fields[input];
    }
  }
  return Object.keys(fields).length === 0
    ? { kind: 'form', message: text.formInvalid }
    : { kind: 'field', message: text.formInvalid, fields };
}

/**
 * Classifies a failure of the modules/permissions API for the interface (contracts/modules-service.md).
 * `permission_not_found` on `deleteAction` is resolved as success by the caller before this is ever
 * reached (the action is already gone, contracts/modules-service.md); here it still maps like
 * `module_not_found` defensively.
 */
export function describeModuleError(error: unknown, operation: ModuleOperation): ModuleErrorOutcome {
  if (!(error instanceof ApiError)) {
    return { kind: 'unexpected', message: messages.errors.unexpected };
  }

  switch (error.code) {
    case 'module_key_already_exists':
      return { kind: 'field', message: text.keyInUse, fields: { key: text.keyInUse } };
    case 'module_name_already_exists':
      return { kind: 'field', message: text.nameInUse, fields: { name: text.nameInUse } };
    case 'module_not_found':
    case 'permission_not_found':
      return { kind: 'notFound', message: text.notFound };
    case 'module_protected':
      return { kind: 'protected', message: text.protected };
    case 'module_already_blocked':
    case 'module_already_active':
      return { kind: 'statusUnchanged', message: text.statusUnchanged };
    case 'validation_error':
      return FORM_OPERATIONS.has(operation)
        ? fromValidation(error.fieldErrors)
        : { kind: 'unexpected', message: messages.errors.unexpected };
    case 'permission_name_already_exists':
      return { kind: 'retryable', message: text.retryable };
    default:
      break;
  }

  if (error.code === 'permission_denied' || error.status === 403) {
    return { kind: 'forbidden', message: messages.forbidden.action };
  }
  if (error.isRetryable) {
    return { kind: 'retryable', message: text.retryable };
  }
  return { kind: 'unexpected', message: messages.errors.unexpected };
}
