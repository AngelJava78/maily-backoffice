import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { messages } from '@/shared/messages/es';

import { describeModuleError } from './moduleErrors';

const text = messages.modules.errors;

function httpError(
  code: string,
  status = 409,
  fieldErrors: { field: string; message: string }[] = [],
) {
  return ApiError.fromResponse(status, { code, message: 'x', errors: fieldErrors });
}

describe('describeModuleError', () => {
  it('maps module_key_already_exists to the key field', () => {
    const result = describeModuleError(httpError('module_key_already_exists'), 'create');
    expect(result).toEqual({
      kind: 'field',
      message: text.keyInUse,
      fields: { key: text.keyInUse },
    });
  });

  it('maps module_name_already_exists to the name field', () => {
    const result = describeModuleError(httpError('module_name_already_exists'), 'create');
    expect(result).toEqual({
      kind: 'field',
      message: text.nameInUse,
      fields: { name: text.nameInUse },
    });
  });

  it.each(['module_not_found', 'permission_not_found'])('maps %s to notFound', (code) => {
    expect(describeModuleError(httpError(code, 404), 'update')).toEqual({
      kind: 'notFound',
      message: text.notFound,
    });
  });

  it('maps module_protected to protected', () => {
    expect(describeModuleError(httpError('module_protected'), 'block')).toEqual({
      kind: 'protected',
      message: text.protected,
    });
  });

  it.each(['module_already_blocked', 'module_already_active'])(
    'maps %s to statusUnchanged',
    (code) => {
      expect(describeModuleError(httpError(code), 'block')).toEqual({
        kind: 'statusUnchanged',
        message: text.statusUnchanged,
      });
    },
  );

  it('maps validation_error on create/update to the reported fields', () => {
    const result = describeModuleError(
      httpError('validation_error', 422, [{ field: 'sort_order', message: 'x' }]),
      'update',
    );
    expect(result).toEqual({
      kind: 'field',
      message: text.formInvalid,
      fields: { sortOrder: text.fields.sortOrder },
    });
  });

  it('maps validation_error with an unrecognized field to a form error', () => {
    const result = describeModuleError(
      httpError('validation_error', 422, [{ field: 'body', message: 'x' }]),
      'update',
    );
    expect(result).toEqual({ kind: 'form', message: text.formInvalid });
  });

  it('treats validation_error outside create/update as unexpected', () => {
    const result = describeModuleError(httpError('validation_error', 422), 'block');
    expect(result).toEqual({ kind: 'unexpected', message: messages.errors.unexpected });
  });

  it('maps permission_name_already_exists to retryable', () => {
    expect(
      describeModuleError(httpError('permission_name_already_exists'), 'createAction'),
    ).toEqual({
      kind: 'retryable',
      message: text.retryable,
    });
  });

  it('maps a 403 to forbidden', () => {
    expect(describeModuleError(httpError('forbidden', 403), 'list')).toEqual({
      kind: 'forbidden',
      message: messages.forbidden.action,
    });
  });

  it('maps a 5xx to retryable', () => {
    expect(describeModuleError(httpError('server_error', 500), 'list')).toEqual({
      kind: 'retryable',
      message: text.retryable,
    });
  });

  it('maps a network failure to retryable', () => {
    expect(describeModuleError(ApiError.network(), 'list')).toEqual({
      kind: 'retryable',
      message: text.retryable,
    });
  });

  it('maps anything else to unexpected', () => {
    expect(describeModuleError(httpError('something_else', 418), 'list')).toEqual({
      kind: 'unexpected',
      message: messages.errors.unexpected,
    });
  });

  it('maps a non-ApiError to unexpected', () => {
    expect(describeModuleError(new Error('boom'), 'list')).toEqual({
      kind: 'unexpected',
      message: messages.errors.unexpected,
    });
  });
});
