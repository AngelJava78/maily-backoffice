import { ApiError, type FieldError } from '@/shared/api/ApiError';
import { messages } from '@/shared/messages/es';

const text = messages.subscriptions.errors;

/** What was being done when it failed. */
export type SubscriptionOperation =
  'catalog' | 'get' | 'create' | 'update' | 'changeStatus' | 'delete';

/** The inputs of the form that the API can complain about. */
export type SubscriptionFormField =
  | 'name'
  | 'description'
  | 'monthlyPrice'
  | 'annualPrice'
  | 'trialDays'
  | 'selfService'
  | 'moduleKeys'
  | 'consultingRoomsLimit'
  | 'doctorsLimit'
  | 'assistantsLimit'
  | 'newPatientsPerYearLimit'
  | 'otherFeatures';

/**
 * How a failure is told to the person (data-model.md, `SubscriptionErrorOutcome`). Every text is
 * ours, chosen by the code of the refusal, even the one of a field: the texts of the API name
 * identifiers and may change, so they never reach the screen (FR-010).
 */
export type SubscriptionErrorOutcome =
  | {
      /** The API rejected the value of one or more inputs of the form. */
      readonly kind: 'field';
      readonly message: string;
      readonly fields: Readonly<Partial<Record<SubscriptionFormField, string>>>;
    }
  | {
      readonly kind:
        | 'form'
        | 'notFound'
        | 'statusUnchanged'
        | 'hasClinics'
        | 'clinicsUnavailable'
        | 'retryable'
        | 'forbidden'
        | 'unexpected';
      readonly message: string;
    };

// A `Map` and not an object: a field called `constructor` must not find a function.
const FORM_FIELDS = new Map<string, SubscriptionFormField>([
  ['name', 'name'],
  ['description', 'description'],
  ['monthly_price', 'monthlyPrice'],
  ['annual_price', 'annualPrice'],
  ['trial_days', 'trialDays'],
  ['self_service', 'selfService'],
  ['module_keys', 'moduleKeys'],
  ['consulting_rooms_limit', 'consultingRoomsLimit'],
  ['doctors_limit', 'doctorsLimit'],
  ['assistants_limit', 'assistantsLimit'],
  ['new_patients_per_year_limit', 'newPatientsPerYearLimit'],
  ['other_features', 'otherFeatures'],
]);

/** The operations that send what a person wrote in a form. */
const FORM_OPERATIONS: ReadonlySet<SubscriptionOperation> = new Set(['create', 'update']);

/** The rejected data go to the inputs they name, with our texts; the rest is a general error. */
function fromValidation(fieldErrors: readonly FieldError[]): SubscriptionErrorOutcome {
  const fields: Partial<Record<SubscriptionFormField, string>> = {};
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

/** A message for the notification area of the application. */
export interface SubscriptionErrorNotification {
  readonly severity: 'warning' | 'error';
  readonly message: string;
}

/**
 * How a failure is told in a notification: what the screen showed and is not true any more as a
 * warning, and anything else as an error. A lack of permission is not told here, because the
 * application already did (`null`).
 */
export function toNotification(
  outcome: SubscriptionErrorOutcome,
): SubscriptionErrorNotification | null {
  switch (outcome.kind) {
    case 'forbidden':
      return null;
    case 'notFound':
    case 'statusUnchanged':
    case 'hasClinics':
      return { severity: 'warning', message: outcome.message };
    default:
      return { severity: 'error', message: outcome.message };
  }
}

/**
 * Classifies a failure of the subscriptions API for the interface. A lack of permission is
 * classified as `forbidden` only so the screens do not repeat the notice that `createQueryClient`
 * already showed. A validation error only has inputs to go to in the creation and the edition;
 * anywhere else the interface never sends bad data, so it is unexpected.
 */
export function describeSubscriptionError(
  error: unknown,
  operation: SubscriptionOperation,
): SubscriptionErrorOutcome {
  if (!(error instanceof ApiError)) {
    return { kind: 'unexpected', message: messages.errors.unexpected };
  }

  switch (error.code) {
    case 'subscription_name_already_exists':
      return { kind: 'field', message: text.nameInUse, fields: { name: text.nameInUse } };
    case 'subscription_module_prerequisite_missing':
    case 'subscription_module_not_found':
      return {
        kind: 'field',
        message: text.fields.moduleKeys,
        fields: { moduleKeys: text.fields.moduleKeys },
      };
    case 'validation_error':
      return FORM_OPERATIONS.has(operation)
        ? fromValidation(error.fieldErrors)
        : { kind: 'unexpected', message: messages.errors.unexpected };
    case 'subscription_not_found':
      return { kind: 'notFound', message: text.notFound };
    case 'subscription_status_unchanged':
      return { kind: 'statusUnchanged', message: text.statusUnchanged };
    case 'subscription_has_clinics':
      return { kind: 'hasClinics', message: text.hasClinics };
    case 'clinics_check_unavailable':
      return { kind: 'clinicsUnavailable', message: text.clinicsUnavailable };
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
