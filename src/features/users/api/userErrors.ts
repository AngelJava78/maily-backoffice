import { ApiError, type FieldError } from '@/shared/api/ApiError';
import { messages } from '@/shared/messages/es';

const text = messages.users.errors;

/** What was being done when it failed. A few operations have texts of their own. */
export type UserOperation =
  | 'list'
  | 'search'
  | 'get'
  | 'create'
  | 'update'
  | 'delete'
  | 'block'
  | 'unblock'
  | 'reactivate'
  | 'listRoles'
  | 'assignRole'
  | 'unassignRole'
  | 'catalog';

/** The inputs of the forms of the section that the service can complain about. */
export type UserFormField =
  'email' | 'firstName' | 'paternalLastName' | 'maternalLastName' | 'password';

/**
 * How a failure is told to the person (contracts/users-service.md, "Errores"). Only the messages
 * of a field are the ones the service wrote; every other text is ours, because the messages of the
 * service name identifiers and may change (constitution IV: no raw messages).
 */
export type UserErrorOutcome =
  | {
      /** The service rejected the value of one or more inputs of the form. */
      readonly kind: 'field';
      readonly message: string;
      readonly fields: Readonly<Partial<Record<UserFormField, string>>>;
      /** Suggests searching for the email: its owner may be blocked or deleted (US2-4). */
      readonly hint?: 'searchEmail';
    }
  | {
      readonly kind:
        | 'form'
        | 'statusChanged'
        | 'alreadyDone'
        | 'notFound'
        | 'roleUnavailable'
        | 'accountMissing'
        | 'identityUnavailable'
        | 'identityRejected'
        | 'retryable'
        | 'forbidden'
        | 'unexpected';
      readonly message: string;
    };

// A `Map` and not an object: a field called `constructor` must not find a function.
const FORM_FIELDS = new Map<string, UserFormField>([
  ['email', 'email'],
  ['first_name', 'firstName'],
  ['paternal_last_name', 'paternalLastName'],
  ['maternal_last_name', 'maternalLastName'],
  ['password', 'password'],
]);

type FieldOutcome = Extract<UserErrorOutcome, { readonly kind: 'field' }>;

function fieldError(field: UserFormField, message: string): FieldOutcome {
  return { kind: 'field', message, fields: { [field]: message } };
}

/** The messages of a `validation_error` go to the inputs they name; the rest is a general error. */
function fromValidation(fieldErrors: readonly FieldError[]): UserErrorOutcome {
  const fields: Partial<Record<UserFormField, string>> = {};
  for (const { field, message } of fieldErrors) {
    const input = FORM_FIELDS.get(field);
    if (input !== undefined && fields[input] === undefined) {
      fields[input] = message;
    }
  }
  return Object.keys(fields).length === 0
    ? { kind: 'form', message: text.formInvalid }
    : { kind: 'field', message: text.formInvalid, fields };
}

/** A message for the notification area of the application. */
export interface UserErrorNotification {
  readonly severity: 'info' | 'warning' | 'error';
  readonly message: string;
}

/**
 * How a failure is told in a notification: what was already done as information, what the screen
 * showed and is not true any more as a warning, and anything else as an error. A lack of permission
 * is not told here, because the application already did (`null`).
 */
export function toNotification(outcome: UserErrorOutcome): UserErrorNotification | null {
  switch (outcome.kind) {
    case 'forbidden':
      return null;
    case 'alreadyDone':
      return { severity: 'info', message: outcome.message };
    case 'statusChanged':
    case 'roleUnavailable':
    case 'notFound':
      return { severity: 'warning', message: outcome.message };
    default:
      return { severity: 'error', message: outcome.message };
  }
}

/**
 * Classifies a failure of the users service for the interface (data-model.md, `UserErrorOutcome`).
 * A lack of permission is classified as `forbidden` only so the screens do not repeat the notice
 * that `createQueryClient` already showed.
 */
export function describeUserError(error: unknown, operation: UserOperation): UserErrorOutcome {
  if (!(error instanceof ApiError)) {
    return { kind: 'unexpected', message: messages.errors.unexpected };
  }

  switch (error.code) {
    case 'validation_error':
      return fromValidation(error.fieldErrors);
    case 'password_rejected':
      return fieldError('password', text.passwordRejected);
    case 'user_email_already_registered':
      return { ...fieldError('email', text.emailAlreadyRegistered), hint: 'searchEmail' };
    case 'auth0_account_already_exists':
      return fieldError('email', text.accountAlreadyExists);
    case 'user_deleted':
    case 'user_blocked':
    case 'user_not_active':
    case 'user_already_active':
      return { kind: 'statusChanged', message: text.statusChanged };
    case 'user_role_already_associated':
    case 'user_role_not_associated':
      return { kind: 'alreadyDone', message: text.alreadyDone };
    case 'user_not_found':
      return { kind: 'notFound', message: text.notFound };
    case 'role_not_found':
      return { kind: 'roleUnavailable', message: text.roleUnavailable };
    case 'auth0_account_not_found':
      return {
        kind: 'accountMissing',
        message:
          operation === 'reactivate' ? text.accountMissingReactivate : text.accountMissingUnblock,
      };
    case 'identity_provider_unavailable':
      return {
        kind: 'identityUnavailable',
        message: operation === 'create' ? text.identityUnavailableCreate : text.identityUnavailable,
      };
    case 'identity_provider_error':
      return {
        kind: 'identityRejected',
        message: operation === 'create' ? text.identityRejectedCreate : text.identityRejected,
      };
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
