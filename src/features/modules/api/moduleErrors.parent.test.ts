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
  return ApiError.fromResponse(status, {
    code,
    message: 'TEXTO-DEL-SERVICIO',
    errors: fieldErrors,
  });
}

function parentFieldOutcome(message: string) {
  return { kind: 'field', message, fields: { parentModuleId: message } };
}

describe('describeModuleError, the parent module (spec 024)', () => {
  it.each([
    ['module_parent_not_found', 404, text.parentNotFound],
    ['module_parent_is_submodule', 409, text.parentIsSubmodule],
    ['module_parent_type_mismatch', 409, text.parentTypeMismatch],
  ])('maps %s to the parent field when creating and when updating', (code, status, message) => {
    expect(describeModuleError(httpError(code, status), 'create')).toEqual(
      parentFieldOutcome(message),
    );
    expect(describeModuleError(httpError(code, status), 'update')).toEqual(
      parentFieldOutcome(message),
    );
  });

  it('maps module_parent_self_reference to the parent field', () => {
    expect(describeModuleError(httpError('module_parent_self_reference'), 'update')).toEqual(
      parentFieldOutcome(text.parentSelfReference),
    );
  });

  it('maps module_has_submodules, when updating, to the parent field', () => {
    expect(describeModuleError(httpError('module_has_submodules'), 'update')).toEqual(
      parentFieldOutcome(text.hasSubmodulesAsChild),
    );
  });

  it('maps module_protected, on a form, to the parent field', () => {
    expect(describeModuleError(httpError('module_protected'), 'create')).toEqual(
      parentFieldOutcome(text.parentProtected),
    );
    expect(describeModuleError(httpError('module_protected'), 'update')).toEqual(
      parentFieldOutcome(text.parentProtected),
    );
  });

  it.each(['block', 'delete'] as const)(
    'keeps module_protected as it was when it is about to %s',
    (operation) => {
      expect(describeModuleError(httpError('module_protected'), operation)).toEqual({
        kind: 'protected',
        message: text.protected,
      });
    },
  );

  it('maps a validation error on parent_module_id to the parent field, in the words of the interface', () => {
    const error = httpError('validation_error', 422, [
      { field: 'parent_module_id', message: 'TEXTO-DEL-SERVICIO' },
    ]);

    expect(describeModuleError(error, 'update')).toEqual({
      kind: 'field',
      message: text.formInvalid,
      fields: { parentModuleId: text.fields.parentModuleId },
    });
  });

  it('never shows the text of the service', () => {
    const codes = [
      'module_parent_not_found',
      'module_parent_is_submodule',
      'module_parent_type_mismatch',
      'module_parent_self_reference',
      'module_has_submodules',
      'module_protected',
    ];

    for (const code of codes) {
      expect(JSON.stringify(describeModuleError(httpError(code), 'update'))).not.toContain(
        'TEXTO-DEL-SERVICIO',
      );
    }
  });
});
