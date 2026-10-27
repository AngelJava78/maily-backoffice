import { describe, expect, it } from 'vitest';

import { callSubscriptions } from '@/test/subscriptionsClient';

import { createUsersDirectoryMock } from '../usersDirectory';
import { catalogSubscription, createSubscriptionsCatalogMock, defaultCatalog } from './index';

const PATH = '/api/v1/subscriptions';

function setup() {
  const directory = createUsersDirectoryMock();
  const catalog = createSubscriptionsCatalogMock({ directory, initial: defaultCatalog() });
  return { directory, catalog };
}

const create = (body: unknown) => callSubscriptions(PATH, { method: 'POST', body });

/** Every field the API requires on create, besides `name` and `monthly_price`. */
const REQUIRED_FIELDS = {
  subscription_type_id: 1,
  annual_price: '32000.5',
  consulting_rooms_limit: 3,
  doctors_limit: 4,
  assistants_limit: 2,
  new_patients_per_year_limit: 8000,
};

describe('POST /api/v1/subscriptions', () => {
  it('creates an active subscription without clinics, and answers with it and its address', async () => {
    const { catalog } = setup();

    const answer = await create({
      name: '  Clínica Plus ',
      description: 'Para clínicas medianas.',
      monthly_price: '3200.5',
      other_features: [' Hasta 3 consultorios ', 'Agenda'],
      ...REQUIRED_FIELDS,
    });

    expect(answer.status).toBe(201);
    expect(answer.body).toMatchObject({
      id: 8,
      name: 'Clínica Plus',
      description: 'Para clínicas medianas.',
      subscription_type: { id: 1, name: 'Individual' },
      monthly_price: '3200.50',
      annual_price: '32000.50',
      trial_days: 0,
      self_service: false,
      module_keys: ['patients'],
      other_features: ['Hasta 3 consultorios', 'Agenda'],
      consulting_rooms_limit: 3,
      doctors_limit: 4,
      assistants_limit: 2,
      new_patients_per_year_limit: 8000,
      status: { id: 1, name: 'Activa' },
      clinics_count: 0,
    });
    expect(answer.headers.get('location')).toBe('/api/v1/subscriptions/8');
    expect(catalog.state.find(8)?.name).toBe('Clínica Plus');
    const listed = await callSubscriptions(PATH);
    expect(Array.isArray(listed.body) && listed.body.length).toBe(8);
  });

  it('accepts a price as a number, defaults trial_days/self_service and leaves other_features empty', async () => {
    setup();

    expect(await create({ name: 'Nuevo', monthly_price: 0, ...REQUIRED_FIELDS })).toMatchObject({
      status: 201,
      body: {
        monthly_price: '0.00',
        other_features: [],
        description: null,
        trial_days: 0,
        self_service: false,
        module_keys: ['patients'],
      },
    });
  });

  it('always includes "patients" in module_keys, whether or not it is sent', async () => {
    setup();

    expect(
      await create({
        name: 'Con módulos',
        monthly_price: '1',
        module_keys: ['scheduling'],
        ...REQUIRED_FIELDS,
      }),
    ).toMatchObject({ status: 201, body: { module_keys: ['patients', 'scheduling'] } });
  });

  it('refuses a module key outside the fixed catalog of nine, with its own code', async () => {
    setup();

    expect(
      await create({
        name: 'Con módulo raro',
        monthly_price: '1',
        module_keys: ['facturacion'],
        ...REQUIRED_FIELDS,
      }),
    ).toMatchObject({ status: 422, body: { code: 'subscription_module_not_found' } });
  });

  it('refuses a dependent module without its prerequisite, with its own code', async () => {
    setup();

    expect(
      await create({
        name: 'Sin requisito',
        monthly_price: '1',
        module_keys: ['billing'],
        ...REQUIRED_FIELDS,
      }),
    ).toMatchObject({ status: 409, body: { code: 'subscription_module_prerequisite_missing' } });
  });

  it.each([1, 2])(
    'creates with the subscription type %i, echoed back as a nested object',
    async (id) => {
      setup();

      expect(
        await create({
          name: 'Con tipo',
          monthly_price: '1',
          ...REQUIRED_FIELDS,
          subscription_type_id: id,
        }),
      ).toMatchObject({
        status: 201,
        body: { subscription_type: { id } },
      });
    },
  );

  it('refuses a subscription_type_id that is not in the catalog, with its own code', async () => {
    setup();

    expect(
      await create({
        name: 'Tipo inexistente',
        monthly_price: '1',
        ...REQUIRED_FIELDS,
        subscription_type_id: 99,
      }),
    ).toMatchObject({
      status: 422,
      body: {
        code: 'subscription_type_not_found',
        message: 'No se encontró el tipo de suscripción con el identificador 99.',
      },
    });
  });

  it.each(['pro', ' PRO ', 'Pro'])(
    'refuses the name %j, which another subscription that is not deleted uses',
    async (name) => {
      setup();

      expect(await create({ name, monthly_price: '1', ...REQUIRED_FIELDS })).toMatchObject({
        status: 409,
        body: { code: 'subscription_name_already_exists' },
      });
    },
  );

  it('accepts the name of a deleted subscription', async () => {
    const { catalog } = setup();
    catalog.addSubscription(catalogSubscription({ id: 30, name: 'Antiguo', statusId: 4 }));

    expect((await create({ name: 'Antiguo', monthly_price: '1', ...REQUIRED_FIELDS })).status).toBe(
      201,
    );
  });

  it.each(['id', 'status', 'status_id', 'clinics_count', 'created_at', 'updated_at'])(
    'refuses a request that sends %s, which is not written',
    async (field) => {
      setup();

      expect(
        await create({ name: 'Nuevo', monthly_price: '1', ...REQUIRED_FIELDS, [field]: 1 }),
      ).toMatchObject({
        status: 422,
        body: {
          code: 'validation_error',
          errors: [{ field, message: `El campo «${field}» no está permitido.` }],
        },
      });
    },
  );

  it.each([
    [
      'an empty name',
      { name: '   ', monthly_price: '1', ...REQUIRED_FIELDS },
      'name',
      'El nombre de la suscripción es obligatorio.',
    ],
    [
      'a name of 101 characters',
      { name: 'a'.repeat(101), monthly_price: '1', ...REQUIRED_FIELDS },
      'name',
      'El nombre de la suscripción no puede tener más de 100 caracteres.',
    ],
    [
      'a description of 501 characters',
      { name: 'A', description: 'a'.repeat(501), monthly_price: '1', ...REQUIRED_FIELDS },
      'description',
      'La descripción no puede tener más de 500 caracteres.',
    ],
    [
      'no monthly price',
      { name: 'A', ...REQUIRED_FIELDS },
      'monthly_price',
      'El precio mensual es obligatorio.',
    ],
    [
      'no subscription_type_id',
      { name: 'A', monthly_price: '1', ...REQUIRED_FIELDS, subscription_type_id: undefined },
      'subscription_type_id',
      'El tipo de suscripción es obligatorio y debe ser un número entero positivo.',
    ],
    [
      'a subscription_type_id of 0',
      { name: 'A', monthly_price: '1', ...REQUIRED_FIELDS, subscription_type_id: 0 },
      'subscription_type_id',
      'El tipo de suscripción es obligatorio y debe ser un número entero positivo.',
    ],
    [
      'a subscription_type_id that is not an integer',
      { name: 'A', monthly_price: '1', ...REQUIRED_FIELDS, subscription_type_id: '1' },
      'subscription_type_id',
      'El tipo de suscripción es obligatorio y debe ser un número entero positivo.',
    ],
    [
      'a negative monthly price',
      { name: 'A', monthly_price: '-1', ...REQUIRED_FIELDS },
      'monthly_price',
      'El precio mensual debe ser un importe de 0 a 99 999 999,99 con hasta dos decimales.',
    ],
    [
      'a monthly price with three decimals',
      { name: 'A', monthly_price: '12.345', ...REQUIRED_FIELDS },
      'monthly_price',
      'El precio mensual debe ser un importe de 0 a 99 999 999,99 con hasta dos decimales.',
    ],
    [
      'no annual price',
      { name: 'A', monthly_price: '1', ...REQUIRED_FIELDS, annual_price: undefined },
      'annual_price',
      'El precio anual es obligatorio.',
    ],
    [
      'an invalid annual price',
      { name: 'A', monthly_price: '1', ...REQUIRED_FIELDS, annual_price: '4,500' },
      'annual_price',
      'El precio anual debe ser un importe de 0 a 99 999 999,99 con hasta dos decimales.',
    ],
    [
      'invalid trial_days',
      { name: 'A', monthly_price: '1', ...REQUIRED_FIELDS, trial_days: 3651 },
      'trial_days',
      'Los días de prueba deben ser un número entero de 0 a 3650.',
    ],
    [
      'an invalid self_service',
      { name: 'A', monthly_price: '1', ...REQUIRED_FIELDS, self_service: 'true' },
      'self_service',
      'El autoconsumo debe ser verdadero o falso.',
    ],
    [
      'module_keys that is not a list',
      { name: 'A', monthly_price: '1', ...REQUIRED_FIELDS, module_keys: 'patients' },
      'module_keys',
      'Las claves de módulos deben ser una lista de textos.',
    ],
    [
      'no consulting_rooms_limit',
      { name: 'A', monthly_price: '1', ...REQUIRED_FIELDS, consulting_rooms_limit: undefined },
      'consulting_rooms_limit',
      'El campo «consulting_rooms_limit» es obligatorio.',
    ],
    [
      'a consulting_rooms_limit over 1,000,000',
      { name: 'A', monthly_price: '1', ...REQUIRED_FIELDS, consulting_rooms_limit: 1_000_001 },
      'consulting_rooms_limit',
      'El campo «consulting_rooms_limit» debe ser un número entero de 0 a 1 000 000.',
    ],
    [
      'no doctors_limit',
      { name: 'A', monthly_price: '1', ...REQUIRED_FIELDS, doctors_limit: undefined },
      'doctors_limit',
      'El campo «doctors_limit» es obligatorio.',
    ],
    [
      'no assistants_limit',
      { name: 'A', monthly_price: '1', ...REQUIRED_FIELDS, assistants_limit: undefined },
      'assistants_limit',
      'El campo «assistants_limit» es obligatorio.',
    ],
    [
      'no new_patients_per_year_limit',
      {
        name: 'A',
        monthly_price: '1',
        ...REQUIRED_FIELDS,
        new_patients_per_year_limit: undefined,
      },
      'new_patients_per_year_limit',
      'El campo «new_patients_per_year_limit» es obligatorio.',
    ],
    [
      '21 other features',
      {
        name: 'A',
        monthly_price: '1',
        ...REQUIRED_FIELDS,
        other_features: Array.from({ length: 21 }, (_, n) => `E${n}`),
      },
      'other_features',
      'Otras funcionalidades no puede tener más de 20 elementos.',
    ],
    [
      'an empty other feature',
      { name: 'A', monthly_price: '1', ...REQUIRED_FIELDS, other_features: ['Uno', '  '] },
      'other_features',
      'Cada elemento de otras funcionalidades debe tener de 1 a 150 caracteres.',
    ],
    [
      'an other feature that is not a text',
      { name: 'A', monthly_price: '1', ...REQUIRED_FIELDS, other_features: [1] },
      'other_features',
      'Otras funcionalidades debe ser una lista de textos.',
    ],
  ])('refuses %s with an error in that field', async (_case, body, field, message) => {
    setup();

    expect(await create(body)).toMatchObject({
      status: 422,
      body: { code: 'validation_error', errors: [{ field, message }] },
    });
  });

  it('gives one error for each field that is wrong', async () => {
    setup();

    const answer = await create({ name: '', monthly_price: 'abc' });

    expect(answer.body).toMatchObject({
      errors: [
        { field: 'subscription_type_id' },
        { field: 'name', message: 'El nombre de la suscripción es obligatorio.' },
        { field: 'monthly_price' },
        { field: 'annual_price' },
        { field: 'consulting_rooms_limit' },
        { field: 'doctors_limit' },
        { field: 'assistants_limit' },
        { field: 'new_patients_per_year_limit' },
      ],
    });
  });

  it('refuses a body that is not an object', async () => {
    setup();

    expect(await create(['Pro'])).toMatchObject({
      status: 422,
      body: { errors: [{ field: 'body', message: 'El cuerpo de la solicitud no es válido.' }] },
    });
  });

  it('refuses someone without subscriptions:write before validating', async () => {
    const { directory } = setup();
    directory.revoke('Administrator', 'subscriptions:write');

    expect(await create({ name: '' })).toMatchObject({
      status: 403,
      body: { code: 'permission_denied' },
    });
  });
});
