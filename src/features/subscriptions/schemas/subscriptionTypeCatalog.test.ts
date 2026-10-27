import { describe, expect, it } from 'vitest';

import { SUBSCRIPTION_TYPE, SUBSCRIPTION_TYPE_ORDER } from './subscriptionTypeCatalog';

describe('SUBSCRIPTION_TYPE', () => {
  it('is exactly the two catalog identifiers of today', () => {
    expect(SUBSCRIPTION_TYPE).toEqual({ INDIVIDUAL: 1, ENTERPRISE: 2 });
  });
});

describe('SUBSCRIPTION_TYPE_ORDER', () => {
  it('is Individual then Enterprise, with no duplicates', () => {
    expect(SUBSCRIPTION_TYPE_ORDER).toEqual([
      SUBSCRIPTION_TYPE.INDIVIDUAL,
      SUBSCRIPTION_TYPE.ENTERPRISE,
    ]);
    expect(new Set(SUBSCRIPTION_TYPE_ORDER).size).toBe(SUBSCRIPTION_TYPE_ORDER.length);
  });
});
