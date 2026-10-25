import { describe, expect, it } from 'vitest';

import { getHealthCapabilities } from './healthCapabilities';

function accessWith(...permissions: string[]) {
  return { permissions: new Set(permissions) };
}

describe('getHealthCapabilities', () => {
  it('gives nothing without permissions, or with health:read alone', () => {
    const nothing = { canCreate: false, canEdit: false, canDelete: false };

    expect(getHealthCapabilities(accessWith())).toEqual(nothing);
    expect(getHealthCapabilities(accessWith('health:read'))).toEqual(nothing);
  });

  it('canCreate needs health:write', () => {
    expect(getHealthCapabilities(accessWith('health:read', 'health:write'))).toEqual({
      canCreate: true,
      canEdit: false,
      canDelete: false,
    });
  });

  it('canEdit needs health:update', () => {
    expect(getHealthCapabilities(accessWith('health:read', 'health:update'))).toEqual({
      canCreate: false,
      canEdit: true,
      canDelete: false,
    });
  });

  it('canDelete needs health:delete', () => {
    expect(getHealthCapabilities(accessWith('health:read', 'health:delete'))).toEqual({
      canCreate: false,
      canEdit: false,
      canDelete: true,
    });
  });

  it('gives nothing without health:read, even with the other permissions', () => {
    expect(
      getHealthCapabilities(accessWith('health:write', 'health:update', 'health:delete')),
    ).toEqual({ canCreate: false, canEdit: false, canDelete: false });
  });
});
