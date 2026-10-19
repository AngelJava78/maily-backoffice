import { describe, expect, it } from 'vitest';

import { ApiError, SessionExpiredError } from './ApiError';

describe('ApiError.fromResponse', () => {
  it('reads the code and the message of the service error body', () => {
    const error = ApiError.fromResponse(404, {
      code: 'user_not_found',
      message: 'No existe el usuario',
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(404);
    expect(error.code).toBe('user_not_found');
    expect(error.message).toBe('No existe el usuario');
    expect(error.kind).toBe('http');
    expect(error.fieldErrors).toEqual([]);
    expect(error.isRetryable).toBe(false);
  });

  it('keeps the field errors of a validation error', () => {
    const error = ApiError.fromResponse(422, {
      code: 'validation_error',
      message: 'Datos inválidos',
      errors: [
        { field: 'email', message: 'Formato inválido' },
        { field: 'first_name', message: 'Obligatorio' },
      ],
    });

    expect(error.code).toBe('validation_error');
    expect(error.fieldErrors).toEqual([
      { field: 'email', message: 'Formato inválido' },
      { field: 'first_name', message: 'Obligatorio' },
    ]);
  });

  it('ignores field errors that do not have the expected shape', () => {
    const error = ApiError.fromResponse(422, {
      code: 'validation_error',
      message: 'Datos inválidos',
      errors: 'not a list',
    });

    expect(error.code).toBe('validation_error');
    expect(error.fieldErrors).toEqual([]);
  });

  it.each([
    ['text', 'Bad Gateway'],
    ['html', '<html><body>502</body></html>'],
    ['undefined', undefined],
    ['null', null],
    ['a number', 42],
    ['an empty object', {}],
    ['a body without message', { code: 'oops' }],
    ['a body without code', { message: 'oops' }],
    ['a body with the wrong types', { code: 1, message: 2 }],
  ])('uses unknown_error when the body is %s', (_label, body) => {
    const error = ApiError.fromResponse(502, body);

    expect(error.code).toBe('unknown_error');
    expect(error.status).toBe(502);
    expect(error.kind).toBe('http');
    expect(error.message).not.toBe('');
    expect(error.fieldErrors).toEqual([]);
  });

  it.each([400, 401, 403, 404, 409, 422, 429])('does not retry the status %i', (status) => {
    expect(ApiError.fromResponse(status, undefined).isRetryable).toBe(false);
  });

  it.each([500, 502, 503, 504])('retries the status %i', (status) => {
    expect(ApiError.fromResponse(status, undefined).isRetryable).toBe(true);
  });
});

describe('ApiError factories', () => {
  it('describes a network failure as retryable and without status', () => {
    const cause = new TypeError('Failed to fetch');
    const error = ApiError.network(cause);

    expect(error.kind).toBe('network');
    expect(error.code).toBe('network_error');
    expect(error.status).toBeNull();
    expect(error.isRetryable).toBe(true);
    expect(error.cause).toBe(cause);
  });

  it('describes a timeout as retryable and without status', () => {
    const error = ApiError.timeout();

    expect(error.kind).toBe('timeout');
    expect(error.code).toBe('timeout');
    expect(error.status).toBeNull();
    expect(error.isRetryable).toBe(true);
  });

  it('describes a contract failure as not retryable and keeps the status', () => {
    const error = ApiError.contract(200, 'Unexpected response shape');

    expect(error.kind).toBe('contract');
    expect(error.code).toBe('contract_violation');
    expect(error.status).toBe(200);
    expect(error.message).toBe('Unexpected response shape');
    expect(error.isRetryable).toBe(false);
  });
});

describe('SessionExpiredError', () => {
  it('is an Error of its own that can carry the cause', () => {
    const cause = ApiError.fromResponse(401, { code: 'token_expired', message: 'Token vencido' });
    const error = new SessionExpiredError({ cause });

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ApiError);
    expect(error.name).toBe('SessionExpiredError');
    expect(error.cause).toBe(cause);
  });

  it('can be created without a cause', () => {
    expect(new SessionExpiredError().cause).toBeUndefined();
  });
});
