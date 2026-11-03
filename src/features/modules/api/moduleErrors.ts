import { ApiError, type FieldError } from '@/shared/api/ApiError';
import { messages } from '@/shared/messages/es';

const text = messages.modules.errors;

/** What was being done when it failed. */
export type ModuleOperation =
  'list' | 'create' | 'update' | 'block' | 'unblock' | 'delete' | 'createAction' | 'deleteAction';

/** The inputs of the form that the API can complain about. */
export type ModuleFormField =
  'type' | 'key' | 'name' | 'description' | 'sortOrder' | 'parentModuleId';

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
        | 'conflict'
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
  ['parent_module_id', 'parentModuleId'],
]);

const FORM_OPERATIONS: ReadonlySet<ModuleOperation> = new Set(['create', 'update']);

/** A refusal about the parent module goes to its field (spec 024). */
function parentField(message: string): ModuleErrorOutcome {
  return { kind: 'field', message, fields: { parentModuleId: message } };
}

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
export function describeModuleError(
  error: unknown,
  operation: ModuleOperation,
): ModuleErrorOutcome {
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
      // On a form it is the parent that cannot be (the module or its parent is a base module).
      return FORM_OPERATIONS.has(operation)
        ? parentField(text.parentProtected)
        : { kind: 'protected', message: text.protected };
    case 'module_parent_not_found':
      return parentField(text.parentNotFound);
    case 'module_parent_is_submodule':
      return parentField(text.parentIsSubmodule);
    case 'module_parent_type_mismatch':
      return parentField(text.parentTypeMismatch);
    case 'module_parent_self_reference':
      return parentField(text.parentSelfReference);
    case 'module_has_submodules':
      // A modification cannot make a module with submodules a submodule, and a deletion cannot
      // remove it while it has them (spec 024, FR-016).
      if (operation === 'update') {
        return parentField(text.hasSubmodulesAsChild);
      }
      return operation === 'delete'
        ? { kind: 'conflict', message: text.hasSubmodules }
        : { kind: 'unexpected', message: messages.errors.unexpected };
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
