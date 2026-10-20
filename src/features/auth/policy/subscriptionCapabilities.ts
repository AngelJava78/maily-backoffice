import type { SubscriptionCapabilities } from '@/features/subscriptions';

import { can } from './permissions';

interface PermissionHolder {
  readonly permissions: ReadonlySet<string>;
}

/**
 * What the operator may do in the subscriptions section (feature 003, FR-013). Every decision goes
 * through `can()`, which already requires `subscriptions:read` before any other action on them.
 * Editing and changing the status share `subscriptions:update`.
 */
export function getSubscriptionCapabilities(access: PermissionHolder): SubscriptionCapabilities {
  const canUpdate = can(access, { resource: 'subscriptions', action: 'update' });
  return {
    canCreate: can(access, { resource: 'subscriptions', action: 'write' }),
    canEdit: canUpdate,
    canChangeStatus: canUpdate,
    canDelete: can(access, { resource: 'subscriptions', action: 'delete' }),
  };
}
