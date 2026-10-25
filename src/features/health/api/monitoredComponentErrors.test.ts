import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { messages } from '@/shared/messages/es';

import { describeMonitoredComponentError } from './monitoredComponentErrors';

const { errors, form } = messages.health.registry;

/** A refusal of the service, with its own Spanish text, which must never reach the screen. */
const refusal = (status: number, code: string, fieldErrors?: unknown) =>
  ApiError.fromResponse(status, { code, message: 'Un texto del servicio', errors: fieldErrors });

/** A 422 whose only rejected datum is `field`. */
const invalid = (field: string) =>
  refusal(422, 'validation_error', [{ field, message: 'Un texto del servicio' }]);

describe('describeMonitoredComponentError', () => {
  it('puts a base URL out of the allowed list next to the URL (research D16, US3-7)', () => {
    expect(describeMonitoredComponentError(invalid('base_url'), 'create')).toEqual({
      kind: 'field',
      message: errors.form,
      fields: { baseUrl: errors.hostNotAllowed },
    });
  });

  it.each([
    ['code', 'code', form.code],
    ['name', 'name', form.name],
    ['live_path', 'livePath', form.path],
    ['ready_path', 'readyPath', form.path],
    ['info_path', 'infoPath', form.path],
    ['sort_order', 'sortOrder', form.sortOrder],
    ['enabled', 'enabled', form.required],
    ['kind', 'kind', form.required],
  ])(
    'puts a rejected %s next to its input, with the format text of the form',
    (field, input, message) => {
      expect(describeMonitoredComponentError(invalid(field), 'update')).toEqual({
        kind: 'field',
        message: errors.form,
        fields: { [input]: message },
      });
    },
  );

  it('puts several rejected data next to their inputs', () => {
    const outcome = describeMonitoredComponentError(
      refusal(422, 'validation_error', [
        { field: 'base_url', message: 'x' },
        { field: 'live_path', message: 'y' },
      ]),
      'create',
    );

    expect(outcome).toEqual({
      kind: 'field',
      message: errors.form,
      fields: { baseUrl: errors.hostNotAllowed, livePath: form.path },
    });
  });

  it.each([
    ['the body', [{ field: 'body', message: 'x' }]],
    ['the id of the route', [{ field: 'component_id', message: 'x' }]],
    ['a field it does not know', [{ field: 'constructor', message: 'x' }]],
    ['no list of fields', undefined],
  ])('gives a general error of the form for %s', (_label, fieldErrors) => {
    expect(
      describeMonitoredComponentError(refusal(422, 'validation_error', fieldErrors), 'create'),
    ).toEqual({ kind: 'form', message: errors.form });
  });

  it('puts a code in use next to the code (409)', () => {
    expect(
      describeMonitoredComponentError(
        refusal(409, 'monitored_component_code_already_exists'),
        'create',
      ),
    ).toEqual({ kind: 'field', message: errors.codeTaken, fields: { code: errors.codeTaken } });
  });

  it.each(['get', 'update', 'delete'] as const)(
    'says the component no longer exists on a 404 (%s)',
    (operation) => {
      expect(
        describeMonitoredComponentError(refusal(404, 'monitored_component_not_found'), operation),
      ).toEqual({ kind: 'notFound', message: errors.notFound });
    },
  );

  it('classifies a lack of permission as forbidden, with the usual notice', () => {
    expect(describeMonitoredComponentError(refusal(403, 'permission_denied'), 'delete')).toEqual({
      kind: 'forbidden',
      message: messages.forbidden.action,
    });
  });

  it.each([
    ['a 500', refusal(500, 'internal_error'), false],
    ['a 503', refusal(503, 'authorization_unavailable'), true],
    ['a network failure', ApiError.network(), false],
    ['a time-out', ApiError.timeout(), false],
  ])('gives the generic message for %s', (_label, error, authorizationUnavailable) => {
    expect(describeMonitoredComponentError(error, 'list')).toEqual({
      kind: 'unavailable',
      message: errors.unavailable,
      authorizationUnavailable,
    });
  });

  it.each([
    ['another 4xx', refusal(400, 'bad_request')],
    ['a validation error outside a form', invalid('component_id')],
    ['a broken contract', ApiError.contract(200, 'bad shape')],
    ['an error that is not of the API', new Error('boom')],
  ])('gives the unexpected message for %s', (_label, error) => {
    expect(describeMonitoredComponentError(error, 'get')).toEqual({
      kind: 'unexpected',
      message: messages.errors.unexpected,
    });
  });

  it('never uses the text of the service', () => {
    const outcome = describeMonitoredComponentError(invalid('base_url'), 'create');

    expect(JSON.stringify(outcome)).not.toContain('Un texto del servicio');
  });
});
