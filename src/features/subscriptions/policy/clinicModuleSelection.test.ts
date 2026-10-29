import { describe, expect, it } from 'vitest';

import type { ClinicModule } from '../schemas/clinicModule';
import { resolveModuleSelection } from './clinicModuleSelection';

const CATALOG: ClinicModule[] = [
  { key: 'patients', name: 'Pacientes', description: null, sortOrder: 10 },
  { key: 'scheduling', name: 'Agenda y citas', description: null, sortOrder: 20 },
];

describe('resolveModuleSelection', () => {
  it('drops a key that is not in the catalog', () => {
    const selected = new Set(['patients', 'scheduling', 'administrators']);

    expect(resolveModuleSelection(selected, CATALOG)).toEqual(new Set(['patients', 'scheduling']));
  });

  it('adds the required key even if it was not selected, when the catalog has it', () => {
    const selected = new Set(['scheduling']);

    expect(resolveModuleSelection(selected, CATALOG)).toEqual(new Set(['scheduling', 'patients']));
  });

  it('does not add the required key when the catalog does not have it', () => {
    const catalogWithoutPatients: ClinicModule[] = [
      { key: 'scheduling', name: 'Agenda y citas', description: null, sortOrder: 20 },
    ];

    expect(resolveModuleSelection(new Set(), catalogWithoutPatients)).toEqual(new Set());
  });

  it('is pure: it does not mutate the set it receives', () => {
    const selected = new Set(['scheduling']);

    resolveModuleSelection(selected, CATALOG);

    expect(selected).toEqual(new Set(['scheduling']));
  });

  it('gives an empty set with an empty catalog', () => {
    expect(resolveModuleSelection(new Set(['patients']), [])).toEqual(new Set());
  });
});
