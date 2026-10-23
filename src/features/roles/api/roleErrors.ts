import { ApiError, type FieldError } from '@/shared/api/ApiError';
import { messages } from '@/shared/messages/es';

const text = messages.roles.errors;
const validation = messages.roles.validation;

/** How a failure of `rolesApi`/`roleTypesApi` is told to the person (data-model.md). */
export type RoleErrorOutcome =
  | {
      readonly kind: 'field';
      readonly message: string;
      readonly fields: Readonly<Partial<Record<'name', string>>>;
    }
  | {
      readonly kind: 'notFound' | 'forbidden' | 'retryable' | 'unexpected';
      readonly message: string;
    };

/** How a failure of `rolePermissionsApi`'s associate/disassociate is told (research D6). */
export type RolePermissionAssociationOutcome =
  | {
      /** The role (or, rarely, the permission) no longer exists: refresh and show the result. */
      readonly kind: 'notFound';
      readonly message: string;
    }
  | {
      /** The desired state (associated, or not) was already the real one: not an error to show. */
      readonly kind: 'alreadyDesired';
    }
  | {
      /** The permission's module does not belong to the role's type. */
      readonly kind: 'conflict';
      readonly message: string;
    }
  | { readonly kind: 'forbidden' | 'retryable' | 'unexpected'; readonly message: string };

function fieldError(message: string): RoleErrorOutcome {
  return { kind: 'field', message, fields: { name: message } };
}

function fromValidation(fieldErrors: readonly FieldError[]): RoleErrorOutcome {
  return fieldErrors.some((error) => error.field === 'name')
    ? fieldError(validation.nameInvalid)
    : { kind: 'unexpected', message: messages.errors.unexpected };
}

/** Classifies a failure of `rolesApi`/`roleTypesApi` for the interface. */
export function describeRoleError(error: unknown): RoleErrorOutcome {
  if (!(error instanceof ApiError)) {
    return { kind: 'unexpected', message: messages.errors.unexpected };
  }
  switch (error.code) {
    case 'role_name_already_exists':
      return fieldError(text.nameAlreadyExists);
    case 'validation_error':
      return fromValidation(error.fieldErrors);
    case 'role_not_found':
      return { kind: 'notFound', message: text.notFound };
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

/**
 * Of `ids` (each paired by position with the matching entry of `outcomes`), the ones whose
 * associate/disassociate call really failed: a 409 that only means the desired state was already
 * the real one (research D6) does not count, so the caller never reports it among the failures.
 * Shared by every hook that associates/disassociates several permissions at once (`useSaveRoleDetail`,
 * `useCreateRole`).
 */
export function realAssociationFailureIds(
  ids: readonly number[],
  outcomes: readonly PromiseSettledResult<void>[],
): number[] {
  return ids.filter((_id, index) => {
    const outcome = outcomes[index];
    return (
      outcome?.status === 'rejected' &&
      describeRolePermissionAssociationError(outcome.reason).kind !== 'alreadyDesired'
    );
  });
}

/** Classifies a failure of associating/disassociating a permission (research D6, D8). */
export function describeRolePermissionAssociationError(
  error: unknown,
): RolePermissionAssociationOutcome {
  if (!(error instanceof ApiError)) {
    return { kind: 'unexpected', message: messages.errors.unexpected };
  }
  switch (error.code) {
    case 'role_permission_already_associated':
    case 'role_permission_not_associated':
      return { kind: 'alreadyDesired' };
    case 'role_permission_module_type_conflict':
      return { kind: 'conflict', message: text.moduleTypeConflict };
    case 'role_not_found':
    case 'permission_not_found':
      return { kind: 'notFound', message: text.notFound };
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
