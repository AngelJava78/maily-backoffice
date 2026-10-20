import type { SubscriptionCapabilities } from '@/features/subscriptions';

/** Everything an operator with all the permissions of the subscriptions section can do. */
export const ALL_SUBSCRIPTION_CAPABILITIES: SubscriptionCapabilities = {
  canCreate: true,
  canEdit: true,
  canChangeStatus: true,
  canDelete: true,
};

/** What an operator who can only read the subscriptions can do. */
export const NO_SUBSCRIPTION_CAPABILITIES: SubscriptionCapabilities = {
  canCreate: false,
  canEdit: false,
  canChangeStatus: false,
  canDelete: false,
};

/** All the capabilities, except what is said otherwise. */
export function subscriptionCapabilities(
  overrides: Partial<SubscriptionCapabilities> = {},
): SubscriptionCapabilities {
  return { ...ALL_SUBSCRIPTION_CAPABILITIES, ...overrides };
}
