import { describe, expect, it } from 'vitest';

import { getModuleCapabilities } from './moduleCapabilities';

function accessWith(...permissions: string[]) {
  return { permissions: new Set(permissions) };
}

describe('getModuleCapabilities', () => {
  it('gives every capability to someone with all four permissions', () => {
    expect(
      getModuleCapabilities(
        accessWith('modules:read', 'modules:write', 'modules:update', 'modules:delete'),
      ),
    ).toEqual({ canCreate: true, canEdit: true, canBlock: true, canUnblock: true, canDelete: true });
  });

  it('canCreate needs modules:write', () => {
    expect(getModuleCapabilities(accessWith('modules:read', 'modules:write')).canCreate).toBe(true);
    expect(getModuleCapabilities(accessWith('modules:read')).canCreate).toBe(false);
  });

  it('canEdit, canBlock and canUnblock share modules:update', () => {
    const access = accessWith('modules:read', 'modules:update');
    expect(getModuleCapabilities(access)).toMatchObject({
      canEdit: true,
      canBlock: true,
      canUnblock: true,
    });
    const withoutUpdate = getModuleCapabilities(accessWith('modules:read'));
    expect(withoutUpdate.canEdit).toBe(false);
    expect(withoutUpdate.canBlock).toBe(false);
    expect(withoutUpdate.canUnblock).toBe(false);
  });

  it('canDelete needs modules:delete', () => {
    expect(getModuleCapabilities(accessWith('modules:read', 'modules:delete')).canDelete).toBe(true);
    expect(getModuleCapabilities(accessWith('modules:read')).canDelete).toBe(false);
  });

  it('gives nothing without modules:read, even with the other permissions', () => {
    expect(
      getModuleCapabilities(accessWith('modules:write', 'modules:update', 'modules:delete')),
    ).toEqual({ canCreate: false, canEdit: false, canBlock: false, canUnblock: false, canDelete: false });
  });
});
