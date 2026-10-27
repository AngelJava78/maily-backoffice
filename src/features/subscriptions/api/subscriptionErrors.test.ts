import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { messages } from '@/shared/messages/es';

import { describeSubscriptionError, toNotification } from './subscriptionErrors';

const text = messages.subscriptions.errors;

/** A refusal of the API, with its own Spanish text, which must never reach the screen. */
const refusal = (status: number, code: string, errors?: unknown) =>
  ApiError.fromResponse(status, { code, message: 'Un texto de la API', errors });

describe('describeSubscriptionError', () => {
  it('puts a name in use next to the name, with an own text', () => {
    const outcome = describeSubscriptionError(
      refusal(409, 'subscription_name_already_exists'),
      'create',
    );

    expect(outcome).toEqual({
      kind: 'field',
      message: text.nameInUse,
      fields: { name: text.nameInUse },
    });
  });

  it('puts each rejected datum next to its input, with own texts', () => {
    const outcome = describeSubscriptionError(
      refusal(422, 'validation_error', [
        { field: 'name', message: 'El nombre de la suscripción es obligatorio.' },
        { field: 'description', message: 'La descripción no puede tener más de 500 caracteres.' },
        {
          field: 'subscription_type_id',
          message: 'El tipo de suscripción es obligatorio y debe ser un número entero positivo.',
        },
        {
          field: 'clinics_limit',
          message: 'El límite de clínicas debe ser un número entero de 1 a 100.',
        },
        { field: 'monthly_price', message: 'El precio mensual es obligatorio.' },
        { field: 'annual_price', message: 'El precio anual es obligatorio.' },
        { field: 'trial_days', message: 'Los días de prueba deben ser un entero de 0 a 3650.' },
        { field: 'self_service', message: 'El autoconsumo debe ser verdadero o falso.' },
        { field: 'module_keys', message: 'La API de usuarios no reconoce el módulo «x».' },
        { field: 'consulting_rooms_limit', message: 'El límite de consultorios es obligatorio.' },
        { field: 'doctors_limit', message: 'El límite de doctores es obligatorio.' },
        { field: 'assistants_limit', message: 'El límite de asistentes es obligatorio.' },
        {
          field: 'new_patients_per_year_limit',
          message: 'El límite de pacientes nuevos es obligatorio.',
        },
        { field: 'other_features', message: 'Otras funcionalidades admite hasta 20.' },
      ]),
      'update',
    );

    expect(outcome).toEqual({
      kind: 'field',
      message: text.formInvalid,
      fields: {
        name: text.fields.name,
        description: text.fields.description,
        subscriptionTypeId: text.fields.subscriptionTypeId,
        clinicsLimit: text.fields.clinicsLimit,
        monthlyPrice: text.fields.monthlyPrice,
        annualPrice: text.fields.annualPrice,
        trialDays: text.fields.trialDays,
        selfService: text.fields.selfService,
        moduleKeys: text.fields.moduleKeys,
        consultingRoomsLimit: text.fields.consultingRoomsLimit,
        doctorsLimit: text.fields.doctorsLimit,
        assistantsLimit: text.fields.assistantsLimit,
        newPatientsPerYearLimit: text.fields.newPatientsPerYearLimit,
        otherFeatures: text.fields.otherFeatures,
      },
    });
  });

  it.each([
    'El límite de clínicas debe ser un número entero de 1 a 100.',
    'El límite de clínicas de una suscripción Individual debe ser exactamente 1.',
    'El límite de clínicas no se puede modificar en una suscripción Individual.',
  ])(
    'puts any of the three predicted clinics-limit rejections next to its control, with an own text (contracts/subscriptions-service.md)',
    (serverMessage) => {
      const outcome = describeSubscriptionError(
        refusal(422, 'validation_error', [{ field: 'clinics_limit', message: serverMessage }]),
        'create',
      );

      expect(outcome).toEqual({
        kind: 'field',
        message: text.formInvalid,
        fields: { clinicsLimit: text.fields.clinicsLimit },
      });
    },
  );

  it.each([
    [409, 'subscription_module_prerequisite_missing'],
    [422, 'subscription_module_not_found'],
  ])('puts %i %s next to the modules section, with an own text', (status, code) => {
    const outcome = describeSubscriptionError(refusal(status, code), 'create');

    expect(outcome).toEqual({
      kind: 'field',
      message: text.fields.moduleKeys,
      fields: { moduleKeys: text.fields.moduleKeys },
    });
  });

  it('puts a subscription type not found next to the type control, with an own text', () => {
    const outcome = describeSubscriptionError(
      refusal(422, 'subscription_type_not_found'),
      'create',
    );

    expect(outcome).toEqual({
      kind: 'field',
      message: text.fields.subscriptionTypeId,
      fields: { subscriptionTypeId: text.fields.subscriptionTypeId },
    });
  });

  it('keeps the known inputs of a refusal that also names others', () => {
    const outcome = describeSubscriptionError(
      refusal(422, 'validation_error', [
        { field: 'status', message: 'El campo «status» no está permitido.' },
        { field: 'monthly_price', message: 'El precio mensual es obligatorio.' },
      ]),
      'create',
    );

    expect(outcome).toEqual({
      kind: 'field',
      message: text.formInvalid,
      fields: { monthlyPrice: text.fields.monthlyPrice },
    });
  });

  it.each([
    ['body', 'Hay que enviar al menos un dato para modificar.'],
    ['status', 'El campo «status» no está permitido.'],
    ['status_id', 'El estatus es obligatorio y debe ser un número entero.'],
    ['constructor', 'Un campo desconocido.'],
  ])('tells a refusal of %s, which is not an input of the form, as a general error', (field) => {
    const outcome = describeSubscriptionError(
      refusal(422, 'validation_error', [{ field, message: 'Un texto de la API' }]),
      'update',
    );

    expect(outcome).toEqual({ kind: 'form', message: text.formInvalid });
  });

  it('tells a validation error without data as a general error', () => {
    expect(describeSubscriptionError(refusal(422, 'validation_error'), 'create')).toEqual({
      kind: 'form',
      message: text.formInvalid,
    });
  });

  it.each([['catalog' as const], ['get' as const], ['changeStatus' as const], ['delete' as const]])(
    'tells a validation error of %s, which has no form, as unexpected: the interface never sends bad data there',
    (operation) => {
      const outcome = describeSubscriptionError(
        refusal(422, 'validation_error', [{ field: 'status_id', message: 'Un texto de la API' }]),
        operation,
      );

      expect(outcome).toEqual({ kind: 'unexpected', message: messages.errors.unexpected });
    },
  );

  it.each([
    [404, 'subscription_not_found', 'notFound', text.notFound],
    [409, 'subscription_status_unchanged', 'statusUnchanged', text.statusUnchanged],
    [409, 'subscription_has_clinics', 'hasClinics', text.hasClinics],
    [503, 'clinics_check_unavailable', 'clinicsUnavailable', text.clinicsUnavailable],
  ])('tells %i %s as %s, with an own text', (status, code, kind, message) => {
    expect(describeSubscriptionError(refusal(status, code), 'delete')).toEqual({ kind, message });
  });

  it.each([
    ['the permissions could not be checked', refusal(503, 'authorization_unavailable')],
    ['the modules could not be checked', refusal(503, 'module_check_unavailable')],
    ['an internal error', refusal(500, 'internal_error')],
    ['another 5xx', refusal(502, 'bad_gateway')],
    ['a 5xx without body', ApiError.fromResponse(504, 'Gateway Timeout')],
    ['a network failure', ApiError.network()],
    ['a timeout', ApiError.timeout()],
  ])('tells %s as something that can be retried', (_case, error) => {
    expect(describeSubscriptionError(error, 'update')).toEqual({
      kind: 'retryable',
      message: text.retryable,
    });
  });

  it('tells a lack of permission as forbidden, without a text of its own', () => {
    expect(describeSubscriptionError(refusal(403, 'permission_denied'), 'create')).toEqual({
      kind: 'forbidden',
      message: messages.forbidden.action,
    });
  });

  it.each([
    ['an unknown code', refusal(409, 'something_new')],
    ['an answer out of contract', ApiError.contract(200, 'monthly_price: invalid')],
    ['a 401 that reached the screen', refusal(401, 'invalid_token')],
    ['an error that is not of the API', new Error('boom')],
    ['something that is not an error', 'boom'],
  ])('tells %s as unexpected', (_case, error) => {
    expect(describeSubscriptionError(error, 'get')).toEqual({
      kind: 'unexpected',
      message: messages.errors.unexpected,
    });
  });

  it('never gives the text of the API, not even the one of a field', () => {
    const outcomes = [
      describeSubscriptionError(refusal(409, 'subscription_name_already_exists'), 'create'),
      describeSubscriptionError(
        refusal(422, 'validation_error', [{ field: 'name', message: 'Un texto de la API' }]),
        'create',
      ),
      describeSubscriptionError(refusal(404, 'subscription_not_found'), 'update'),
    ];

    expect(JSON.stringify(outcomes)).not.toContain('Un texto de la API');
  });
});

describe('toNotification', () => {
  it('warns about what the screen showed and is not true any more', () => {
    const outcomes = [
      describeSubscriptionError(refusal(404, 'subscription_not_found'), 'update'),
      describeSubscriptionError(refusal(409, 'subscription_status_unchanged'), 'changeStatus'),
      describeSubscriptionError(refusal(409, 'subscription_has_clinics'), 'delete'),
    ];

    for (const outcome of outcomes) {
      expect(toNotification(outcome)).toEqual({ severity: 'warning', message: outcome.message });
    }
  });

  it('tells anything else as an error', () => {
    const outcomes = [
      describeSubscriptionError(refusal(503, 'clinics_check_unavailable'), 'delete'),
      describeSubscriptionError(refusal(500, 'internal_error'), 'delete'),
      describeSubscriptionError(refusal(409, 'subscription_name_already_exists'), 'create'),
      describeSubscriptionError(refusal(422, 'validation_error'), 'create'),
      describeSubscriptionError(new Error('boom'), 'delete'),
    ];

    for (const outcome of outcomes) {
      expect(toNotification(outcome)).toEqual({ severity: 'error', message: outcome.message });
    }
  });

  it('does not tell a lack of permission, which the application already told', () => {
    expect(
      toNotification(describeSubscriptionError(refusal(403, 'permission_denied'), 'delete')),
    ).toBeNull();
  });
});
