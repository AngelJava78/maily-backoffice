import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';

import {
  MAX_FEATURES,
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
  features: [{ value: 'Hasta 5 consultorios' }, { value: 'Usuarios ilimitados' }],
};

function features(count: number) {
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
        name: 'Básico',
        description: '',
        monthlyPrice: '0',
        features: [],
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

  describe('what it includes', () => {
    it(`admits from 0 to ${MAX_FEATURES} elements`, () => {
      expect(MAX_FEATURES).toBe(20);
      expect(errorAt({ ...valid, features: [] }, 'features')).toBeUndefined();
      expect(errorAt({ ...valid, features: features(20) }, 'features')).toBeUndefined();
      expect(errorAt({ ...valid, features: features(21) }, 'features')).toBe(text.featuresTooMany);
    });

    it.each(['', '   '])('puts the error of an empty element (%j) next to it', (value) => {
      const values = { ...valid, features: [{ value: 'Uno' }, { value }, { value: 'Tres' }] };

      expect(errorAt(values, 'features.1.value')).toBe(text.featureRequired);
      expect(errorAt(values, 'features.0.value')).toBeUndefined();
    });

    it('admits up to 150 characters in each element, spaces around it apart', () => {
      expect(
        errorAt({ ...valid, features: [{ value: ` ${'a'.repeat(150)} ` }] }, 'features.0.value'),
      ).toBeUndefined();
      expect(
        errorAt({ ...valid, features: [{ value: 'a'.repeat(151) }] }, 'features.0.value'),
      ).toBe(text.featureTooLong);
    });
  });

  it('does not transform the values: what the form holds is what it submits', () => {
    const values = { ...valid, monthlyPrice: '4500.5' };

    expect(subscriptionFormSchema.parse(values)).toEqual(values);
  });
});

describe('toFormValues', () => {
  it('opens the edition with the values of the subscription', () => {
    expect(
      toFormValues({
        name: 'Pro',
        description: 'Para clínicas en crecimiento.',
        monthlyPrice: '4500.00',
        features: ['Hasta 5 consultorios', 'Usuarios ilimitados'],
      }),
    ).toEqual({
      name: 'Pro',
      description: 'Para clínicas en crecimiento.',
      monthlyPrice: '4500.00',
      features: [{ value: 'Hasta 5 consultorios' }, { value: 'Usuarios ilimitados' }],
    });
  });

  it('opens a subscription without description with the field empty', () => {
    expect(
      toFormValues({ name: 'Pro', description: null, monthlyPrice: '0.00', features: [] })
        .description,
    ).toBe('');
  });
});

describe('toCreateSubscriptionBody', () => {
  it('sends the data that can be written, trimmed, with the price as text', () => {
    expect(
      toCreateSubscriptionBody({
        name: '  Pro ',
        description: ' Para clínicas. ',
        monthlyPrice: ' 4500.5 ',
        features: [{ value: ' Uno ' }, { value: 'Dos' }],
      }),
    ).toEqual({
      name: 'Pro',
      description: 'Para clínicas.',
      monthly_price: '4500.5',
      features: ['Uno', 'Dos'],
    });
  });

  it.each(['', '   '])('leaves an empty description (%j) out of the body', (description) => {
    expect(toCreateSubscriptionBody({ ...valid, description })).toEqual({
      name: 'Pro',
      monthly_price: '4500',
      features: ['Hasta 5 consultorios', 'Usuarios ilimitados'],
    });
  });

  it('sends an empty list of what it includes, and never the data that are only read', () => {
    const body = toCreateSubscriptionBody({ ...valid, features: [] });

    expect(body.features).toEqual([]);
    expect(Object.keys(body).sort()).toEqual(['description', 'features', 'monthly_price', 'name']);
  });
});

describe('toUpdateSubscriptionBody', () => {
  const initial = {
    name: 'Pro',
    description: 'Para clínicas en crecimiento.',
    monthlyPrice: '4500.00',
    features: ['Hasta 5 consultorios', 'Usuarios ilimitados'],
  };
  const unchanged = toFormValues(initial);

  it('gives null when nothing changed, so nothing is sent', () => {
    expect(toUpdateSubscriptionBody(initial, unchanged)).toBeNull();
  });

  it('does not take spaces around the texts for a change', () => {
    expect(
      toUpdateSubscriptionBody(initial, {
        name: ' Pro ',
        description: ' Para clínicas en crecimiento. ',
        monthlyPrice: ' 4500.00 ',
        features: [{ value: ' Hasta 5 consultorios' }, { value: 'Usuarios ilimitados ' }],
      }),
    ).toBeNull();
  });

  it('sends only the name, trimmed, when only the name changed', () => {
    expect(toUpdateSubscriptionBody(initial, { ...unchanged, name: ' Pro Plus ' })).toEqual({
      name: 'Pro Plus',
    });
  });

  it('takes a change of the upper case of the name for a change', () => {
    expect(toUpdateSubscriptionBody(initial, { ...unchanged, name: 'pro' })).toEqual({
      name: 'pro',
    });
  });

  it('sends the new description, or null when it was emptied', () => {
    expect(toUpdateSubscriptionBody(initial, { ...unchanged, description: ' Otra. ' })).toEqual({
      description: 'Otra.',
    });
    expect(toUpdateSubscriptionBody(initial, { ...unchanged, description: '  ' })).toEqual({
      description: null,
    });
  });

  it('compares the description with an empty one when the subscription had none', () => {
    const withoutDescription = { ...initial, description: null };

    expect(
      toUpdateSubscriptionBody(withoutDescription, toFormValues(withoutDescription)),
    ).toBeNull();
    expect(
      toUpdateSubscriptionBody(withoutDescription, {
        ...toFormValues(withoutDescription),
        description: 'Nueva.',
      }),
    ).toEqual({ description: 'Nueva.' });
  });

  it('compares the prices in cents: 4500 and 4500.00 are the same price', () => {
    expect(toUpdateSubscriptionBody(initial, { ...unchanged, monthlyPrice: '4500' })).toBeNull();
    expect(toUpdateSubscriptionBody(initial, { ...unchanged, monthlyPrice: '4500.0' })).toBeNull();
    expect(toUpdateSubscriptionBody(initial, { ...unchanged, monthlyPrice: ' 4600 ' })).toEqual({
      monthly_price: '4600',
    });
  });

  it('sends the whole list, trimmed, when an element changed', () => {
    expect(
      toUpdateSubscriptionBody(initial, {
        ...unchanged,
        features: [{ value: 'Hasta 10 consultorios ' }, { value: 'Usuarios ilimitados' }],
      }),
    ).toEqual({ features: ['Hasta 10 consultorios', 'Usuarios ilimitados'] });
  });

  it('sends the whole list when an element was removed or added', () => {
    expect(
      toUpdateSubscriptionBody(initial, {
        ...unchanged,
        features: [{ value: 'Usuarios ilimitados' }],
      }),
    ).toEqual({ features: ['Usuarios ilimitados'] });
    expect(
      toUpdateSubscriptionBody(initial, {
        ...unchanged,
        features: [...unchanged.features, { value: 'Soporte' }],
      }),
    ).toEqual({ features: ['Hasta 5 consultorios', 'Usuarios ilimitados', 'Soporte'] });
    expect(toUpdateSubscriptionBody(initial, { ...unchanged, features: [] })).toEqual({
      features: [],
    });
  });

  it('sends every datum that changed, and never the data that are only read', () => {
    expect(
      toUpdateSubscriptionBody(initial, {
        name: 'Pro 2',
        description: '',
        monthlyPrice: '5000',
        features: [],
      }),
    ).toEqual({ name: 'Pro 2', description: null, monthly_price: '5000', features: [] });
  });
});
