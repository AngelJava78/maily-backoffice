/**
 * Ids of the subscription statuses of the subscriptions API. Decisions use the id, never the name,
 * which is a value of the catalog and can change (FR-016). The API never returns a deleted one.
 */
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 1,
  INACTIVE: 2,
  BLOCKED: 3,
  DELETED: 4,
} as const;

/** The statuses an operator can set, in the order in which they are offered (S5). */
export const CHANGEABLE_STATUS_IDS = [
  SUBSCRIPTION_STATUS.ACTIVE,
  SUBSCRIPTION_STATUS.INACTIVE,
  SUBSCRIPTION_STATUS.BLOCKED,
] as const;

export type ChangeableStatusId = (typeof CHANGEABLE_STATUS_IDS)[number];

/** Only Activa goes in the first group of the list; Inactiva, Bloqueada and any other go after it. */
export function isActiveSubscription(statusId: number): boolean {
  return statusId === SUBSCRIPTION_STATUS.ACTIVE;
}
