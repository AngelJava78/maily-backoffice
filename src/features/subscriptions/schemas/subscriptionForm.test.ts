import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';

import { REQUIRED_MODULE_KEY, type ClinicModuleKey } from './clinicModuleCatalog';
import {
  MAX_OTHER_FEATURES,
  subscriptionFormSchema,
  toCreateSubscriptionBody,
  toFormValues,
  toUpdateSubscriptionBody,
  type SubscriptionFormValues,
} from './subscriptionForm';

const text = messages.subscriptions.validation;

const valid: SubscriptionFormValues = {
  name: 'Pro',
  description: 'Para clínicas en crecimiento.',
  monthlyPrice: '4500',
  annualPrice: '45000',
  trialDays: '14',
  selfService: true,
  moduleKeys: new Set<ClinicModuleKey>(['patients', 'scheduling']),
  consultingRoomsLimit: '2',
  doctorsLimit: '3',
  assistantsLimit: '2',
  newPatientsPerYearLimit: '15000',
  otherFeatures: [{ value: 'Hasta 5 consultorios' }, { value: 'Usuarios ilimitados' }],
};

function otherFeatures(count: number) {
  return Array.from({ length: count }, (_, index) => ({ value: `Elemento ${index + 1}` }));
}

/** The first message of the form for one path, as the form shows it next to that input. */
function errorAt(values: SubscriptionFormValues, path: string): string | undefined {
  const result = subscriptionFormSchema.safeParse(values);
  return result.error?.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('subscriptionFormSchema', () => {
  it('accepts a valid subscription, and one with nothing optional', () => {
    expect(subscriptionFormSchema.safeParse(valid).success).toBe(true);
    expect(
      subscriptionFormSchema.safeParse({
        ...valid,
        description: '',
        otherFeatures: [],
        moduleKeys: new Set<ClinicModuleKey>([REQUIRED_MODULE_KEY]),
      }).success,
    ).toBe(true);
  });

  describe('the name', () => {
    it('is valid with spaces around it, which do not count', () => {
      expect(errorAt({ ...valid, name: '  Pro  ' }, 'name')).toBeUndefined();
      expect(errorAt({ ...valid, name: ` ${'a'.repeat(100)} ` }, 'name')).toBeUndefined();
    });

    it.each(['', '   '])('is required (%j)', (name) => {
      expect(errorAt({ ...valid, name }, 'name')).toBe(text.nameRequired);
    });

    it('has up to 100 characters', () => {
      expect(errorAt({ ...valid, name: 'a'.repeat(101) }, 'name')).toBe(text.nameTooLong);
    });
  });

  describe('the description', () => {
    it('is optional and has up to 500 characters, spaces around it apart', () => {
      expect(errorAt({ ...valid, description: '' }, 'description')).toBeUndefined();
      expect(errorAt({ ...valid, description: ` ${'a'.repeat(500)} ` }, 'description')).toBe(
        undefined,
      );
      expect(errorAt({ ...valid, description: 'a'.repeat(501) }, 'description')).toBe(
        text.descriptionTooLong,
      );
    });
  });

  describe('the monthly price', () => {
    it.each(['0', '4500', '4500.5', '4500.50', '99999999.99', ' 4500 '])('accepts %j', (price) => {
      expect(errorAt({ ...valid, monthlyPrice: price }, 'monthlyPrice')).toBeUndefined();
    });

    it.each(['', '   '])('is required (%j)', (price) => {
      expect(errorAt({ ...valid, monthlyPrice: price }, 'monthlyPrice')).toBe(text.priceRequired);
    });

    it.each(['4,500', '$4500', '-1', '12.345', '100000000', '1e3', '4500.', '.5', 'abc'])(
      'rejects %j: commas, "$" and any other character are an error',
      (price) => {
        expect(errorAt({ ...valid, monthlyPrice: price }, 'monthlyPrice')).toBe(text.priceInvalid);
      },
    );
  });

  describe('the annual price', () => {
    it.each(['0', '45000', '45000.5', '99999999.99'])('accepts %j', (price) => {
      expect(errorAt({ ...valid, annualPrice: price }, 'annualPrice')).toBeUndefined();
    });

    it.each(['', '   '])('is required (%j)', (price) => {
      expect(errorAt({ ...valid, annualPrice: price }, 'annualPrice')).toBe(
        text.annualPriceRequired,
      );
    });

    it.each(['4,500', '$4500', '-1', '12.345'])(
      'rejects %j, same format as the monthly price',
      (price) => {
        expect(errorAt({ ...valid, annualPrice: price }, 'annualPrice')).toBe(
          text.annualPriceInvalid,
        );
      },
    );
  });

  describe('the trial days', () => {
    it.each(['0', '14', '3650'])('accepts %j', (days) => {
      expect(errorAt({ ...valid, trialDays: days }, 'trialDays')).toBeUndefined();
    });

    it.each(['', '-1', '3651', '14.5', 'abc'])('rejects %j', (days) => {
      expect(errorAt({ ...valid, trialDays: days }, 'trialDays')).toBe(text.trialDaysInvalid);
    });
  });

  describe('the clinic limits', () => {
    it.each(['consultingRoomsLimit', 'doctorsLimit', 'assistantsLimit', 'newPatientsPerYearLimit'])(
      '%s accepts 0 and 1,000,000, and rejects empty, negative or fractional',
      (field) => {
        expect(errorAt({ ...valid, [field]: '0' }, field)).toBeUndefined();
        expect(errorAt({ ...valid, [field]: '1000000' }, field)).toBeUndefined();
        expect(errorAt({ ...valid, [field]: '' }, field)).toBeDefined();
        expect(errorAt({ ...valid, [field]: '-1' }, field)).toBeDefined();
        expect(errorAt({ ...valid, [field]: '1000001' }, field)).toBeDefined();
        expect(errorAt({ ...valid, [field]: '1.5' }, field)).toBeDefined();
      },
    );
  });

  describe('other features', () => {
    it(`admits from 0 to ${MAX_OTHER_FEATURES} elements`, () => {
      expect(MAX_OTHER_FEATURES).toBe(20);
      expect(errorAt({ ...valid, otherFeatures: [] }, 'otherFeatures')).toBeUndefined();
      expect(
        errorAt({ ...valid, otherFeatures: otherFeatures(20) }, 'otherFeatures'),
      ).toBeUndefined();
      expect(errorAt({ ...valid, otherFeatures: otherFeatures(21) }, 'otherFeatures')).toBe(
        text.otherFeaturesTooMany,
      );
    });

    it.each(['', '   '])('puts the error of an empty element (%j) next to it', (value) => {
      const values = {
        ...valid,
        otherFeatures: [{ value: 'Uno' }, { value }, { value: 'Tres' }],
      };

      expect(errorAt(values, 'otherFeatures.1.value')).toBe(text.otherFeatureRequired);
      expect(errorAt(values, 'otherFeatures.0.value')).toBeUndefined();
    });

    it('admits up to 150 characters in each element, spaces around it apart', () => {
      expect(
        errorAt(
          { ...valid, otherFeatures: [{ value: ` ${'a'.repeat(150)} ` }] },
          'otherFeatures.0.value',
        ),
      ).toBeUndefined();
      expect(
        errorAt({ ...valid, otherFeatures: [{ value: 'a'.repeat(151) }] }, 'otherFeatures.0.value'),
      ).toBe(text.otherFeatureTooLong);
    });
  });
});

describe('toFormValues', () => {
  const subscription = {
    name: 'Pro',
    description: 'Para clínicas en crecimiento.',
    monthlyPrice: '4500.00',
    annualPrice: '45000.00',
    trialDays: 14,
    selfService: true,
    moduleKeys: ['scheduling', 'patients'],
    otherFeatures: ['Hasta 5 consultorios', 'Usuarios ilimitados'],
    consultingRoomsLimit: 2,
    doctorsLimit: 3,
    assistantsLimit: 2,
    newPatientsPerYearLimit: 15000,
  };

  it('opens the edition with the values of the subscription', () => {
    expect(toFormValues(subscription)).toEqual({
      name: 'Pro',
      description: 'Para clínicas en crecimiento.',
      monthlyPrice: '4500.00',
      annualPrice: '45000.00',
      trialDays: '14',
      selfService: true,
      moduleKeys: new Set(['scheduling', 'patients']),
      consultingRoomsLimit: '2',
      doctorsLimit: '3',
      assistantsLimit: '2',
      newPatientsPerYearLimit: '15000',
      otherFeatures: [{ value: 'Hasta 5 consultorios' }, { value: 'Usuarios ilimitados' }],
    });
  });

  it('opens a subscription without description with the field empty', () => {
    expect(toFormValues({ ...subscription, description: null }).description).toBe('');
  });

  it('drops a module key that is not in the fixed catalog of nine', () => {
    expect(
      toFormValues({ ...subscription, moduleKeys: ['patients', 'future_module'] }).moduleKeys,
    ).toEqual(new Set(['patients']));
  });
});

describe('toCreateSubscriptionBody', () => {
  it('sends the data that can be written, trimmed, with the new fields as numbers', () => {
    expect(
      toCreateSubscriptionBody({
        ...valid,
        name: '  Pro ',
        description: ' Para clínicas. ',
        monthlyPrice: ' 4500.5 ',
        annualPrice: ' 45000.5 ',
        trialDays: ' 14 ',
        otherFeatures: [{ value: ' Uno ' }, { value: 'Dos' }],
      }),
    ).toEqual({
      name: 'Pro',
      description: 'Para clínicas.',
      monthly_price: '4500.5',
      annual_price: '45000.5',
      trial_days: 14,
      self_service: true,
      module_keys: ['patients', 'scheduling'],
      other_features: ['Uno', 'Dos'],
      consulting_rooms_limit: 2,
      doctors_limit: 3,
      assistants_limit: 2,
      new_patients_per_year_limit: 15000,
    });
  });

  it.each(['', '   '])('leaves an empty description (%j) out of the body', (description) => {
    expect(toCreateSubscriptionBody({ ...valid, description }).description).toBeUndefined();
  });

  it('sends an empty list of other features, and never the data that are only read', () => {
    const body = toCreateSubscriptionBody({ ...valid, otherFeatures: [] });

    expect(body.other_features).toEqual([]);
    expect(Object.keys(body).sort()).toEqual([
      'annual_price',
      'assistants_limit',
      'consulting_rooms_limit',
      'description',
      'doctors_limit',
      'module_keys',
      'monthly_price',
      'name',
      'new_patients_per_year_limit',
      'other_features',
      'self_service',
      'trial_days',
    ]);
  });
});

describe('toUpdateSubscriptionBody', () => {
  const initial = {
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
  };
  const unchanged = toFormValues(initial);

  it('gives null when nothing changed, so nothing is sent', () => {
    expect(toUpdateSubscriptionBody(initial, unchanged)).toBeNull();
  });

  it('sends only the name, trimmed, when only the name changed', () => {
    expect(toUpdateSubscriptionBody(initial, { ...unchanged, name: ' Pro Plus ' })).toEqual({
      name: 'Pro Plus',
    });
  });

  it('compares the annual price in cents, like the monthly price', () => {
    expect(toUpdateSubscriptionBody(initial, { ...unchanged, annualPrice: '45000' })).toBeNull();
    expect(toUpdateSubscriptionBody(initial, { ...unchanged, annualPrice: '46000' })).toEqual({
      annual_price: '46000',
    });
  });

  it('sends the new trial days only when the number changed', () => {
    expect(toUpdateSubscriptionBody(initial, { ...unchanged, trialDays: '14' })).toBeNull();
    expect(toUpdateSubscriptionBody(initial, { ...unchanged, trialDays: '30' })).toEqual({
      trial_days: 30,
    });
  });

  it('sends the new self_service only when it changed', () => {
    expect(toUpdateSubscriptionBody(initial, { ...unchanged, selfService: false })).toEqual({
      self_service: false,
    });
  });

  it('sends the new clinic limits only when they changed', () => {
    expect(toUpdateSubscriptionBody(initial, { ...unchanged, doctorsLimit: '5' })).toEqual({
      doctors_limit: 5,
    });
  });

  it('compares the module set without regard to order, and sends it complete when it changed', () => {
    expect(
      toUpdateSubscriptionBody(initial, {
        ...unchanged,
        moduleKeys: new Set(['scheduling', 'patients']),
      }),
    ).toBeNull();
    expect(
      toUpdateSubscriptionBody(initial, {
        ...unchanged,
        moduleKeys: new Set(['patients', 'scheduling', 'reminders']),
      }),
    ).toEqual({ module_keys: ['patients', 'reminders', 'scheduling'] });
  });

  it('sends the whole list of other features when an element changed', () => {
    expect(
      toUpdateSubscriptionBody(initial, {
        ...unchanged,
        otherFeatures: [{ value: 'Hasta 10 consultorios ' }, { value: 'Usuarios ilimitados' }],
      }),
    ).toEqual({ other_features: ['Hasta 10 consultorios', 'Usuarios ilimitados'] });
  });

  it('sends every datum that changed, and never the data that are only read', () => {
    expect(
      toUpdateSubscriptionBody(initial, {
        ...unchanged,
        name: 'Pro 2',
        description: '',
        monthlyPrice: '5000',
      }),
    ).toEqual({ name: 'Pro 2', description: null, monthly_price: '5000' });
  });
});
