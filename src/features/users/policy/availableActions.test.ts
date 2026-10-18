import { describe, expect, it } from 'vitest';

import { USER_STATUS } from '../schemas/userStatus';
import { getAvailableActions, type UserAction, type UserCapabilities } from './availableActions';

const EVERYTHING: UserCapabilities = {
  canCreate: true,
  canEdit: true,
  canAddRoles: true,
  canRemoveRoles: true,
  canChangeStatus: true,
  canDelete: true,
};

const NOTHING: UserCapabilities = {
  canCreate: false,
  canEdit: false,
  canAddRoles: false,
  canRemoveRoles: false,
  canChangeStatus: false,
  canDelete: false,
};

/** The actions offered, sorted so the expectations do not depend on the order of the set. */
function offered(
  statusId: number,
  capabilities: Partial<UserCapabilities> = {},
  isSelf = false,
): UserAction[] {
  const actions = getAvailableActions({
    statusId,
    capabilities: { ...EVERYTHING, ...capabilities },
    isSelf,
  });
  return [...actions].sort();
}

describe('getAvailableActions', () => {
  it('offers an active user every action to someone who can do everything', () => {
    expect(offered(USER_STATUS.ACTIVE)).toEqual([
      'addRole',
      'block',
      'delete',
      'edit',
      'removeRole',
    ]);
  });

  it('offers only to unblock a blocked user (FR-019)', () => {
    expect(offered(USER_STATUS.BLOCKED)).toEqual(['unblock']);
  });

  it('offers only to reactivate a deleted user (FR-019)', () => {
    expect(offered(USER_STATUS.DELETED)).toEqual(['reactivate']);
  });

  it.each([0, 4, 99, -1])('offers nothing for the status %i, which is not known', (statusId) => {
    expect(offered(statusId)).toEqual([]);
  });

  it.each<[keyof UserCapabilities, UserAction]>([
    ['canEdit', 'edit'],
    ['canAddRoles', 'addRole'],
    ['canRemoveRoles', 'removeRole'],
    ['canDelete', 'delete'],
  ])('without %s an active user has no %s action and keeps the rest', (capability, action) => {
    const actions = offered(USER_STATUS.ACTIVE, { [capability]: false });

    expect(actions).not.toContain(action);
    expect(actions).toHaveLength(4);
  });

  it('ties blocking, unblocking and reactivating to the same capability', () => {
    const without = { canChangeStatus: false };

    expect(offered(USER_STATUS.ACTIVE, without)).toEqual([
      'addRole',
      'delete',
      'edit',
      'removeRole',
    ]);
    expect(offered(USER_STATUS.BLOCKED, without)).toEqual([]);
    expect(offered(USER_STATUS.DELETED, without)).toEqual([]);
  });

  it('offers nothing to someone without capabilities, whatever the status', () => {
    for (const statusId of Object.values(USER_STATUS)) {
      expect(offered(statusId, NOTHING)).toEqual([]);
    }
  });

  it('does not depend on the capability to create: that is about a user that does not exist yet', () => {
    expect(offered(USER_STATUS.ACTIVE, { canCreate: false })).toEqual(offered(USER_STATUS.ACTIVE));
  });

  describe('when the user is the operator (FR-012)', () => {
    it('keeps only editing the data of an active user', () => {
      expect(offered(USER_STATUS.ACTIVE, {}, true)).toEqual(['edit']);
    });

    it('does not affect unblocking or reactivating, which an operator cannot be waiting for', () => {
      expect(offered(USER_STATUS.BLOCKED, {}, true)).toEqual(['unblock']);
      expect(offered(USER_STATUS.DELETED, {}, true)).toEqual(['reactivate']);
    });

    it('still needs the capability to edit', () => {
      expect(offered(USER_STATUS.ACTIVE, { canEdit: false }, true)).toEqual([]);
    });
  });

  it('does not change what it is given', () => {
    const capabilities = { ...EVERYTHING };

    getAvailableActions({ statusId: USER_STATUS.ACTIVE, capabilities, isSelf: true });

    expect(capabilities).toEqual(EVERYTHING);
  });
});
