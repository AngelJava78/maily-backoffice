import { ApiError } from '@/shared/api/ApiError';
import type { HttpClient } from '@/shared/api/httpClient';

import { assignRole } from './userRolesApi';

/** What is needed of a role to assign it and to name it to the person. */
export interface AssignableRole {
  readonly id: number;
  readonly name: string;
}

/** A role that could not be assigned, with the reason the service gave. */
export interface RoleAssignmentFailure<T extends AssignableRole = AssignableRole> {
  readonly role: T;
  readonly error: ApiError;
}

export interface AssignRolesResult<T extends AssignableRole = AssignableRole> {
  readonly assigned: readonly T[];
  readonly failed: readonly RoleAssignmentFailure<T>[];
}

/**
 * Gives several roles to a user, one by one and in the order of their ids (research D10): the
 * service says nothing about concurrency and one by one the result is easy to tell. A refusal of
 * business, such as a role that is gone, leaves that role pending and goes on with the rest. A
 * failure of the infrastructure (network, time out, 5xx) stops everything: the rest would most
 * likely fail too, and each try can take up to 30 s; the roles not tried are pending as well. A
 * role the user already has counts as assigned. What is not a failure of one role, such as the end
 * of the session or a cancellation, is not caught.
 */
export async function assignRoles<T extends AssignableRole>(
  client: HttpClient,
  userId: number,
  roles: readonly T[],
  signal?: AbortSignal,
): Promise<AssignRolesResult<T>> {
  const ordered = [...roles].sort((a, b) => a.id - b.id);
  const assigned: T[] = [];
  const failed: RoleAssignmentFailure<T>[] = [];

  for (const [index, role] of ordered.entries()) {
    try {
      await assignRole(client, userId, role.id, { signal });
      assigned.push(role);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }
      if (error.code === 'user_role_already_associated') {
        assigned.push(role);
        continue;
      }
      failed.push({ role, error });
      if (error.isRetryable) {
        failed.push(...ordered.slice(index + 1).map((pending) => ({ role: pending, error })));
        break;
      }
    }
  }

  return { assigned, failed };
}
