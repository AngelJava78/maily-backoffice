import { describe, expect, it } from 'vitest';

import { clinicModuleKeys } from './clinicModuleKeys';

describe('clinicModuleKeys', () => {
  it('has a prefix distinct from the catalog keys of other features', () => {
    expect(clinicModuleKeys.all).toEqual(['subscriptionsClinicModulesCatalog']);
  });

  it('builds the catalog key', () => {
    expect(clinicModuleKeys.catalog()).toEqual(['subscriptionsClinicModulesCatalog', 'catalog']);
  });
});
