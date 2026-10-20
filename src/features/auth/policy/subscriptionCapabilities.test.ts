import { describe, expect, it } from 'vitest';

import { getSubscriptionCapabilities } from './subscriptionCapabilities';

function accessWith(...permissions: string[]) {
  return { permissions: new Set(permissions) };
}

const NOTHING = {
  canCreate: false,
  canEdit: false,
  canChangeStatus: false,
  canDelete: false,
};

describe('getSubscriptionCapabilities', () => {
  it('gives nothing to someone who cannot read the subscriptions, whatever else they have', () => {
    const access = accessWith(
      'subscriptions:write',
      'subscriptions:update',
      'subscriptions:delete',
    );

    expect(getSubscriptionCapabilities(access)).toEqual(NOTHING);
  });

  it('gives nothing to someone without permissions', () => {
    expect(getSubscriptionCapabilities(accessWith())).toEqual(NOTHING);
  });

  it('gives nothing to someone who can only read the subscriptions', () => {
    expect(getSubscriptionCapabilities(accessWith('subscriptions:read'))).toEqual(NOTHING);
  });

  it('creates only with subscriptions:write', () => {
    expect(
      getSubscriptionCapabilities(accessWith('subscriptions:read', 'subscriptions:write')),
    ).toEqual({ ...NOTHING, canCreate: true });
  });

  it('edits and changes the status only with subscriptions:update', () => {
    expect(
      getSubscriptionCapabilities(accessWith('subscriptions:read', 'subscriptions:update')),
    ).toEqual({ ...NOTHING, canEdit: true, canChangeStatus: true });
  });

  it('deletes only with subscriptions:delete', () => {
    expect(
      getSubscriptionCapabilities(accessWith('subscriptions:read', 'subscriptions:delete')),
    ).toEqual({ ...NOTHING, canDelete: true });
  });

  it('does not count the permissions of other resources', () => {
    const access = accessWith(
      'subscriptions:read',
      'users:read',
      'users:write',
      'users:update',
      'users:delete',
      'tenants:read',
      'tenants:write',
      'tenants:update',
      'tenants:delete',
    );

    expect(getSubscriptionCapabilities(access)).toEqual(NOTHING);
  });

  it('gives everything to an administrator with all the permissions of subscriptions', () => {
    const access = accessWith(
      'subscriptions:read',
      'subscriptions:write',
      'subscriptions:update',
      'subscriptions:delete',
    );

    expect(getSubscriptionCapabilities(access)).toEqual({
      canCreate: true,
      canEdit: true,
      canChangeStatus: true,
      canDelete: true,
    });
  });
});
