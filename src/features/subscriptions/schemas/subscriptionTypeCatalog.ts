/**
 * Who a subscription is for (FR-002), a catalog administered by hand on the platform (like the
 * status), with exactly two values today: identifiers are the stable value to key on, never the
 * name (research D1). A third value is a change of that catalog, not of this backoffice.
 */
export const SUBSCRIPTION_TYPE = { INDIVIDUAL: 1, ENTERPRISE: 2 } as const;

export const SUBSCRIPTION_TYPE_ORDER = [
  SUBSCRIPTION_TYPE.INDIVIDUAL,
  SUBSCRIPTION_TYPE.ENTERPRISE,
] as const;

export type SubscriptionTypeId = (typeof SUBSCRIPTION_TYPE_ORDER)[number];
