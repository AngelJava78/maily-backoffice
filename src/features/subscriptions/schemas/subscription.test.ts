import { describe, expect, it } from 'vitest';

import { subscriptionCatalogSchema, subscriptionSchema } from './subscription';

const validDto = {
  id: 2,
  name: 'Pro',
  description: 'Para clínicas en crecimiento.',
  monthly_price: '4500.00',
  features: ['Hasta 5 consultorios', 'Usuarios ilimitados'],
  status: { id: 1, name: 'Activa' },
  clinics_count: 3,
  created_at: '2026-10-17T15:00:00Z',
  updated_at: '2026-10-18T09:30:00.120+02:00',
};

describe('subscriptionSchema', () => {
  it('converts the snake_case DTO into the camelCase domain model', () => {
    expect(subscriptionSchema.parse(validDto)).toEqual({
      id: 2,
      name: 'Pro',
      description: 'Para clínicas en crecimiento.',
      monthlyPrice: '4500.00',
      features: ['Hasta 5 consultorios', 'Usuarios ilimitados'],
      status: { id: 1, name: 'Activa' },
      clinicsCount: 3,
      createdAt: '2026-10-17T15:00:00Z',
      updatedAt: '2026-10-18T09:30:00.120+02:00',
    });
  });

  it('accepts a subscription without description, expressed as null', () => {
    expect(subscriptionSchema.parse({ ...validDto, description: null }).description).toBeNull();
  });

  it('accepts an empty list of what it includes, and keeps the order of the list', () => {
    expect(subscriptionSchema.parse({ ...validDto, features: [] }).features).toEqual([]);
    expect(subscriptionSchema.parse({ ...validDto, features: ['B', 'A'] }).features).toEqual([
      'B',
      'A',
    ]);
  });

  it('takes a number of clinics that is not available as null, never as 0', () => {
    expect(subscriptionSchema.parse({ ...validDto, clinics_count: null }).clinicsCount).toBeNull();
    expect(subscriptionSchema.parse({ ...validDto, clinics_count: 0 }).clinicsCount).toBe(0);
  });

  it('takes a missing number of clinics as null too: the published contract does not require it', () => {
    const withoutClinics = Object.fromEntries(
      Object.entries(validDto).filter(([key]) => key !== 'clinics_count'),
    );

    expect(subscriptionSchema.parse(withoutClinics).clinicsCount).toBeNull();
  });

  it('accepts a price of 0 and the highest one', () => {
    expect(subscriptionSchema.parse({ ...validDto, monthly_price: '0.00' }).monthlyPrice).toBe(
      '0.00',
    );
    expect(
      subscriptionSchema.parse({ ...validDto, monthly_price: '99999999.99' }).monthlyPrice,
    ).toBe('99999999.99');
  });

  it('accepts any status id, because what it means is decided elsewhere', () => {
    expect(
      subscriptionSchema.parse({ ...validDto, status: { id: 5, name: 'En revisión' } }).status,
    ).toEqual({ id: 5, name: 'En revisión' });
  });

  it.each([
    ['an id of 0', { id: 0 }],
    ['an id that is too big', { id: 2_147_483_648 }],
    ['a fractional id', { id: 1.5 }],
    ['a textual id', { id: '2' }],
    ['an empty name', { name: '' }],
    ['a missing name', { name: undefined }],
    ['a missing description', { description: undefined }],
    ['a price without decimals', { monthly_price: '4500' }],
    ['a price with one decimal', { monthly_price: '4500.5' }],
    ['a price that is a number', { monthly_price: 4500 }],
    ['a negative price', { monthly_price: '-1.00' }],
    ['a price with a thousands separator', { monthly_price: '4,500.00' }],
    ['a list of what it includes that is not texts', { features: [1, 2] }],
    ['a missing list of what it includes', { features: undefined }],
    ['a missing status', { status: undefined }],
    ['a status with a fractional id', { status: { id: 1.5, name: 'Activa' } }],
    ['a status without name', { status: { id: 1 } }],
    ['a negative number of clinics', { clinics_count: -1 }],
    ['a fractional number of clinics', { clinics_count: 1.5 }],
    ['a date without time', { created_at: '2026-10-17' }],
    ['a date without zone', { updated_at: '2026-10-17T15:00:00' }],
  ])('rejects %s', (_case, override) => {
    expect(subscriptionSchema.safeParse({ ...validDto, ...override }).success).toBe(false);
  });
});

describe('subscriptionCatalogSchema', () => {
  it('converts every subscription of the catalog, in the order received', () => {
    const catalog = subscriptionCatalogSchema.parse([
      { ...validDto, id: 3, name: 'Premium' },
      { ...validDto, id: 1, name: 'Básico' },
    ]);

    expect(catalog.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: 3, name: 'Premium' },
      { id: 1, name: 'Básico' },
    ]);
  });

  it('accepts an empty catalog', () => {
    expect(subscriptionCatalogSchema.parse([])).toEqual([]);
  });

  it('drops a deleted subscription (status 4), which the API never returns', () => {
    const catalog = subscriptionCatalogSchema.parse([
      { ...validDto, id: 1 },
      { ...validDto, id: 8, status: { id: 4, name: 'Eliminada' } },
    ]);

    expect(catalog.map(({ id }) => id)).toEqual([1]);
  });

  it('rejects the whole catalog when one subscription is out of contract: no partial data', () => {
    expect(
      subscriptionCatalogSchema.safeParse([validDto, { ...validDto, monthly_price: '4500' }])
        .success,
    ).toBe(false);
  });
});
