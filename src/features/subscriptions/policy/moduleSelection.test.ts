import { describe, expect, it } from 'vitest';

import type { ClinicModuleKey } from '../schemas/clinicModuleCatalog';
import { withModuleChecked } from './moduleSelection';

function keysOf(selected: ReadonlySet<ClinicModuleKey>): ClinicModuleKey[] {
  return [...selected].sort();
}

describe('withModuleChecked', () => {
  it('marking a module with a prerequisite also marks the prerequisite', () => {
    const selected = new Set<ClinicModuleKey>(['patients']);
    const result = withModuleChecked(selected, 'reminders', true);
    expect(keysOf(result)).toEqual(['patients', 'reminders', 'scheduling']);
  });

  it('marking two dependents of the same prerequisite keeps it marked once', () => {
    const selected = new Set<ClinicModuleKey>(['patients']);
    const afterFirst = withModuleChecked(selected, 'clinical_record_templates', true);
    const afterSecond = withModuleChecked(afterFirst, 'prescriptions', true);
    expect(keysOf(afterSecond)).toEqual([
      'clinical_record_templates',
      'clinical_records',
      'patients',
      'prescriptions',
    ]);
  });

  it('unmarking a prerequisite unmarks its dependent', () => {
    const selected = new Set<ClinicModuleKey>(['patients', 'scheduling', 'reminders']);
    const result = withModuleChecked(selected, 'scheduling', false);
    expect(keysOf(result)).toEqual(['patients']);
  });

  it('unmarking a prerequisite unmarks every module that depended on it', () => {
    const selected = new Set<ClinicModuleKey>([
      'patients',
      'clinical_records',
      'clinical_record_templates',
      'prescriptions',
    ]);
    const result = withModuleChecked(selected, 'clinical_records', false);
    expect(keysOf(result)).toEqual(['patients']);
  });

  it('marking or unmarking a module without a prerequisite or dependents only changes it', () => {
    const selected = new Set<ClinicModuleKey>(['patients', 'finance']);
    expect(keysOf(withModuleChecked(selected, 'reports', true))).toEqual([
      'finance',
      'patients',
      'reports',
    ]);
    expect(keysOf(withModuleChecked(selected, 'finance', false))).toEqual(['patients']);
  });

  it('does not mutate the set it receives', () => {
    const selected = new Set<ClinicModuleKey>(['patients']);
    withModuleChecked(selected, 'reminders', true);
    expect(keysOf(selected)).toEqual(['patients']);
  });

  it('returns a new set', () => {
    const selected = new Set<ClinicModuleKey>(['patients']);
    expect(withModuleChecked(selected, 'finance', true)).not.toBe(selected);
  });
});
