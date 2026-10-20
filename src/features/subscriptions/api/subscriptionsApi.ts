import { z } from 'zod';

import { ApiError } from '@/shared/api/ApiError';
import type { HttpClient } from '@/shared/api/httpClient';

import {
  subscriptionCatalogSchema,
  subscriptionSchema,
  type Subscription,
} from '../schemas/subscription';
import type { CreateSubscriptionBody, UpdateSubscriptionBody } from '../schemas/subscriptionForm';
import { SUBSCRIPTION_STATUS, type ChangeableStatusId } from '../schemas/subscriptionStatus';

/**
 * The operations of the subscriptions API (contracts/subscriptions-service.md, S1 to S6). The paths
 * of the API stay in this layer, so a change of contract does not reach the components.
 */
export const SUBSCRIPTIONS_PATH = '/api/v1/subscriptions';

interface Cancellable {
  readonly signal?: AbortSignal;
}

const detailPath = (subscriptionId: number): string => `${SUBSCRIPTIONS_PATH}/${subscriptionId}`;

/** S1: the whole catalog, without the deleted ones, in the order of the API (by creation). */
export function listSubscriptions(
  client: HttpClient,
  { signal }: Cancellable = {},
): Promise<Subscription[]> {
  return client.get(SUBSCRIPTIONS_PATH, { schema: subscriptionCatalogSchema, signal });
}

/**
 * S2: one subscription, whatever its status. A deleted one, which the API never returns, is taken
 * as one that does not exist, as the API itself would answer.
 */
export async function getSubscription(
  client: HttpClient,
  subscriptionId: number,
  { signal }: Cancellable = {},
): Promise<Subscription> {
  const subscription = await client.get(detailPath(subscriptionId), {
    schema: subscriptionSchema,
    signal,
  });
  if (subscription.status.id === SUBSCRIPTION_STATUS.DELETED) {
    throw ApiError.fromResponse(404, {
      code: 'subscription_not_found',
      message: `The subscription ${subscriptionId} is deleted`,
    });
  }
  return subscription;
}

/**
 * S3: creates a subscription, which is born active and without clinics. The body carries only what
 * can be written (FR-021); the API answers with the subscription as it was kept.
 */
export function createSubscription(
  client: HttpClient,
  body: CreateSubscriptionBody,
  { signal }: Cancellable = {},
): Promise<Subscription> {
  return client.request({
    path: SUBSCRIPTIONS_PATH,
    method: 'POST',
    body,
    schema: subscriptionSchema,
    signal,
  });
}

/**
 * S4: changes the data it receives, and only those: the edition of another person in other data is
 * kept, because the API has no control of conflicts (the last change of each datum wins).
 */
export function updateSubscription(
  client: HttpClient,
  subscriptionId: number,
  body: UpdateSubscriptionBody,
  { signal }: Cancellable = {},
): Promise<Subscription> {
  return client.request({
    path: detailPath(subscriptionId),
    method: 'PATCH',
    body,
    schema: subscriptionSchema,
    signal,
  });
}

/**
 * S5: takes a subscription to another status, in any direction and with clinics or without them.
 * Only the status travels; asking for the one it has is refused (`subscription_status_unchanged`).
 */
export function changeSubscriptionStatus(
  client: HttpClient,
  subscriptionId: number,
  statusId: ChangeableStatusId,
  { signal }: Cancellable = {},
): Promise<Subscription> {
  return client.request({
    path: `${detailPath(subscriptionId)}/status`,
    method: 'PATCH',
    body: { status_id: statusId },
    schema: subscriptionSchema,
    signal,
  });
}

/**
 * S6: deletes a subscription without clinics, which is not listed any more and frees its name.
 * There is no going back. The API refuses it when the subscription has clinics, or when it cannot
 * check them; in both cases nothing changes.
 */
export async function deleteSubscription(
  client: HttpClient,
  subscriptionId: number,
  { signal }: Cancellable = {},
): Promise<void> {
  // The client validates every answer, even an empty one: an empty body is read as `undefined`.
  await client.request({
    path: detailPath(subscriptionId),
    method: 'DELETE',
    schema: z.undefined(),
    signal,
  });
}
