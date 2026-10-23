import { describe, expect, it } from 'vitest';

import { subscriptionCatalogSchema, subscriptionSchema } from './subscription';

const validDto = {
  id: 2,
  name: 'Pro',
  description: 'Para clínicas en crecimiento.',
  monthly_price: '4500.00',
  annual_price: '45000.00',
  trial_days: 14,
  self_service: true,
  module_keys: ['patients', 'scheduling'],
  other_features: ['Hasta 5 consultorios', 'Usuarios ilimitados'],
  consulting_rooms_limit: 2,
  doctors_limit: 3,
  assistants_limit: 2,
  new_patients_per_year_limit: 15000,
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
      annualPrice: '45000.00',
      trialDays: 14,
      selfService: true,
      moduleKeys: ['patients', 'scheduling'],
      otherFeatures: ['Hasta 5 consultorios', 'Usuarios ilimitados'],
      consultingRoomsLimit: 2,
      doctorsLimit: 3,
      assistantsLimit: 2,
      newPatientsPerYearLimit: 15000,
      status: { id: 1, name: 'Activa' },
      clinicsCount: 3,
      createdAt: '2026-10-17T15:00:00Z',
      updatedAt: '2026-10-18T09:30:00.120+02:00',
    });
  });

  it('accepts a subscription without description, expressed as null', () => {
    expect(subscriptionSchema.parse({ ...validDto, description: null }).description).toBeNull();
  });

  it('accepts an empty list of other features, and keeps the order of the list', () => {
    expect(subscriptionSchema.parse({ ...validDto, other_features: [] }).otherFeatures).toEqual([]);
    expect(
      subscriptionSchema.parse({ ...validDto, other_features: ['B', 'A'] }).otherFeatures,
    ).toEqual(['B', 'A']);
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

  it('accepts a monthly or annual price of 0 and the highest one', () => {
    expect(subscriptionSchema.parse({ ...validDto, monthly_price: '0.00' }).monthlyPrice).toBe(
      '0.00',
    );
    expect(
      subscriptionSchema.parse({ ...validDto, monthly_price: '99999999.99' }).monthlyPrice,
    ).toBe('99999999.99');
    expect(subscriptionSchema.parse({ ...validDto, annual_price: '0.00' }).annualPrice).toBe(
      '0.00',
    );
  });

  it('accepts 0 trial days (no trial period) and the highest one, 3650', () => {
    expect(subscriptionSchema.parse({ ...validDto, trial_days: 0 }).trialDays).toBe(0);
    expect(subscriptionSchema.parse({ ...validDto, trial_days: 3650 }).trialDays).toBe(3650);
  });

  it('accepts self_service true and false', () => {
    expect(subscriptionSchema.parse({ ...validDto, self_service: false }).selfService).toBe(false);
  });

  it('keeps a module key outside the fixed catalog as plain text, without rejecting it', () => {
    expect(
      subscriptionSchema.parse({ ...validDto, module_keys: ['patients', 'future_module'] })
        .moduleKeys,
    ).toEqual(['patients', 'future_module']);
  });

  it('accepts the four clinic limits at 0 and at the highest one, 1,000,000', () => {
    const atZero = subscriptionSchema.parse({
      ...validDto,
      consulting_rooms_limit: 0,
      doctors_limit: 0,
      assistants_limit: 0,
      new_patients_per_year_limit: 0,
    });
    expect(atZero.consultingRoomsLimit).toBe(0);
    expect(atZero.doctorsLimit).toBe(0);
    expect(atZero.assistantsLimit).toBe(0);
    expect(atZero.newPatientsPerYearLimit).toBe(0);

    expect(
      subscriptionSchema.parse({ ...validDto, consulting_rooms_limit: 1_000_000 })
        .consultingRoomsLimit,
    ).toBe(1_000_000);
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
    ['a monthly price without decimals', { monthly_price: '4500' }],
    ['a monthly price with one decimal', { monthly_price: '4500.5' }],
    ['a monthly price that is a number', { monthly_price: 4500 }],
    ['a negative monthly price', { monthly_price: '-1.00' }],
    ['a monthly price with a thousands separator', { monthly_price: '4,500.00' }],
    ['an annual price without decimals', { annual_price: '45000' }],
    ['a missing annual price', { annual_price: undefined }],
    ['a negative trial_days', { trial_days: -1 }],
    ['a trial_days over 3650', { trial_days: 3651 }],
    ['a fractional trial_days', { trial_days: 14.5 }],
    ['a missing trial_days', { trial_days: undefined }],
    ['a missing self_service', { self_service: undefined }],
    ['a self_service that is not a boolean', { self_service: 'true' }],
    ['a list of module_keys that is not texts', { module_keys: [1, 2] }],
    ['a missing list of module_keys', { module_keys: undefined }],
    ['a list of other_features that is not texts', { other_features: [1, 2] }],
    ['a missing list of other_features', { other_features: undefined }],
    ['a negative consulting_rooms_limit', { consulting_rooms_limit: -1 }],
    ['a consulting_rooms_limit over 1,000,000', { consulting_rooms_limit: 1_000_001 }],
    ['a missing doctors_limit', { doctors_limit: undefined }],
    ['a negative assistants_limit', { assistants_limit: -1 }],
    ['a negative new_patients_per_year_limit', { new_patients_per_year_limit: -1 }],
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
