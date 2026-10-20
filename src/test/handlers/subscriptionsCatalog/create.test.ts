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

describe('POST /api/v1/subscriptions', () => {
  it('creates an active subscription without clinics, and answers with it and its address', async () => {
    const { catalog } = setup();

    const answer = await create({
      name: '  Clínica Plus ',
      description: 'Para clínicas medianas.',
      monthly_price: '3200.5',
      features: [' Hasta 3 consultorios ', 'Agenda'],
    });

    expect(answer.status).toBe(201);
    expect(answer.body).toMatchObject({
      id: 8,
      name: 'Clínica Plus',
      description: 'Para clínicas medianas.',
      monthly_price: '3200.50',
      features: ['Hasta 3 consultorios', 'Agenda'],
      status: { id: 1, name: 'Activa' },
      clinics_count: 0,
    });
    expect(answer.headers.get('location')).toBe('/api/v1/subscriptions/8');
    expect(catalog.state.find(8)?.name).toBe('Clínica Plus');
    const listed = await callSubscriptions(PATH);
    expect(Array.isArray(listed.body) && listed.body.length).toBe(8);
  });

  it('accepts a price as a number and leaves what it includes empty when it is not sent', async () => {
    setup();

    expect(await create({ name: 'Nuevo', monthly_price: 0 })).toMatchObject({
      status: 201,
      body: { monthly_price: '0.00', features: [], description: null },
    });
  });

  it.each(['pro', ' PRO ', 'Pro'])(
    'refuses the name %j, which another subscription that is not deleted uses',
    async (name) => {
      setup();

      expect(await create({ name, monthly_price: '1' })).toMatchObject({
        status: 409,
        body: { code: 'subscription_name_already_exists' },
      });
    },
  );

  it('accepts the name of a deleted subscription', async () => {
    const { catalog } = setup();
    catalog.addSubscription(catalogSubscription({ id: 30, name: 'Antiguo', statusId: 4 }));

    expect((await create({ name: 'Antiguo', monthly_price: '1' })).status).toBe(201);
  });

  it.each(['id', 'status', 'status_id', 'clinics_count', 'created_at', 'updated_at'])(
    'refuses a request that sends %s, which is not written',
    async (field) => {
      setup();

      expect(await create({ name: 'Nuevo', monthly_price: '1', [field]: 1 })).toMatchObject({
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
      { name: '   ', monthly_price: '1' },
      'name',
      'El nombre de la suscripción es obligatorio.',
    ],
    [
      'a name of 101 characters',
      { name: 'a'.repeat(101), monthly_price: '1' },
      'name',
      'El nombre de la suscripción no puede tener más de 100 caracteres.',
    ],
    [
      'a description of 501 characters',
      { name: 'A', description: 'a'.repeat(501), monthly_price: '1' },
      'description',
      'La descripción no puede tener más de 500 caracteres.',
    ],
    ['no price', { name: 'A' }, 'monthly_price', 'El precio mensual es obligatorio.'],
    [
      'a negative price',
      { name: 'A', monthly_price: '-1' },
      'monthly_price',
      'El precio mensual debe ser un importe de 0 a 99 999 999,99 con hasta dos decimales.',
    ],
    [
      'a price with three decimals',
      { name: 'A', monthly_price: '12.345' },
      'monthly_price',
      'El precio mensual debe ser un importe de 0 a 99 999 999,99 con hasta dos decimales.',
    ],
    [
      'a price that is too big',
      { name: 'A', monthly_price: 100_000_000 },
      'monthly_price',
      'El precio mensual debe ser un importe de 0 a 99 999 999,99 con hasta dos decimales.',
    ],
    [
      '21 elements',
      { name: 'A', monthly_price: '1', features: Array.from({ length: 21 }, (_, n) => `E${n}`) },
      'features',
      'Lo que incluye la suscripción no puede tener más de 20 elementos.',
    ],
    [
      'an empty element',
      { name: 'A', monthly_price: '1', features: ['Uno', '  '] },
      'features',
      'Cada elemento de lo que incluye la suscripción debe tener de 1 a 150 caracteres.',
    ],
    [
      'an element that is not a text',
      { name: 'A', monthly_price: '1', features: [1] },
      'features',
      'Lo que incluye la suscripción debe ser una lista de textos.',
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
        { field: 'name', message: 'El nombre de la suscripción es obligatorio.' },
        { field: 'monthly_price' },
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
