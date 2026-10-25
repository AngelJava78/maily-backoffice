import { ApiError, type FieldError } from '@/shared/api/ApiError';
import { messages } from '@/shared/messages/es';

const { errors, form } = messages.health.registry;

/** What was being done with the registry when it failed. */
export type MonitoredComponentOperation = 'list' | 'get' | 'create' | 'update' | 'delete';

/** The inputs of the form that the service can complain about. */
export type ComponentFormField =
  | 'name'
  | 'code'
  | 'kind'
  | 'baseUrl'
  | 'livePath'
  | 'readyPath'
  | 'infoPath'
  | 'enabled'
  | 'sortOrder';

/**
 * How a failure of the registry is told to the person (data-model §5). Every text is ours, chosen
 * by the status, the code and the field of the refusal: the texts of the service never reach the
 * screen (FR-039).
 */
export type MonitoredComponentErrorOutcome =
  | {
      /** The service rejected the value of one or more inputs of the form. */
      readonly kind: 'field';
      readonly message: string;
      readonly fields: Readonly<Partial<Record<ComponentFormField, string>>>;
    }
  | {
      /** The service did not answer, failed or could not check the permission (503). */
      readonly kind: 'unavailable';
      readonly message: string;
      readonly authorizationUnavailable: boolean;
    }
  | {
      readonly kind: 'form' | 'notFound' | 'forbidden' | 'unexpected';
      readonly message: string;
    };

// A `Map` and not an object: a field called `constructor` must not find a function. Each input gets
// the format text of the form; the base URL, the one of a domain that is not allowed (research D16).
const FORM_FIELDS = new Map<string, readonly [ComponentFormField, string]>([
  ['name', ['name', form.name]],
  ['code', ['code', form.code]],
  ['kind', ['kind', form.required]],
  ['base_url', ['baseUrl', errors.hostNotAllowed]],
  ['live_path', ['livePath', form.path]],
  ['ready_path', ['readyPath', form.path]],
  ['info_path', ['infoPath', form.path]],
  ['enabled', ['enabled', form.required]],
  ['sort_order', ['sortOrder', form.sortOrder]],
]);

/** The operations that send what a person wrote in a form. */
const FORM_OPERATIONS: ReadonlySet<MonitoredComponentOperation> = new Set(['create', 'update']);

/** The rejected data go to the inputs they name; anything else is a general error of the form. */
function fromValidation(fieldErrors: readonly FieldError[]): MonitoredComponentErrorOutcome {
  const fields: Partial<Record<ComponentFormField, string>> = {};
  for (const { field } of fieldErrors) {
    const input = FORM_FIELDS.get(field);
    if (input !== undefined) {
      fields[input[0]] = input[1];
    }
  }
  return Object.keys(fields).length === 0
    ? { kind: 'form', message: errors.form }
    : { kind: 'field', message: errors.form, fields };
}

/**
 * Classifies a failure of the registry for the interface (research D16). A validation error only
 * has inputs to go to in the creation and the edition; anywhere else the interface never sends bad
 * data, so it is unexpected. A lack of permission is `forbidden`, with the usual notice.
 */
export function describeMonitoredComponentError(
  error: unknown,
  operation: MonitoredComponentOperation,
): MonitoredComponentErrorOutcome {
  if (!(error instanceof ApiError)) {
    return { kind: 'unexpected', message: messages.errors.unexpected };
  }
  if (error.code === 'validation_error') {
    return FORM_OPERATIONS.has(operation)
      ? fromValidation(error.fieldErrors)
      : { kind: 'unexpected', message: messages.errors.unexpected };
  }
  if (error.code === 'monitored_component_code_already_exists') {
    return { kind: 'field', message: errors.codeTaken, fields: { code: errors.codeTaken } };
  }
  if (error.code === 'monitored_component_not_found' || error.status === 404) {
    return { kind: 'notFound', message: errors.notFound };
  }
  if (error.code === 'permission_denied' || error.status === 403) {
    return { kind: 'forbidden', message: messages.forbidden.action };
  }
  if (error.isRetryable) {
    return {
      kind: 'unavailable',
      message: errors.unavailable,
      authorizationUnavailable: error.status === 503,
    };
  }
  return { kind: 'unexpected', message: messages.errors.unexpected };
}
