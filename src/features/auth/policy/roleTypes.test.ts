import { describe, expect, it } from 'vitest';

import { ROLE_TYPE, isSystemRoleType } from './roleTypes';

describe('ROLE_TYPE', () => {
  it('has the two identifiers of the platform catalog (FR-002)', () => {
    expect(ROLE_TYPE.SYSTEM).toBe(1);
    expect(ROLE_TYPE.CLINIC).toBe(2);
  });
});

describe('isSystemRoleType', () => {
  it('accepts only the identifier of the Sistema type', () => {
    expect(isSystemRoleType(1)).toBe(true);
  });

  it.each([2, 0, 99])('rejects %i (Clínica, or an unknown type)', (typeId) => {
    expect(isSystemRoleType(typeId)).toBe(false);
  });
});
