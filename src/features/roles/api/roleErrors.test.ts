import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { messages } from '@/shared/messages/es';

import {
  describeRoleError,
  describeRolePermissionAssociationError,
  realAssociationFailureIds,
} from './roleErrors';

function httpError(status: number, code: string, errors?: { field: string; message: string }[]) {
  return ApiError.fromResponse(status, { code, message: `Mensaje de ${code}`, errors });
}

describe('describeRoleError', () => {
  it('maps role_name_already_exists to a field error on name', () => {
    const outcome = describeRoleError(httpError(409, 'role_name_already_exists'));

    expect(outcome).toEqual({
      kind: 'field',
      message: messages.roles.errors.nameAlreadyExists,
      fields: { name: messages.roles.errors.nameAlreadyExists },
    });
  });

  it('maps a validation_error naming the field name to a field error', () => {
    const outcome = describeRoleError(
      httpError(422, 'validation_error', [{ field: 'name', message: 'x' }]),
    );

    expect(outcome.kind).toBe('field');
  });

  it('maps role_not_found to notFound', () => {
    expect(describeRoleError(httpError(404, 'role_not_found')).kind).toBe('notFound');
  });

  it('maps permission_denied to forbidden', () => {
    expect(describeRoleError(httpError(403, 'permission_denied')).kind).toBe('forbidden');
  });

  it('maps a 5xx to retryable', () => {
    expect(describeRoleError(httpError(503, 'internal_error')).kind).toBe('retryable');
  });

  it('maps anything else, and a non-ApiError, to unexpected', () => {
    expect(describeRoleError(httpError(418, 'teapot')).kind).toBe('unexpected');
    expect(describeRoleError(new Error('boom')).kind).toBe('unexpected');
  });
});

describe('describeRolePermissionAssociationError', () => {
  it('maps role_permission_already_associated to alreadyDesired (silent success, research D6)', () => {
    expect(
      describeRolePermissionAssociationError(httpError(409, 'role_permission_already_associated')),
    ).toMatchObject({ kind: 'alreadyDesired' });
  });

  it('maps role_permission_not_associated to alreadyDesired too', () => {
    expect(
      describeRolePermissionAssociationError(httpError(409, 'role_permission_not_associated')),
    ).toMatchObject({ kind: 'alreadyDesired' });
  });

  it('maps role_permission_module_type_conflict to conflict', () => {
    expect(
      describeRolePermissionAssociationError(
        httpError(409, 'role_permission_module_type_conflict'),
      ),
    ).toMatchObject({ kind: 'conflict' });
  });

  it('maps permission_denied to forbidden', () => {
    expect(describeRolePermissionAssociationError(httpError(403, 'permission_denied')).kind).toBe(
      'forbidden',
    );
  });
});

describe('realAssociationFailureIds', () => {
  const fulfilled: PromiseFulfilledResult<void> = { status: 'fulfilled', value: undefined };
  const rejected = (reason: unknown): PromiseRejectedResult => ({ status: 'rejected', reason });

  it('keeps only the ids whose call really failed', () => {
    const ids = [1, 2, 3];
    const outcomes = [fulfilled, rejected(httpError(500, 'internal_error')), fulfilled];

    expect(realAssociationFailureIds(ids, outcomes)).toEqual([2]);
  });

  it('does not count a 409 that only means the desired state was already real', () => {
    const ids = [1, 2];
    const outcomes = [rejected(httpError(409, 'role_permission_already_associated')), fulfilled];

    expect(realAssociationFailureIds(ids, outcomes)).toEqual([]);
  });

  it('is empty when every call succeeded', () => {
    expect(realAssociationFailureIds([1, 2], [fulfilled, fulfilled])).toEqual([]);
  });
});
