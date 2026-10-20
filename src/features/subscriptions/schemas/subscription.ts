import { z } from 'zod';

import { READ_PRICE_PATTERN } from './price';
import { SUBSCRIPTION_STATUS } from './subscriptionStatus';

/** The largest id of the API: a 32-bit integer (S2). */
export const MAX_SUBSCRIPTION_ID = 2_147_483_647;

const subscriptionStatusSchema = z.object({ id: z.number().int(), name: z.string() });

const dateTimeSchema = z.iso.datetime({ offset: true });

/**
 * A plan that MailySoft offers to the clinics. It parses the DTO of the subscriptions API
 * (snake_case) into the domain model (camelCase), so components never see the DTO (constitution
 * II). The number of clinics is `null` when the platform could not count them, and also when the
 * field is missing, because the published contract does not require it: it is never taken for 0.
 */
export const subscriptionSchema = z
  .object({
    id: z.number().int().min(1).max(MAX_SUBSCRIPTION_ID),
    name: z.string().min(1),
    description: z.string().nullable(),
    monthly_price: z.string().regex(READ_PRICE_PATTERN),
    features: z.array(z.string()),
    status: subscriptionStatusSchema,
    clinics_count: z.number().int().min(0).nullable().optional(),
    created_at: dateTimeSchema,
    updated_at: dateTimeSchema,
  })
  .transform((dto) => ({
    id: dto.id,
    name: dto.name,
    description: dto.description,
    monthlyPrice: dto.monthly_price,
    features: dto.features,
    status: dto.status,
    clinicsCount: dto.clinics_count ?? null,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }));

export type Subscription = z.output<typeof subscriptionSchema>;

/**
 * The whole catalog (S1), in the order of the API. A deleted subscription, which the API does not
 * return, would be dropped. One subscription out of contract fails the catalog: no partial data.
 */
export const subscriptionCatalogSchema = z
  .array(subscriptionSchema)
  .transform((items) => items.filter((item) => item.status.id !== SUBSCRIPTION_STATUS.DELETED));
