import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { messages } from '@/shared/messages/es';

import { describeUserError, toNotification } from './userErrors';

const text = messages.users.errors;
const SERVER_TEXT = 'Detalle técnico del servicio: user_id=121 auth0|abc123';

function httpError(status: number, code: string, errors?: unknown): ApiError {
  return ApiError.fromResponse(status, {
    code,
    message: SERVER_TEXT,
    ...(errors === undefined ? {} : { errors }),
  });
}

describe('describeUserError: errors of a form', () => {
  it('puts each message of the service on the field it names (FR-006)', () => {
    const error = httpError(422, 'validation_error', [
      { field: 'email', message: 'El correo no tiene formato.' },
      { field: 'first_name', message: 'El nombre es obligatorio.' },
      { field: 'paternal_last_name', message: 'Apellido paterno obligatorio.' },
      { field: 'maternal_last_name', message: 'Apellido materno demasiado largo.' },
      { field: 'password', message: 'La contraseña es obligatoria.' },
    ]);

    expect(describeUserError(error, 'create')).toEqual({
      kind: 'field',
      message: text.formInvalid,
      fields: {
        email: 'El correo no tiene formato.',
        firstName: 'El nombre es obligatorio.',
        paternalLastName: 'Apellido paterno obligatorio.',
        maternalLastName: 'Apellido materno demasiado largo.',
        password: 'La contraseña es obligatoria.',
      },
    });
  });

  it.each([
    ['only fields of the body that the form has no input for', [{ field: 'body', message: 'x' }]],
    ['auth0_id, which the interface never sends', [{ field: 'auth0_id', message: 'x' }]],
    ['a field that is not known', [{ field: 'constructor', message: 'x' }]],
    ['no list of errors at all', undefined],
    ['an empty list of errors', []],
  ])('is a general error of the form with %s', (_label, errors) => {
    const outcome = describeUserError(httpError(422, 'validation_error', errors), 'update');

    expect(outcome).toEqual({ kind: 'form', message: text.formInvalid });
  });

  it('keeps the known fields when the service also names one that is not', () => {
    const outcome = describeUserError(
      httpError(422, 'validation_error', [
        { field: 'body', message: 'x' },
        { field: 'email', message: 'Correo inválido.' },
      ]),
      'create',
    );

    expect(outcome).toEqual({
      kind: 'field',
      message: text.formInvalid,
      fields: { email: 'Correo inválido.' },
    });
  });

  it('shows a rejected password next to the password field with its own text', () => {
    expect(describeUserError(httpError(422, 'password_rejected'), 'create')).toEqual({
      kind: 'field',
      message: text.passwordRejected,
      fields: { password: text.passwordRejected },
    });
  });

  it('shows a repeated email next to the email field and suggests searching for it (US2-4)', () => {
    expect(describeUserError(httpError(409, 'user_email_already_registered'), 'create')).toEqual({
      kind: 'field',
      message: text.emailAlreadyRegistered,
      fields: { email: text.emailAlreadyRegistered },
      hint: 'searchEmail',
    });
  });

  it('shows an existing access account next to the email field', () => {
    expect(describeUserError(httpError(409, 'auth0_account_already_exists'), 'create')).toEqual({
      kind: 'field',
      message: text.accountAlreadyExists,
      fields: { email: text.accountAlreadyExists },
    });
  });
});

describe('describeUserError: conflicts with what the service has', () => {
  it.each(['user_deleted', 'user_blocked', 'user_not_active', 'user_already_active'])(
    'tells that the status of the user changed for %s',
    (code) => {
      expect(describeUserError(httpError(409, code), 'block')).toEqual({
        kind: 'statusChanged',
        message: text.statusChanged,
      });
    },
  );

  it.each(['user_role_already_associated', 'user_role_not_associated'])(
    'tells that the change of roles was already done for %s',
    (code) => {
      expect(describeUserError(httpError(409, code), 'assignRole')).toEqual({
        kind: 'alreadyDone',
        message: text.alreadyDone,
      });
    },
  );

  it('tells that the user no longer exists', () => {
    expect(describeUserError(httpError(404, 'user_not_found'), 'get')).toEqual({
      kind: 'notFound',
      message: text.notFound,
    });
  });

  it('tells that the role is no longer available', () => {
    expect(describeUserError(httpError(404, 'role_not_found'), 'assignRole')).toEqual({
      kind: 'roleUnavailable',
      message: text.roleUnavailable,
    });
  });
});

describe('describeUserError: the access account of the person (FR-021)', () => {
  it.each([
    ['unblock', text.accountMissingUnblock],
    ['reactivate', text.accountMissingReactivate],
  ] as const)(
    'says that the account does not exist when it is asked to %s',
    (operation, message) => {
      expect(describeUserError(httpError(409, 'auth0_account_not_found'), operation)).toEqual({
        kind: 'accountMissing',
        message,
      });
    },
  );

  it('says that the account could not be updated for now, and that nothing changed', () => {
    const error = httpError(503, 'identity_provider_unavailable');

    expect(describeUserError(error, 'block')).toEqual({
      kind: 'identityUnavailable',
      message: text.identityUnavailable,
    });
    expect(describeUserError(error, 'create')).toEqual({
      kind: 'identityUnavailable',
      message: text.identityUnavailableCreate,
    });
  });

  it('says that the system of accounts rejected the operation', () => {
    const error = httpError(502, 'identity_provider_error');

    expect(describeUserError(error, 'delete')).toEqual({
      kind: 'identityRejected',
      message: text.identityRejected,
    });
    expect(describeUserError(error, 'create')).toEqual({
      kind: 'identityRejected',
      message: text.identityRejectedCreate,
    });
  });
});

describe('describeUserError: failures to retry, forbidden and the rest', () => {
  it.each([
    ['a network failure', ApiError.network()],
    ['a time out', ApiError.timeout()],
    ['a server error', httpError(500, 'internal_error')],
    ['an unavailable authentication service', httpError(503, 'authentication_unavailable')],
  ])('suggests trying again after %s', (_label, error) => {
    expect(describeUserError(error, 'list')).toEqual({
      kind: 'retryable',
      message: text.retryable,
    });
  });

  it('classifies a lack of permission without a text of its own: the global notice already told', () => {
    expect(describeUserError(httpError(403, 'permission_denied'), 'update')).toEqual({
      kind: 'forbidden',
      message: messages.forbidden.action,
    });
    expect(describeUserError(httpError(403, 'something_else'), 'update').kind).toBe('forbidden');
  });

  it.each([
    ['a bad request', httpError(400, 'bad_request')],
    ['a token that was not accepted', httpError(401, 'invalid_token')],
    ['an answer that breaks the contract', ApiError.contract(200, 'The answer is not valid')],
    ['an error that is not of the service', new Error('boom')],
    ['a text', 'boom'],
    ['nothing', null],
  ])('is unexpected for %s', (_label, error) => {
    expect(describeUserError(error, 'get')).toEqual({
      kind: 'unexpected',
      message: messages.errors.unexpected,
    });
  });

  it.each([
    httpError(422, 'validation_error', [{ field: 'body', message: SERVER_TEXT }]),
    httpError(409, 'user_blocked'),
    httpError(404, 'user_not_found'),
    httpError(503, 'identity_provider_unavailable'),
    httpError(500, 'internal_error'),
    httpError(418, 'teapot'),
  ])('never shows the message of the service when it is not a message of a field', (error) => {
    expect(JSON.stringify(describeUserError(error, 'update'))).not.toContain('Detalle técnico');
  });
});

describe('toNotification', () => {
  it('does not tell a lack of permission again: the application already did', () => {
    expect(toNotification(describeUserError(httpError(403, 'permission_denied'), 'update'))).toBe(
      null,
    );
  });

  it('tells what was already done as information', () => {
    expect(
      toNotification(describeUserError(httpError(409, 'user_role_not_associated'), 'unassignRole')),
    ).toEqual({ severity: 'info', message: text.alreadyDone });
  });

  it.each([
    [httpError(409, 'user_blocked'), text.statusChanged],
    [httpError(404, 'user_not_found'), text.notFound],
    [httpError(404, 'role_not_found'), text.roleUnavailable],
  ])('warns that what the screen showed is not true any more', (error, message) => {
    expect(toNotification(describeUserError(error, 'assignRole'))).toEqual({
      severity: 'warning',
      message,
    });
  });

  it.each([
    [httpError(503, 'identity_provider_unavailable'), text.identityUnavailable],
    [httpError(502, 'identity_provider_error'), text.identityRejected],
    [httpError(500, 'internal_error'), text.retryable],
    [httpError(418, 'teapot'), messages.errors.unexpected],
  ])('tells the other failures as errors', (error, message) => {
    expect(toNotification(describeUserError(error, 'block'))).toEqual({
      severity: 'error',
      message,
    });
  });
});
