import { describe, expect, it } from 'vitest';

import {
  CLINIC_MODULE_ORDER,
  MODULE_PREREQUISITE,
  REQUIRED_MODULE_KEY,
} from './clinicModuleCatalog';

describe('CLINIC_MODULE_ORDER', () => {
  it('is exactly the nine selectable clinic modules, in this order', () => {
    expect(CLINIC_MODULE_ORDER).toEqual([
      'patients',
      'scheduling',
      'reminders',
      'clinical_records',
      'clinical_record_templates',
      'prescriptions',
      'finance',
      'reports',
      'billing',
    ]);
  });

  it('has no duplicates', () => {
    expect(new Set(CLINIC_MODULE_ORDER).size).toBe(CLINIC_MODULE_ORDER.length);
  });
});

describe('REQUIRED_MODULE_KEY', () => {
  it('is "patients": always included, never a dependent', () => {
    expect(REQUIRED_MODULE_KEY).toBe('patients');
    expect(Object.keys(MODULE_PREREQUISITE)).not.toContain(REQUIRED_MODULE_KEY);
  });
});

describe('MODULE_PREREQUISITE', () => {
  it('is exactly the four known dependencies', () => {
    expect(MODULE_PREREQUISITE).toEqual({
      reminders: 'scheduling',
      clinical_record_templates: 'clinical_records',
      prescriptions: 'clinical_records',
      billing: 'finance',
    });
  });

  it('only refers to keys of CLINIC_MODULE_ORDER, on both sides', () => {
    for (const [dependent, prerequisite] of Object.entries(MODULE_PREREQUISITE)) {
      expect(CLINIC_MODULE_ORDER).toContain(dependent);
      expect(CLINIC_MODULE_ORDER).toContain(prerequisite);
    }
  });
});
