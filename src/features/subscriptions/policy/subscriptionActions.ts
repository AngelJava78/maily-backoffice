import {
  CHANGEABLE_STATUS_IDS,
  SUBSCRIPTION_STATUS,
  type ChangeableStatusId,
} from '../schemas/subscriptionStatus';

/**
 * What the operator is allowed to do in the subscriptions section. `features/auth` decides it with
 * `can()` (the single place that knows the permissions, constitution V) and the application hands
 * the result to the screens; the subscriptions feature never reads permissions.
 */
export interface SubscriptionCapabilities {
  readonly canCreate: boolean;
  /** Change the name, the description, the price and what it includes. */
  readonly canEdit: boolean;
  readonly canChangeStatus: boolean;
  readonly canDelete: boolean;
}

/**
 * The statuses a subscription can be taken to: Activa, Inactiva and Bloqueada but the one it has,
 * in any direction and with clinics or without them. A status that is not known is still vigente,
 * so the three are offered.
 */
export function getStatusTargets(statusId: number): readonly ChangeableStatusId[] {
  return CHANGEABLE_STATUS_IDS.filter((target) => target !== statusId);
}

/** The statuses that are confirmed before they are applied. */
export type ConfirmedStatusId = Exclude<ChangeableStatusId, typeof SUBSCRIPTION_STATUS.ACTIVE>;

/** Inactivating and blocking are confirmed first; activating is applied directly. */
export function needsStatusConfirmation(targetId: number): targetId is ConfirmedStatusId {
  return targetId === SUBSCRIPTION_STATUS.INACTIVE || targetId === SUBSCRIPTION_STATUS.BLOCKED;
}

/** Whether "Eliminar" can be used, or why not: the clinics that have the subscription. */
export type DeleteAvailability =
  { readonly kind: 'allowed' } | { readonly kind: 'blocked'; readonly clinics: number };

/**
 * A subscription with clinics cannot be deleted, and the action says so. When the number is not
 * available the action is offered and the platform decides; it is never taken for a 0.
 */
export function getDeleteAvailability(clinicsCount: number | null): DeleteAvailability {
  return clinicsCount !== null && clinicsCount > 0
    ? { kind: 'blocked', clinics: clinicsCount }
    : { kind: 'allowed' };
}
